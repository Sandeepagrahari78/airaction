import { handle, identity, actor, writeGuard, body, transitionInput, transition, json } from '@/lib/server';
export async function PATCH(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { return handle(async () => { writeGuard(req); const w = identity(req); const { id } = await params; return json(await transition(w, actor(req), id, transitionInput.parse(await body(req)))); }); }
