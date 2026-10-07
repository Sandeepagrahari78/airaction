import { handle, identity, actor, writeGuard, db, bucket, getCase, HttpError, json, auditStmt, readLimited } from '@/lib/server';
export async function POST(req: Request) {
    return handle(async () => {
        writeGuard(req);
        const w = identity(req), role = actor(req);
        if (role !== 'Field team')
            throw new HttpError(403, 'Use the Field team demo role to add field evidence.');
        if (Number(req.headers.get('content-length') || 0) > 6 * 1024 * 1024)
            throw new HttpError(413, 'Maximum upload size is 5 MB.');
        if (!req.headers.get('content-type')?.startsWith('multipart/form-data'))
            throw new HttpError(400, 'Evidence must be a multipart form.');
        const bytesIn = await readLimited(req, 6 * 1024 * 1024);
        const form = await new Response(bytesIn, { headers: { 'content-type': req.headers.get('content-type')! } }).formData();
        const caseId = String(form.get('caseId') || ''), note = String(form.get('note') || '').trim(), id = String(form.get('id') || '');
        if (!/^[a-f0-9-]{36}$/.test(id) || note.length < 10 || note.length > 4000)
            throw new HttpError(400, 'Add a field finding between 10 and 4,000 characters.');
        const c = await getCase(w, caseId);
        if (!['Assigned', 'In progress'].includes(c.status))
            throw new HttpError(400, 'Evidence can be added during assigned or ongoing work.');
        if (await db().prepare('SELECT id FROM evidence WHERE id=? AND workspace=?').bind(id, w).first())
            return json({ id });
        const file = form.get('file');
        let key: string | null = null, filename: string | null = null, mime: string | null = null, size: number | null = null;
        let bytes: Uint8Array = new TextEncoder().encode(note);
        if (file instanceof File && file.size) {
            if (file.size > 5 * 1024 * 1024)
                throw new HttpError(413, 'Maximum upload size is 5 MB.');
            bytes = new Uint8Array(await file.arrayBuffer());
            const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71, jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
            if (!png && !jpg && !pdf)
                throw new HttpError(400, 'Upload a genuine PNG, JPEG or PDF file.');
            mime = png ? 'image/png' : jpg ? 'image/jpeg' : 'application/pdf';
            filename = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
            size = file.size;
            key = `evidence/${encodeURIComponent(w)}/${id}`;
            await bucket().put(key, bytes, { httpMetadata: { contentType: mime } });
        }
        const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer as ArrayBuffer))).map(b => b.toString(16).padStart(2, '0')).join('');
        try {
            await db().batch([db().prepare('INSERT INTO evidence (id,workspace,case_id,note,filename,mime,size,object_key,checksum,actor,created_at,sample) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)').bind(id, w, caseId, note, filename, mime, size, key, checksum, role, new Date().toISOString()), auditStmt(w, w, role, caseId, 'evidence_added', `${filename || 'Text field record'}; SHA-256 ${checksum}`)]);
        }
        catch (e) {
            if (key)
                await bucket().delete(key);
            throw e;
        }
        return json({ id }, 201);
    });
}
