export const SOURCES = ['Construction dust', 'Road dust', 'Waste burning', 'Transport', 'Industry & power', 'Crop residue', 'Household fuels', 'Diesel generators'] as const;
export const STATUSES = ['Received', 'Triaged', 'Approved', 'Assigned', 'In progress', 'Pending verification', 'Verified closed', 'Rejected'] as const;
export const ROLES = ['Coordinator', 'Field team', 'Verifier'] as const;
export type Role = typeof ROLES[number];
export type Status = typeof STATUSES[number];
export type Case = {
    id: string;
    title: string;
    description: string;
    source: string;
    location: string;
    district: string;
    priority: string;
    status: Status;
    owner: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    version: number;
    executor: string | null;
    resolution: string | null;
    reopened: number;
    lat: number | null;
    lng: number | null;
    sample: number;
};
export type Evidence = {
    id: string;
    case_id: string;
    note: string;
    filename: string | null;
    mime: string | null;
    size: number | null;
    checksum: string;
    actor: string;
    created_at: string;
    sample: number;
};
export type Audit = {
    id: string;
    case_id: string | null;
    actor: string;
    operation: string;
    detail: string;
    created_at: string;
};
export type Observation = {
    id: string;
    station: string;
    pollutant: string;
    value: number;
    unit: string;
    observed_at: string;
    provider: string;
    averaging: string;
    qc: string;
    sample: number;
    ingested_at: string;
};
export type Workspace = {
    cases: Case[];
    evidence: Evidence[];
    audit: Audit[];
    observations: Observation[];
    user: string;
    mode: 'demonstration';
    snapshotAt: string;
};
export const TEAMS = ['Dust response unit', 'Sanitation response unit', 'Transport inspection unit', 'Pollution inspection unit'];
export const PLAYBOOKS: Record<string, {
    team: string;
    actions: string[];
    proof: string;
}> = {
    'Construction dust': { team: TEAMS[0], actions: ['Inspect exposed stockpiles and vehicle exits', 'Arrange covering, wheel cleaning and containment', 'Reinspect the boundary after work'], proof: 'Before and after site records; inspector findings; follow-up observation.' },
    'Road dust': { team: TEAMS[0], actions: ['Inspect damaged surfaces and loose material', 'Assign collection or suitable mechanised sweeping', 'Confirm disposal and schedule recurrence check'], proof: 'Work log, route and receiving destination; follow-up inspection.' },
    'Waste burning': { team: TEAMS[1], actions: ['Locate burning and refer active fire to emergency services', 'Arrange segregated collection and safe disposal', 'Address repeated dumping at the location'], proof: 'Collection receipt, receiving destination and follow-up record.' },
    'Transport': { team: TEAMS[2], actions: ['Record idling or maintenance issue', 'Coordinate queue management and inspection', 'Record corrective action and repeat observation'], proof: 'Inspection result and comparable follow-up observation.' },
    'Industry & power': { team: TEAMS[3], actions: ['Refer the suspected event to the competent regulator', 'Request approved monitoring and operational records', 'Track authorised corrective measures'], proof: 'Regulator findings and validated facility records.' },
    'Crop residue': { team: TEAMS[3], actions: ['Confirm the field event with a local team', 'Coordinate machinery or residue collection availability', 'Record the receiving buyer or facility'], proof: 'Field verification, service delivery and receiving receipt.' },
    'Household fuels': { team: TEAMS[3], actions: ['Identify service or affordability gaps with consent', 'Refer to the appropriate clean-fuel programme', 'Check continued service access'], proof: 'Consented programme referral and follow-up service record.' },
    'Diesel generators': { team: TEAMS[3], actions: ['Check operating circumstances and power reliability', 'Refer compliance review to the competent authority', 'Coordinate a feasible cleaner-power alternative'], proof: 'Authorised inspection and operational records.' }
};
export function nextStatus(current: Status, op: string, role: Role, executor: string | null): Status {
    const rules: Record<string, {
        from: Status[];
        to: Status;
        role: Role;
    }> = {
        triage: { from: ['Received'], to: 'Triaged', role: 'Coordinator' }, approve: { from: ['Triaged'], to: 'Approved', role: 'Coordinator' }, assign: { from: ['Approved'], to: 'Assigned', role: 'Coordinator' }, start: { from: ['Assigned'], to: 'In progress', role: 'Field team' }, submit: { from: ['In progress'], to: 'Pending verification', role: 'Field team' }, verify: { from: ['Pending verification'], to: 'Verified closed', role: 'Verifier' }, return: { from: ['Pending verification'], to: 'In progress', role: 'Verifier' }, reopen: { from: ['Verified closed'], to: 'In progress', role: 'Verifier' }, reject: { from: ['Received', 'Triaged'], to: 'Rejected', role: 'Coordinator' }
    };
    const rule = rules[op];
    if (!rule || !rule.from.includes(current))
        throw new Error('This action is not available for the current case status.');
    if (role !== rule.role)
        throw new Error(`Switch to the ${rule.role} demo role for this action.`);
    if (['verify', 'return', 'reopen'].includes(op) && executor === role)
        throw new Error('The executor cannot verify their own work.');
    return rule.to;
}
export function isOverdue(c: Case, now = Date.now()) { return !!c.due_at && !['Verified closed', 'Rejected'].includes(c.status) && new Date(c.due_at).getTime() < now; }
