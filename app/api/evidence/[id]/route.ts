import { handle, identity, db, bucket, json, HttpError } from '@/lib/server';
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { return handle(async () => { const w = identity(req), { id } = await params; const e = await db().prepare('SELECT object_key,filename,mime FROM evidence WHERE id=? AND workspace=?').bind(id, w).first<{
    object_key: string | null;
    filename: string;
    mime: string;
}>(); if (!e?.object_key)
    throw new HttpError(404, 'Attachment not found.'); const file = await bucket().get(e.object_key); if (!file)
    throw new HttpError(404, 'Attachment unavailable.'); return new Response(file.body, { headers: { 'Content-Type': e.mime, 'Content-Disposition': `attachment; filename="${e.filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } }); }); }
