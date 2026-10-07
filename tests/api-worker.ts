// Integration-test entry: the production route handlers run in a local Worker.
import { GET as workspace } from '../app/api/workspace/route';
import { POST as create } from '../app/api/cases/route';
import { PATCH as transition } from '../app/api/cases/[id]/route';
import { POST as evidence } from '../app/api/evidence/route';
import { GET as attachment } from '../app/api/evidence/[id]/route';
import { POST as observations } from '../app/api/observations/route';
import { GET as exportData } from '../app/api/export/route';
export default { async fetch(request: Request) {
        const p = new URL(request.url).pathname;
        if (p === '/api/workspace')
            return workspace(request);
        if (p === '/api/cases')
            return create(request);
        if (p.startsWith('/api/cases/'))
            return transition(request, { params: Promise.resolve({ id: decodeURIComponent(p.slice(11)) }) });
        if (p === '/api/evidence')
            return evidence(request);
        if (p.startsWith('/api/evidence/'))
            return attachment(request, { params: Promise.resolve({ id: decodeURIComponent(p.slice(14)) }) });
        if (p === '/api/observations')
            return observations(request);
        if (p === '/api/export')
            return exportData(request);
        return new Response('Not found', { status: 404 });
    } };
