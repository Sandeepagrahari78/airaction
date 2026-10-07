import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { SOURCES, ROLES, TEAMS, nextStatus, type Case, type Role } from './domain';
export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function db() { if (!env.DB)
    throw new HttpError(503, 'The database is unavailable. Please retry.'); return env.DB; }
export function bucket() { if (!env.BUCKET)
    throw new HttpError(503, 'Evidence storage is unavailable. Please retry.'); return env.BUCKET; }
export function identity(req: Request) {
    const id = req.headers.get('oai-authenticated-user-id');
    if (id)
        return id;
    if (import.meta.env.DEV)
        return 'local-preview';
    throw new HttpError(401, 'Sign in with ChatGPT to open your workspace.');
}
export function actor(req: Request): Role { const r = req.headers.get('x-demo-role') || 'Coordinator'; if (!ROLES.includes(r as Role))
    throw new HttpError(400, 'Unknown demonstration role.'); return r as Role; }
export function writeGuard(req: Request) { const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, 'Cross-origin writes are blocked.'); if (req.headers.get('x-airaction-request') !== '1')
    throw new HttpError(403, 'Request verification missing.'); }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export async function handle(fn: () => Promise<Response>) { try {
    return await fn();
}
catch (e) {
    if (e instanceof z.ZodError)
        return json({ error: e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, 400);
    if (e instanceof HttpError)
        return json({ error: e.message }, e.status);
    console.error('AirAction request failed', e);
    return json({ error: 'Unable to complete this request. Your input has been kept; please retry.' }, 500);
} }
export async function readLimited(req: Request, max: number) {
    if (Number(req.headers.get('content-length') || 0) > max)
        throw new HttpError(413, 'Request is too large.');
    const reader = req.body?.getReader();
    if (!reader)
        return new Uint8Array();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > max) {
            await reader.cancel();
            throw new HttpError(413, 'Request is too large.');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}
export async function body(req: Request) { const bytes = await readLimited(req, 250000); try {
    return JSON.parse(new TextDecoder().decode(bytes));
}
catch {
    throw new HttpError(400, 'Invalid JSON request.');
} }
export async function getCase(workspace: string, id: string) { const c = await db().prepare('SELECT * FROM cases WHERE id=? AND workspace=?').bind(id, workspace).first<Case>(); if (!c)
    throw new HttpError(404, 'Case not found.'); return c; }
export function auditStmt(w: string, user: string, role: string, caseId: string | null, op: string, detail: string) { return db().prepare('INSERT INTO audit (id,workspace,case_id,actor,user,operation,detail,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), w, caseId, role, user, op, detail, new Date().toISOString()); }
export const caseInput = z.object({ id: z.string().uuid(), title: z.string().trim().min(6).max(160), description: z.string().trim().min(10).max(4000), source: z.enum(SOURCES), location: z.string().trim().min(3).max(180), district: z.string().trim().min(2).max(80), priority: z.enum(['Critical', 'High', 'Medium', 'Low']), lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional() });
export const transitionInput = z.object({ operation: z.string(), version: z.number().int().positive(), reason: z.string().trim().max(2000).default(''), owner: z.enum(TEAMS as [
        string,
        ...string[]
    ]).optional(), dueAt: z.string().datetime().optional() });
export async function transition(w: string, role: Role, id: string, input: z.infer<typeof transitionInput>) {
    const c = await getCase(w, id);
    if (c.version !== input.version)
        throw new HttpError(409, 'This case changed. Refresh it before saving.');
    let status;
    try {
        status = nextStatus(c.status, input.operation, role, c.executor);
    }
    catch (e) {
        throw new HttpError(403, (e as Error).message);
    }
    if (c.version !== input.version)
        throw new HttpError(409, 'This case changed. Refresh it before saving.');
    if (['approve', 'verify', 'return', 'reopen', 'reject', 'submit'].includes(input.operation) && input.reason.length < 10)
        throw new HttpError(400, 'Please give a reason or finding of at least 10 characters.');
    if (input.operation === 'assign' && (!input.owner || !input.dueAt || Date.parse(input.dueAt) <= Date.now()))
        throw new HttpError(400, 'Choose a responsible team and a future deadline.');
    if (input.operation === 'submit') {
        const proof = await db().prepare('SELECT id FROM evidence WHERE case_id=? AND workspace=? AND (?=0 OR created_at>=?) LIMIT 1').bind(id, w, c.reopened, c.updated_at).first();
        if (!proof)
            throw new HttpError(400, 'Add a new field record for this work cycle before requesting verification.');
    }
    const now = new Date().toISOString();
    const result = await db().batch([
        db().prepare('UPDATE cases SET status=?,owner=?,due_at=?,executor=?,resolution=?,reopened=?,updated_at=?,version=version+1 WHERE id=? AND workspace=? AND version=?').bind(status, input.operation === 'assign' ? input.owner : c.owner, input.operation === 'assign' ? input.dueAt : c.due_at, input.operation === 'start' ? role : c.executor, ['submit', 'verify', 'return', 'reopen', 'reject'].includes(input.operation) ? input.reason : c.resolution, c.reopened + (input.operation === 'reopen' || input.operation === 'return' ? 1 : 0), now, id, w, input.version),
        db().prepare('INSERT INTO audit (id,workspace,case_id,actor,user,operation,detail,created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(), w, id, role, w, input.operation, `${c.status} → ${status}. ${input.reason}${input.operation === 'assign' ? ` ${input.owner}; due ${input.dueAt}` : ''}`, now)
    ]);
    if (!result[0].meta.changes)
        throw new HttpError(409, 'This case changed. Refresh it before saving.');
    return getCase(w, id);
}
