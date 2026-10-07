import { db } from './server';
export async function initialize(w: string) {
    if (await db().prepare('SELECT id FROM workspaces WHERE id=?').bind(w).first())
        return;
    const now = Date.now(), iso = (hours: number) => new Date(now + hours * 3600000).toISOString();
    const examples = [
        ['Uncovered material at metro works', 'Construction dust', 'Anand Vihar · service road', 'East Delhi', 'Critical', 'In progress', 'Dust response unit', -2, 'Material stockpiles and vehicle exits require containment. Source is a demonstration hypothesis.'],
        ['Repeated waste burning near collection point', 'Waste burning', 'Ghazipur · collection point', 'East Delhi', 'High', 'Pending verification', 'Sanitation response unit', 4, 'Collection team reports material removed. Independent follow-up is required.'],
        ['Loose road material on freight corridor', 'Road dust', 'Punjabi Bagh · Ring Road', 'West Delhi', 'High', 'Assigned', 'Dust response unit', 6, 'Road edge material may be resuspended by traffic; inspect and arrange collection.'],
        ['Heavy vehicle idling at loading bay', 'Transport', 'Okhla · Phase II', 'South Delhi', 'Medium', 'Received', null, null, 'A resident report describes repeated idling at the loading queue.'],
        ['Visible plume reported near industrial cluster', 'Industry & power', 'Wazirpur · industrial area', 'North Delhi', 'High', 'Triaged', null, null, 'A visual report needs regulator inspection; pollutant or source attribution is not confirmed.'],
        ['Generator operation near residential block', 'Diesel generators', 'Rohini · Sector 11', 'North Delhi', 'Medium', 'Approved', null, null, 'Check operating circumstances and service reliability before selecting an alternative.'],
        ['Roadside waste collection follow-up', 'Waste burning', 'Dwarka · Sector 8', 'West Delhi', 'Medium', 'Verified closed', 'Sanitation response unit', -12, 'Demonstration case with a follow-up field record confirming collection.'],
        ['Dust containment at building site', 'Construction dust', 'Saket · site boundary', 'South Delhi', 'High', 'Verified closed', 'Dust response unit', -8, 'Demonstration inspection confirms the corrective work; no ambient impact claim.'],
    ];
    const stmts = [db().prepare('INSERT OR IGNORE INTO workspaces (id,created_at) VALUES (?,?)').bind(w, iso(0))];
    for (let i = 0; i < examples.length; i++) {
        const [title, source, location, district, priority, status, owner, due, description] = examples[i];
        const id = `${w}:demo-${i + 1}`;
        stmts.push(db().prepare('INSERT OR IGNORE INTO cases (id,workspace,title,description,source,location,district,priority,status,owner,due_at,created_at,updated_at,version,executor,resolution,reopened,lat,lng,sample) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,0,NULL,NULL,1)').bind(id, w, title, description, source, location, district, priority, status, owner, due === null ? null : iso(due as number), iso(-36 + i), iso(-i / 2), ['In progress', 'Pending verification', 'Verified closed'].includes(status as string) ? 'Field team' : null, status === 'Verified closed' ? 'Demonstration follow-up accepted.' : null));
        stmts.push(db().prepare('INSERT OR IGNORE INTO audit (id,workspace,case_id,actor,user,operation,detail,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(`${id}:seed`, w, id, 'System', w, 'sample_created', 'Illustrative case loaded at its example workflow stage.', iso(-36 + i)));
        if (['Pending verification', 'Verified closed'].includes(status as string))
            stmts.push(db().prepare('INSERT OR IGNORE INTO evidence (id,workspace,case_id,note,checksum,actor,created_at,sample) VALUES (?,?,?,?,?,?,?,1)').bind(`${id}:evidence`, w, id, 'SAMPLE ONLY: field team recorded corrective work and receiving destination. Replace with a genuine field record in a real pilot.', 'sample-no-file', 'Field team', iso(-1)));
    }
    const stations = [['Anand Vihar', 185], ['Punjabi Bagh', 132], ['Rohini', 148], ['Okhla', 119]] as const;
    for (const [station, value] of stations)
        for (let t = 7; t >= 0; t--)
            stmts.push(db().prepare('INSERT OR IGNORE INTO observations (id,workspace,station,pollutant,value,unit,observed_at,provider,averaging,qc,sample,ingested_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)').bind(`${w}:${station}:${t}`, w, station, 'PM2.5', value + [0, 8, -6, 14, 25, 18, 5, -10][t], 'µg/m³', iso(-t * 3), 'AirAction synthetic dataset', '1 hour', 'Demonstration', iso(0)));
    await db().batch(stmts);
}
