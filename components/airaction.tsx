'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, ArrowUpRight, Check, CheckCheck, ChevronRight, ClipboardList, Clock3, Download, FileCheck2, FileText, Filter, Flame, HardHat, History, Layers3, Leaf, MapPin, Plus, RefreshCw, Search, ShieldCheck, Truck, Users, Wind, X, AlertTriangle, Upload, Building2, BarChart3, BookOpen, LockKeyhole } from 'lucide-react';
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import { SOURCES, STATUSES, ROLES, TEAMS, PLAYBOOKS, isOverdue, type Case, type Role, type Workspace, type Observation } from '@/lib/domain';
type View = 'overview' | 'cases' | 'actions' | 'verification' | 'monitoring' | 'playbooks' | 'impact' | 'audit';
const NAV = [{ id: 'overview', name: 'Overview', icon: Layers3 }, { id: 'cases', name: 'Incident registry', icon: ClipboardList }, { id: 'actions', name: 'Field operations', icon: Truck }, { id: 'verification', name: 'Verification', icon: ShieldCheck }, { id: 'monitoring', name: 'Air monitoring', icon: Activity }, { id: 'playbooks', name: 'Response playbooks', icon: BookOpen }, { id: 'impact', name: 'Impact & outcomes', icon: BarChart3 }, { id: 'audit', name: 'Audit trail', icon: History }] as const;
const date = (s: string) => new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const shortId = (id: string) => id.includes('demo-') ? 'AA-' + (1000 + Number(id.split('demo-')[1])) : 'AA-' + id.slice(0, 6).toUpperCase();
const tone = (s: string) => s === 'Critical' || s === 'Rejected' ? 'red' : s === 'High' || s === 'Pending verification' ? 'amber' : s === 'Verified closed' ? 'green' : s === 'In progress' || s === 'Assigned' ? 'blue' : 'neutral';
function Badge({ value }: {
    value: string;
}) { return <span className={`badge ${tone(value)}`}>{value}</span>; }
function Pick({ value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: readonly string[];
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="select-control" aria-label={label}><SelectValue /></SelectTrigger><SelectContent position="popper">{options.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>; }
function Empty({ title, detail }: {
    title: string;
    detail: string;
}) { return <div className="empty"><CheckCheck size={30}/><h3>{title}</h3><p>{detail}</p></div>; }
function Navigation({ view, navigate, pending }: {
    view: View;
    navigate: (v: View) => void;
    pending: number;
}) { const { setOpenMobile } = useSidebar(); return <Sidebar className="app-sidebar"><SidebarHeader className="brand"><div className="brandmark"><Wind size={26}/></div><div><strong>AirAction<span>INDIA</span></strong><small>Clean air. Accountable action.</small></div></SidebarHeader><div className="workspace-label"><div className="workspace-icon"><Building2 size={18}/></div><div><b>Delhi pilot workspace</b><small>Demonstration environment</small></div></div><SidebarContent><SidebarGroup><SidebarGroupLabel>OPERATIONS</SidebarGroupLabel><SidebarMenu>{NAV.slice(0, 4).map(n => <SidebarMenuItem key={n.id}><SidebarMenuButton isActive={view === n.id} onClick={() => { navigate(n.id); setOpenMobile(false); }} className="navitem"><n.icon /><span>{n.name}</span>{n.id === 'verification' && pending > 0 && <span className="nav-count">{pending}</span>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup><SidebarGroup><SidebarGroupLabel>INTELLIGENCE & ACCOUNTABILITY</SidebarGroupLabel><SidebarMenu>{NAV.slice(4).map(n => <SidebarMenuItem key={n.id}><SidebarMenuButton isActive={view === n.id} onClick={() => { navigate(n.id); setOpenMobile(false); }} className="navitem"><n.icon /><span>{n.name}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup></SidebarContent><SidebarFooter><div className="sidebar-note"><Leaf size={20}/><b>Every action needs evidence.</b><p>Close the loop from a reported problem to a verified response.</p></div><div className="private-label"><LockKeyhole size={13}/> Private workspace · v0.1</div></SidebarFooter></Sidebar>; }
export default function AirAction() {
    const [data, setData] = useState<Workspace | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [view, setView] = useState<View>('overview'), [role, setRole] = useState<Role>('Coordinator'), [selected, setSelected] = useState<string | null>(null), [createOpen, setCreateOpen] = useState(false), [initialSource, setInitialSource] = useState<string>(SOURCES[0]), [search, setSearch] = useState(''), [source, setSource] = useState('All sources'), [status, setStatus] = useState('All statuses'), [priorityOnly, setPriorityOnly] = useState(false), [importOpen, setImportOpen] = useState(false);
    const refresh = useCallback(async () => { try {
        const r = await fetch('/api/workspace');
        const x = await r.json() as Workspace & {
            error?: string;
        };
        if (!r.ok)
            throw new Error(x.error || 'Workspace unavailable');
        setData(x);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => { void refresh(); const sync = () => { const v = new URLSearchParams(location.search).get('view'); if (NAV.some(n => n.id === v))
        setView(v as View); }; sync(); addEventListener('popstate', sync); return () => removeEventListener('popstate', sync); }, [refresh]);
    const navigate = useCallback((v: View) => { setView(v); setSearch(''); setSource('All sources'); setStatus('All statuses'); setPriorityOnly(false); history.pushState({}, '', v === 'overview' ? '/' : `/?view=${v}`); }, []);
    async function mutate(url: string, method: string, body: unknown, isForm = false) { setBusy(true); try {
        const r = await fetch(url, { method, headers: { 'x-airaction-request': '1', 'x-demo-role': role, ...(!isForm ? { 'Content-Type': 'application/json' } : {}) }, body: isForm ? body as FormData : JSON.stringify(body) });
        const result = await r.json() as {
            id: string;
            inserted: number;
            submitted: number;
            error?: string;
        };
        if (!r.ok)
            throw new Error(result.error || 'Unable to save');
        await refresh();
        return result;
    }
    catch (e) {
        toast.error((e as Error).message);
        throw e;
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { const ctx = (document as unknown as {
        modelContext?: {
            registerTool: (t: unknown, o: unknown) => Promise<void>;
        };
    }).modelContext; if (!ctx?.registerTool)
        return; const lifecycle = new AbortController(); Promise.resolve(ctx.registerTool({ name: 'open_incident_registry', title: 'Open incident registry', description: 'Open the saved incident registry with an optional text filter. Does not create or edit records.', inputSchema: { type: 'object', properties: { search: { type: 'string', maxLength: 100 } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input: unknown) { const x = input as {
            search?: unknown;
        }; if (!x || typeof x !== 'object' || Object.keys(x).some(k => k !== 'search') || (x.search !== undefined && (typeof x.search !== 'string' || x.search.length > 100)))
            throw new Error('Provide an optional search string of up to 100 characters.'); navigate('cases'); setSearch((x.search as string) || ''); return { view: 'cases', search: x.search || '' }; } }, { signal: lifecycle.signal })).catch(() => { }); return () => lifecycle.abort(); }, [navigate]);
    const cases = data?.cases || [], pending = cases.filter(c => c.status === 'Pending verification'), active = cases.filter(c => !['Verified closed', 'Rejected'].includes(c.status)), overdue = active.filter(c => isOverdue(c)), closed = cases.filter(c => c.status === 'Verified closed'), current = cases.find(c => c.id === selected);
    const filtered = useMemo(() => cases.filter(c => (source === 'All sources' || c.source === source) && (status === 'All statuses' || c.status === status) && (!priorityOnly || isOverdue(c)) && `${c.title} ${c.location} ${c.district} ${shortId(c.id)}`.toLowerCase().includes(search.toLowerCase())), [cases, source, status, search, priorityOnly]);
    const queue = [...active].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || ['Critical', 'High', 'Medium', 'Low'].indexOf(a.priority) - ['Critical', 'High', 'Medium', 'Low'].indexOf(b.priority));
    function report(s: string = SOURCES[0]) { if (role !== 'Coordinator') {
        toast.info('Switch to the Coordinator demo role to register an incident.');
        return;
    } setInitialSource(s); setCreateOpen(true); }
    function CaseTable({ rows }: {
        rows: Case[];
    }) { return rows.length ? <Table><TableHeader><TableRow><TableHead>INCIDENT / LOCATION</TableHead><TableHead>SUSPECTED SOURCE</TableHead><TableHead>PRIORITY</TableHead><TableHead>STATUS</TableHead><TableHead>DUE · IST</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader><TableBody>{rows.map(c => <TableRow key={c.id}><TableCell><button className="case-link" onClick={() => setSelected(c.id)}><span className="record-id">{shortId(c.id)} {c.sample === 1 && <span>· Sample</span>}</span><strong>{c.title}</strong><small><MapPin size={12}/>{c.location}</small></button></TableCell><TableCell><span className="source-text">{c.source}</span></TableCell><TableCell><Badge value={c.priority}/></TableCell><TableCell><Badge value={c.status}/></TableCell><TableCell className={isOverdue(c) ? 'overdue' : 'due'}>{c.due_at ? <><span>{date(c.due_at)}</span>{isOverdue(c) && <small>Overdue</small>}</> : <span className="muted">Unassigned</span>}</TableCell><TableCell><button aria-label={`Open ${c.title}`} className="icon-button" onClick={() => setSelected(c.id)}><ChevronRight size={18}/></button></TableCell></TableRow>)}</TableBody></Table> : <Empty title="No incidents in this view" detail="Try another filter or register an incident."/>; }
    return <SidebarProvider><Navigation view={view} navigate={navigate} pending={pending.length}/><main className="main"><header className="topbar"><div className="breadcrumb"><SidebarTrigger /><span>Delhi pilot</span><ChevronRight size={14}/><b>{NAV.find(n => n.id === view)?.name}</b></div><div className="top-actions"><span className="role-label">Demo role</span><Pick value={role} onChange={v => setRole(v as Role)} options={ROLES} label="Demo role"/><div className="avatar" aria-hidden="true">AA</div></div></header><div className="demo-banner"><span className="demo-pill">DEMONSTRATION</span><span>Sample data and simulated roles. Changes are saved in your private workspace.</span><LockKeyhole size={14}/></div><div className="content"><div className="page-heading"><div><div className="eyebrow">AIR QUALITY OPERATIONS</div><h1>{({ overview: 'Delhi response room', cases: 'Incident registry', actions: 'Field operations', verification: 'Verification queue', monitoring: 'Air monitoring', playbooks: 'Response playbooks', impact: 'Impact & outcomes', audit: 'Audit trail' })[view]}</h1><p>{({ overview: 'A shared view of the work that makes cleaner air possible.', cases: 'One case, a clear owner and a traceable response.', actions: 'Coordinate teams and follow corrective work through to completion.', verification: 'Review the evidence. Confirm the outcome. Reopen when needed.', monitoring: 'Read concentrations with their source, timestamp and quality context.', playbooks: 'Turn a suspected source into a practical, approved response.', impact: 'Keep delivered work separate from measured environmental change.', audit: 'A persistent record of decisions, evidence and changes.' })[view]}</p></div><div className="heading-actions"><button className="button secondary icon-only" onClick={() => { setLoading(true); void refresh(); }} aria-label="Refresh workspace"><RefreshCw size={17} className={loading ? 'spin' : ''}/></button>{view === 'monitoring' ? <button className="button" onClick={() => setImportOpen(true)} disabled={role !== 'Coordinator'}><Upload size={17}/>Import observations</button> : <button className="button" onClick={() => report()} disabled={role !== 'Coordinator'}><Plus size={18}/>Report incident</button>}</div></div>
 {error ? <div className="error-state" role="alert"><AlertTriangle /><h2>Workspace unavailable</h2><p>{error}</p><button className="button" onClick={() => void refresh()}>Try again</button>{error.includes('Sign in') && <a className="button secondary" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in with ChatGPT</a>}</div> : loading && !data ? <div className="loading-grid">{[1, 2, 3, 4].map(n => <Skeleton className="h-32 w-full" key={n}/>)}<Skeleton className="h-80 col-span-full"/></div> : data && <>
 {view === 'overview' && <><div className="metric-grid"><Metric label="Active incidents" value={active.length} foot="Across all source categories" icon={ClipboardList}/><Metric label="Action overdue" value={overdue.length} foot="Needs coordinator attention" icon={Clock3} accent="orange"/><Metric label="Awaiting verification" value={pending.length} foot="Independent review required" icon={FileCheck2}/><Metric label="Verified closures" value={closed.length} foot="Operational outcomes, not air impact" icon={ShieldCheck} accent="green"/></div><div className="overview-grid"><section className="panel queue-panel"><div className="panel-heading"><div><div className="section-kicker">ACT FIRST</div><h2>Priority response queue</h2></div><button className="text-button" onClick={() => navigate('cases')}>View all incidents <ChevronRight size={16}/></button></div>{overdue.length > 0 && <button className="attention-strip" onClick={() => { navigate('cases'); setPriorityOnly(true); }}><span><Clock3 size={17}/><b>{overdue.length} {overdue.length === 1 ? 'action needs' : 'actions need'} follow-up</b><span>Past the assigned deadline</span></span><ChevronRight size={18}/></button>}<CaseTable rows={queue.slice(0, 5)}/></section><section className="panel source-panel"><div className="section-kicker">WHERE WORK IS NEEDED</div><h2>Reported sources</h2><p className="small-copy">Active cases by suspected source</p><div className="source-bars">{SOURCES.filter(s => active.some(c => c.source === s)).map((s, i) => { const n = active.filter(c => c.source === s).length; return <button key={s} onClick={() => { navigate('cases'); setSource(s); }}><div><span>{s}</span><b>{n}</b></div><div className="bar-track"><span style={{ width: `${n / Math.max(active.length, 1) * 100}%`, background: ['#176b57', '#79b5a1', '#dda34d', '#7d98b7', '#647875', '#a7b790'][i % 6] }}/></div></button>; })}</div><div className="source-foot"><ShieldCheck size={16}/><span>Case counts do not represent emissions shares.</span></div></section></div><div className="bottom-grid"><section className="panel station-panel"><div className="panel-heading"><div><div className="section-kicker">MONITORING SNAPSHOT</div><h2>PM2.5 concentrations</h2></div><button className="text-button" onClick={() => navigate('monitoring')}>Explore readings <ChevronRight size={16}/></button></div><div className="station-mini-grid">{latestStations(data.observations.filter(o => o.sample === 1)).slice(0, 4).map(o => <div key={o.station}><small>{o.station}</small><b>{o.value}<span> µg/m³</span></b><span className="sample-meta">Sample · {o.averaging} mean</span></div>)}</div><p className="panel-note">Synthetic readings • No live government feed connected</p></section><section className="workflow-card"><div className="section-kicker">THE AIRACTION LOOP</div><h2>Follow through.<br />Then verify.</h2><p>Reporting starts the response. Evidence and independent review complete it.</p><div className="loop-steps"><span>Report</span><ChevronRight /><span>Act</span><ChevronRight /><span>Verify</span></div></section></div></>}
 {view === 'cases' && <section className="panel"><div className="filterbar"><div className="search-input"><Search size={18}/><input aria-label="Search incidents" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, incident or location…"/></div><Pick value={source} onChange={setSource} options={['All sources', ...SOURCES]} label="Filter by source"/><Pick value={status} onChange={setStatus} options={['All statuses', ...STATUSES]} label="Filter by status"/><button className={`button secondary ${priorityOnly ? 'selected' : ''}`} onClick={() => setPriorityOnly(!priorityOnly)}><Clock3 size={16}/>Overdue</button></div><div className="table-caption">{filtered.length} incidents <button className="text-button" onClick={() => { setSource('All sources'); setStatus('All statuses'); setSearch(''); setPriorityOnly(false); }}>Clear filters</button></div><CaseTable rows={filtered}/></section>}
 {view === 'actions' && <><div className="team-grid">{TEAMS.map((team, i) => { const assigned = active.filter(c => c.owner === team); return <div className="panel team-card" key={team}><div className="team-icon">{i === 1 ? <Truck /> : <HardHat />}</div><h3>{team}</h3><b>{assigned.length}<span> active assignments</span></b><small>{assigned.filter(c => isOverdue(c)).length} overdue · capacity not configured</small></div>; })}</div><div className="kanban">{['Approved', 'Assigned', 'In progress', 'Pending verification'].map(s => <section className="kanban-column" key={s}><h2>{s}<span>{cases.filter(c => c.status === s).length}</span></h2>{cases.filter(c => c.status === s).map(c => <button className="task-card" key={c.id} onClick={() => setSelected(c.id)}><div><span className="record-id">{shortId(c.id)}</span><Badge value={c.priority}/></div><h3>{c.title}</h3><p><MapPin size={13}/>{c.location}</p><div className="task-foot"><span>{c.owner || 'Awaiting assignment'}</span>{c.due_at && <small className={isOverdue(c) ? 'overdue' : ''}>{date(c.due_at)}</small>}</div></button>)}{!cases.some(c => c.status === s) && <p className="column-empty">No cases at this stage</p>}</section>)}</div></>}
 {view === 'verification' && <><div className="info-strip"><ShieldCheck size={20}/><p><b>Independent review is part of the workflow.</b> Switch to the Verifier demo role to accept evidence, return work or reopen a closed case. Role separation here is simulated for product testing.</p></div><section className="panel"><div className="panel-heading"><h2>Ready for review <span className="count">{pending.length}</span></h2></div><CaseTable rows={pending}/></section><section className="panel mt"><div className="panel-heading"><h2>Verified cases</h2><small>Open a case to inspect or reopen it</small></div><CaseTable rows={closed}/></section></>}
 {view === 'monitoring' && <Monitoring observations={data.observations} onImport={() => setImportOpen(true)} role={role}/>}
 {view === 'playbooks' && <><div className="info-strip"><BookOpen size={20}/><p>Draft operational guidance · version 0.1. Every action requires officer approval. These playbooks are not regulatory orders or automated enforcement.</p></div><div className="playbook-grid">{SOURCES.map((s, i) => <section className="panel playbook" key={s}><div className="playbook-top"><span className="playbook-number">0{i + 1}</span><span className="badge neutral">DRAFT v0.1</span></div><h2>{s}</h2><small>{PLAYBOOKS[s].team}</small><ol>{PLAYBOOKS[s].actions.map(a => <li key={a}>{a}</li>)}</ol><div className="proof"><FileCheck2 size={17}/><p>{PLAYBOOKS[s].proof}</p></div><button className="button secondary" onClick={() => report(s)} disabled={role !== 'Coordinator'}><Plus size={16}/>Register a {s.toLowerCase()} case</button></section>)}</div></>}
 {view === 'impact' && <><div className="metric-grid"><Metric label="Cases registered" value={cases.length} foot={`${cases.filter(c => c.sample === 0).length} user-created · ${cases.filter(c => c.sample === 1).length} sample`} icon={ClipboardList}/><Metric label="Verified closed" value={closed.length} foot="Includes sample workflow outcomes" icon={ShieldCheck}/><Metric label="Rework / reopening" value={cases.reduce((n, c) => n + c.reopened, 0)} foot="Recorded verification returns and reopens" icon={RefreshCw}/><Metric label="Evidence records" value={data.evidence.length} foot={`${data.evidence.filter(e => e.sample === 0).length} added in this workspace`} icon={FileText}/></div><div className="impact-grid"><section className="panel impact-panel"><div className="section-kicker">DELIVERY ACCOUNTABILITY</div><h2>Workflow completion</h2><div className="big-percent">{cases.length ? Math.round(closed.length / cases.length * 100) : 0}<span>%</span></div><Progress value={cases.length ? closed.length / cases.length * 100 : 0}/><p>{closed.length} of {cases.length} cases are verified closed. Rejected and unresolved cases remain in the denominator.</p><a href="/api/export" className="button secondary"><Download size={17}/>Export workspace evidence</a></section><section className="panel impact-panel"><div className="section-kicker">ENVIRONMENTAL EVALUATION</div><h2>Ambient impact is not yet established</h2><p>Closing an incident does not prove a reduction in city-wide PM2.5 or avoided deaths.</p><ul className="evaluation-list"><li><Check size={17}/>Record actions, dates and evidence</li><li><Clock3 size={17}/>Establish treatment and comparison areas</li><li><Clock3 size={17}/>Collect comparable baseline and follow-up data</li><li><Clock3 size={17}/>Adjust for weather, season and other interventions</li><li><Clock3 size={17}/>Have an independent evaluator review the result</li></ul><div className="notice">No emissions reduction, lives saved or ambient improvement is claimed by this workspace.</div></section></div></>}
 {view === 'audit' && <section className="panel"><div className="panel-heading"><div><h2>Activity ledger</h2><p className="small-copy">Most recent 500 events · times shown in IST</p></div><a href="/api/export" className="button secondary"><Download size={16}/>Export all records</a></div><Table><TableHeader><TableRow><TableHead>TIME</TableHead><TableHead>ACTOR / ROLE</TableHead><TableHead>EVENT</TableHead><TableHead>DETAIL</TableHead></TableRow></TableHeader><TableBody>{data.audit.map(a => <TableRow key={a.id}><TableCell className="nowrap">{date(a.created_at)}</TableCell><TableCell>{a.actor}<small className="cell-meta">{a.actor === 'System' ? 'Sample initialization' : 'Simulated role'}</small></TableCell><TableCell><span className="badge neutral">{a.operation.replaceAll('_', ' ')}</span>{a.case_id && <button className="ledger-link" onClick={() => setSelected(a.case_id)}>{shortId(a.case_id)}</button>}</TableCell><TableCell className="audit-detail">{a.detail}</TableCell></TableRow>)}</TableBody></Table></section>}
 <footer className="page-footer"><span><LockKeyhole size={12}/> Private demonstration · {data.user}</span><span>All times IST · Source attribution requires validation</span></footer>
 </>}</div></main>
 <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="report-modal"><DialogTitle>Report a pollution incident</DialogTitle><DialogDescription>Create a traceable case. The source remains a hypothesis until inspected.</DialogDescription><ReportForm initialSource={initialSource} busy={busy} existing={cases} onSubmit={async (x) => { const result = await mutate('/api/cases', 'POST', x); setCreateOpen(false); setSelected(result.id); toast.success('Incident registered'); }}/></DialogContent></Dialog>
 <Sheet open={!!current} onOpenChange={open => { if (!open)
        setSelected(null); }}><SheetContent className="case-sheet">{current && data && <CaseDetail key={current.id} c={current} data={data} role={role} busy={busy} setRole={setRole} mutate={mutate}/>}</SheetContent></Sheet>
 <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="report-modal"><DialogTitle>Import monitoring observations</DialogTitle><DialogDescription>CSV imports remain unverified. Include the provider and averaging period; do not enter AQI values as concentrations.</DialogDescription><ImportForm busy={busy} onSubmit={async (rows) => { const r = await mutate('/api/observations', 'POST', { rows }); toast.success(`${r.inserted} observations imported; ${r.submitted - r.inserted} duplicates skipped.`); setImportOpen(false); }}/></DialogContent></Dialog><Toaster richColors position="bottom-right"/></SidebarProvider>;
}
function Metric({ label, value, foot, icon: Icon, accent = '' }: {
    label: string;
    value: number;
    foot: string;
    icon: typeof Activity;
    accent?: string;
}) { return <div className={`metric ${accent}`}><div><span>{label}</span><Icon size={18}/></div><b>{value.toString().padStart(2, '0')}</b><small>{foot}</small></div>; }
function ReportForm({ initialSource, busy, existing, onSubmit }: {
    initialSource: string;
    busy: boolean;
    existing: Case[];
    onSubmit: (x: unknown) => Promise<void>;
}) {
    const [id] = useState(() => crypto.randomUUID()), [source, setSource] = useState(initialSource), [priority, setPriority] = useState('High'), [district, setDistrict] = useState('East Delhi'), [location, setLocation] = useState('');
    const possible = location.trim().length > 5 ? existing.filter(c => !['Verified closed', 'Rejected'].includes(c.status) && c.source === source && c.location.toLowerCase().includes(location.toLowerCase())) : [];
    async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); try {
        await onSubmit({ id, title: f.get('title'), description: f.get('description'), location, source, priority, district, lat: f.get('lat') ? Number(f.get('lat')) : null, lng: f.get('lng') ? Number(f.get('lng')) : null });
    }
    catch { } }
    return <form className="form" onSubmit={submit}><label>Incident title<input name="title" required minLength={6} maxLength={160} placeholder="e.g. Uncovered debris at a construction site"/></label><div className="form-grid"><label>Suspected source<Pick value={source} onChange={setSource} options={SOURCES} label="Suspected source"/></label><label>Priority<Pick value={priority} onChange={setPriority} options={['Critical', 'High', 'Medium', 'Low']} label="Priority"/></label></div><label>Location<input required minLength={3} maxLength={180} value={location} onChange={e => setLocation(e.target.value)} placeholder="Locality, road and nearby landmark"/></label>{possible.length > 0 && <div className="notice">{possible.length} potentially related open case(s) at this location. Check for duplication before submitting.</div>}<label>District<Pick value={district} onChange={setDistrict} options={['East Delhi', 'West Delhi', 'North Delhi', 'South Delhi', 'Central Delhi', 'New Delhi', 'North East Delhi', 'North West Delhi', 'South East Delhi', 'South West Delhi', 'Shahdara']} label="District"/></label><label>What was observed?<textarea required name="description" minLength={10} maxLength={4000} rows={3} placeholder="Describe what happened and when. Avoid including personal information."/></label><div className="form-grid"><label>Latitude <small>(optional)</small><input name="lat" type="number" step="any" min="-90" max="90" placeholder="28.6139"/></label><label>Longitude <small>(optional)</small><input name="lng" type="number" step="any" min="-180" max="180" placeholder="77.2090"/></label></div><button className="button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Register incident'}</button></form>;
}
function CaseDetail({ c, data, role, busy, setRole, mutate }: {
    c: Case;
    data: Workspace;
    role: Role;
    busy: boolean;
    setRole: (v: Role) => void;
    mutate: (url: string, method: string, body: unknown, isForm?: boolean) => Promise<any>;
}) {
    const [reason, setReason] = useState(''), [owner, setOwner] = useState(PLAYBOOKS[c.source]?.team || TEAMS[0]), [due, setDue] = useState(''), [note, setNote] = useState(''), [file, setFile] = useState<File | null>(null), [evidenceId, setEvidenceId] = useState(() => crypto.randomUUID());
    const proof = data.evidence.filter(e => e.case_id === c.id), events = data.audit.filter(a => a.case_id === c.id), pb = PLAYBOOKS[c.source];
    const action = ({ Received: ['triage', 'Triage case', 'Coordinator'], Triaged: ['approve', 'Approve response', 'Coordinator'], Approved: ['assign', 'Assign field team', 'Coordinator'], Assigned: ['start', 'Start field work', 'Field team'], 'In progress': ['submit', 'Request verification', 'Field team'], 'Pending verification': ['verify', 'Verify and close', 'Verifier'], 'Verified closed': ['reopen', 'Reopen case', 'Verifier'] } as Record<string, string[]>)[c.status];
    async function change(op: string) { try {
        await mutate(`/api/cases/${encodeURIComponent(c.id)}`, 'PATCH', { operation: op, version: c.version, reason, owner, dueAt: due ? new Date(due).toISOString() : undefined });
        setReason('');
        toast.success(op === 'return' ? 'Returned for further work' : 'Case updated');
    }
    catch { } }
    async function addEvidence(e: FormEvent) { e.preventDefault(); const f = new FormData(); f.set('id', evidenceId); f.set('caseId', c.id); f.set('note', note); if (file)
        f.set('file', file); try {
        await mutate('/api/evidence', 'POST', f, true);
        setNote('');
        setFile(null);
        setEvidenceId(crypto.randomUUID());
        toast.success('Field record saved');
    }
    catch { } }
    return <><div className="detail-header"><span className="record-id">{shortId(c.id)} · {c.sample ? 'Sample case' : 'Workspace case'}</span><SheetTitle>{c.title}</SheetTitle><SheetDescription><MapPin size={14}/>{c.location} · {c.district}</SheetDescription><div className="detail-badges"><Badge value={c.priority}/><Badge value={c.status}/></div></div><div className="detail-body"><section><h3>Reported observation</h3><p>{c.description}</p><div className="detail-facts"><div><small>Suspected source</small><b>{c.source}</b></div><div><small>Responsible team</small><b>{c.owner || 'Not assigned'}</b></div><div><small>Deadline · IST</small><b className={isOverdue(c) ? 'overdue' : ''}>{c.due_at ? date(c.due_at) : 'Not assigned'}</b></div><div><small>Registered · IST</small><b>{date(c.created_at)}</b></div></div>{c.lat !== null && c.lng !== null && <p className="small-copy">Coordinates: {c.lat}, {c.lng}</p>}</section>
 {action && <section className="action-box"><div className="section-kicker">NEXT WORKFLOW STEP</div><h3>{action[1]}</h3><p className="small-copy">Current demo role: <b>{role}</b></p>{role !== action[2] ? <><p className="small-copy">This step belongs to the {action[2]} role.</p><button className="button secondary" onClick={() => setRole(action[2] as Role)}>Try {action[2]} role</button></> : <><div className="form">{c.status === 'Approved' && <><label>Responsible team<Pick value={owner} onChange={setOwner} options={TEAMS} label="Responsible team"/></label><label>Deadline <small>(your device’s local time)</small><input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} required/></label></>}{!['Received', 'Assigned'].includes(c.status) && <label>{c.status === 'Pending verification' ? 'Independent findings and decision' : c.status === 'In progress' ? 'Work completed and follow-up needed' : 'Decision / reason'}<textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Record the basis for this decision…" maxLength={2000}/></label>}<div className="action-buttons"><button className="button" disabled={busy} onClick={() => void change(action[0])}>{busy ? 'Saving…' : action[1]}</button>{c.status === 'Pending verification' && <button className="button secondary" disabled={busy} onClick={() => void change('return')}>Return for rework</button>}</div>{['Received', 'Triaged'].includes(c.status) && <>{c.status === 'Received' && <label>Reason for rejection <small>(only if rejecting)</small><textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={2000}/></label>}<button className="text-button danger" disabled={busy} onClick={() => void change('reject')}>Reject report with reason</button></>}</div></>}</section>}
 {c.resolution && <section><h3>Latest finding</h3><p>{c.resolution}</p></section>}
 <section><div className="detail-section-title"><h3>Field evidence</h3><span className="count">{proof.length}</span></div>{proof.map(e => <div className="evidence-card" key={e.id}><div><FileText size={17}/><b>{e.filename || 'Field record'}</b>{e.sample === 1 && <span className="badge neutral">Sample</span>}</div><p>{e.note}</p>{e.filename && <a className="text-button" href={`/api/evidence/${encodeURIComponent(e.id)}`}><Download size={14}/>Download attachment</a>}<small>{e.actor} · {date(e.created_at)}</small>{!e.sample && <details><summary>File / record checksum</summary><code>{e.checksum}</code></details>}</div>)}{proof.length === 0 && <p className="small-copy">No field record has been submitted.</p>}{['Assigned', 'In progress'].includes(c.status) && role === 'Field team' && <form className="form evidence-form" onSubmit={addEvidence}><label>Field finding<textarea value={note} onChange={e => setNote(e.target.value)} required minLength={10} maxLength={4000} rows={3} placeholder="What was done, where material went, and what remains?"/></label><label>Attachment <small>(optional, JPEG / PNG / PDF, up to 5 MB)</small><input key={evidenceId} type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)}/></label><button className="button secondary" disabled={busy}><Upload size={16}/>Save field record</button></form>}</section>
 {pb && <section><h3>Suggested response · draft v0.1</h3><ol className="playbook-steps">{pb.actions.map(a => <li key={a}>{a}</li>)}</ol><p className="small-copy"><b>Verification needs:</b> {pb.proof}</p></section>}
 <section><h3>Case history</h3><div className="timeline">{events.map(e => <div key={e.id}><span className="timeline-dot"/><b>{e.operation.replaceAll('_', ' ')}</b><p>{e.detail}</p><small>{e.actor} · {date(e.created_at)}</small></div>)}</div></section></div></>;
}
function latestStations(rows: Observation[]) { const seen = new Set<string>(); return [...rows].sort((a, b) => b.observed_at.localeCompare(a.observed_at)).filter(o => { if (seen.has(o.station))
    return false; seen.add(o.station); return true; }); }
function Monitoring({ observations, onImport, role }: {
    observations: Observation[];
    onImport: () => void;
    role: Role;
}) {
    const [set, setSet] = useState('Sample readings'), [pollutant, setPollutant] = useState('PM2.5');
    const rows = observations.filter(o => o.sample === (set === 'Sample readings' ? 1 : 0) && o.pollutant === pollutant), stations = latestStations(rows);
    return <><div className="monitor-controls"><Pick value={set} onChange={setSet} options={['Sample readings', 'Imported readings']} label="Dataset"/><Pick value={pollutant} onChange={setPollutant} options={['PM2.5', 'PM10', 'NO2', 'O3', 'SO2']} label="Pollutant"/><span>Concentration in µg/m³ · no AQI conversion</span></div>{rows.length ? <><div className="station-cards">{stations.map(o => <div className="panel reading-card" key={o.station}><div><b>{o.station}</b><Wind size={18}/></div><strong>{o.value}<span> µg/m³</span></strong><small>{o.averaging} mean · {date(o.observed_at)} IST</small><div className="reading-meta"><span>{o.sample ? 'Synthetic' : 'Unverified import'}</span><span>{Date.now() - Date.parse(o.observed_at) > 7200000 ? 'Older than 2h' : 'Within 2h'}</span></div></div>)}</div><section className="panel chart-panel"><div className="panel-heading"><div><h2>{pollutant} observations</h2><p className="small-copy">{set} · timestamps shown in IST · lines connect available observations</p></div></div><TrendChart rows={rows}/></section><section className="panel mt"><div className="panel-heading"><h2>Observation register</h2><small>{rows.length} records</small></div><Table><TableHeader><TableRow><TableHead>STATION</TableHead><TableHead>VALUE</TableHead><TableHead>OBSERVED · IST</TableHead><TableHead>AVERAGING</TableHead><TableHead>PROVIDER</TableHead><TableHead>QUALITY</TableHead></TableRow></TableHeader><TableBody>{rows.map(o => <TableRow key={o.id}><TableCell>{o.station}</TableCell><TableCell><b>{o.value}</b> {o.unit}</TableCell><TableCell>{date(o.observed_at)}</TableCell><TableCell>{o.averaging}</TableCell><TableCell>{o.provider}</TableCell><TableCell><Badge value={o.qc}/></TableCell></TableRow>)}</TableBody></Table></section></> : <section className="panel"><Empty title="No observations in this dataset" detail="Import records with station, pollutant, concentration, timestamp, provider and averaging period."/><div className="empty-action"><button className="button secondary" onClick={onImport} disabled={role !== 'Coordinator'}><Upload size={16}/>Import CSV</button></div></section>}<div className="notice mt">Missing readings are not treated as zero. Imported records are not validated regulatory measurements. The application does not infer source contributions from concentration data.</div></>;
}
function TrendChart({ rows }: {
    rows: Observation[];
}) {
    const names = [...new Set(rows.map(o => o.station))].slice(0, 6), times = rows.map(o => Date.parse(o.observed_at)), min = Math.min(...times), max = Math.max(...times), peak = Math.max(...rows.map(o => o.value), 1) * 1.15, colors = ['#176b57', '#df9733', '#667fc0', '#a67b96', '#569ca0', '#838369'];
    return <><div className="chart-scroll"><svg viewBox="0 0 1000 245" role="img" aria-label="Concentration observations by station over time"><title>Concentration observations; exact values are in the table below</title>{[0, .25, .5, .75, 1].map(v => <g key={v}><line x1="50" x2="970" y1={205 - v * 175} y2={205 - v * 175} stroke="#e5eae8" strokeDasharray="4 5"/><text x="38" y={210 - v * 175} textAnchor="end" fill="#728078" fontSize="13">{Math.round(peak * v)}</text></g>)}{names.map((name, i) => { const points = rows.filter(o => o.station === name).sort((a, b) => a.observed_at.localeCompare(b.observed_at)).map(o => ({ x: 50 + (Date.parse(o.observed_at) - min) / (max - min || 1) * 920, y: 205 - o.value / peak * 175 })); return <g key={name}><polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2.5"/>{points.map((p, j) => <circle key={j} cx={p.x} cy={p.y} r="3.5" fill={colors[i]}/>)}</g>; })}<text x="50" y="237" fontSize="13" fill="#728078">{date(new Date(min).toISOString())}</text><text x="970" y="237" textAnchor="end" fontSize="13" fill="#728078">{date(new Date(max).toISOString())}</text></svg></div><div className="legend">{names.map((n, i) => <span key={n}><i style={{ background: colors[i] }}/>{n}</span>)}</div>{new Set(rows.map(o => o.station)).size > 6 && <p className="small-copy">Chart shows the first six stations. All records remain in the table.</p>}</>;
}
function parseCSV(text: string) { const rows: string[][] = []; let row: string[] = [], cell = '', quote = false; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
        if (quote && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else
            quote = !quote;
    }
    else if (c === ',' && !quote) {
        row.push(cell);
        cell = '';
    }
    else if ((c === '\n' || c === '\r') && !quote) {
        if (c === '\r' && text[i + 1] === '\n')
            i++;
        row.push(cell);
        if (row.some(x => x.trim()))
            rows.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} if (quote)
    throw new Error('CSV contains an unclosed quote.'); row.push(cell); if (row.some(x => x.trim()))
    rows.push(row); return rows; }
function ImportForm({ busy, onSubmit }: {
    busy: boolean;
    onSubmit: (rows: unknown[]) => Promise<void>;
}) { const [text, setText] = useState(''), [error, setError] = useState(''); const example = 'station,pollutant,value,unit,observed_at,provider,averaging\nExample station,PM2.5,42,µg/m³,2026-10-01T06:00:00Z,Your data provider,1 hour'; async function submit(e: FormEvent) { e.preventDefault(); setError(''); try {
    const parsed = parseCSV(text.trim()), headers = parsed.shift()!.map(h => h.trim().replace(/^\uFEFF/, '')), needed = ['station', 'pollutant', 'value', 'unit', 'observed_at', 'provider', 'averaging'];
    if (needed.some(k => !headers.includes(k)))
        throw new Error('Include every required CSV column shown in the template.');
    if (parsed.length < 1 || parsed.length > 200)
        throw new Error('Import between 1 and 200 rows at a time.');
    const rows = parsed.map((r, i) => { if (r.length !== headers.length)
        throw new Error(`Row ${i + 2} has an unexpected number of columns.`); const x = Object.fromEntries(headers.map((k, j) => [k, r[j].trim()])); if (!x.value || !Number.isFinite(Number(x.value)))
        throw new Error(`Row ${i + 2} has no valid concentration.`); return { ...x, value: Number(x.value) }; });
    await onSubmit(rows);
}
catch (e) {
    setError((e as Error).message);
} } return <form className="form" onSubmit={submit}><label>CSV file<input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) {
    if (f.size > 200000) {
        setError('Keep CSV files below 200 KB.');
        return;
    }
    setText(await f.text());
} }}/></label><label>CSV contents<textarea className="csv-input" required value={text} onChange={e => setText(e.target.value)} rows={8} placeholder={example}/></label><details><summary>Required columns and example</summary><pre className="csv-example">{example}</pre><p className="small-copy">Use ISO 8601 UTC timestamps, concentrations in µg/m³, and PM2.5, PM10, NO2, O3 or SO2. Do not import the example as a real observation.</p></details>{error && <p role="alert" className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Importing…' : 'Validate and import'}</button></form>; }
