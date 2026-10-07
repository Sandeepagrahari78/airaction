import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/domain.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {nextStatus,isOverdue}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('complete controlled lifecycle, failed review and reopening',()=>{
 let state='Received';
 for(const [op,role,expected] of [['triage','Coordinator','Triaged'],['approve','Coordinator','Approved'],['assign','Coordinator','Assigned'],['start','Field team','In progress'],['submit','Field team','Pending verification'],['return','Verifier','In progress'],['submit','Field team','Pending verification'],['verify','Verifier','Verified closed'],['reopen','Verifier','In progress']]){state=nextStatus(state,op,role,'Field team');assert.equal(state,expected)}
});
test('cannot skip stages or execute another role’s operation',()=>{assert.throws(()=>nextStatus('Received','verify','Verifier',null));assert.throws(()=>nextStatus('Pending verification','verify','Field team','Field team'));assert.throws(()=>nextStatus('Assigned','start','Coordinator',null));});
test('executor cannot verify own closure',()=>assert.throws(()=>nextStatus('Pending verification','verify','Verifier','Verifier')));
test('overdue is derived and never auto-closes cases',()=>{const c={status:'In progress',due_at:'2026-01-01T00:00:00Z'};assert.equal(isOverdue(c,Date.parse('2026-02-01')),true);assert.equal(c.status,'In progress');assert.equal(isOverdue({...c,status:'Verified closed'},Date.parse('2026-02-01')),false);assert.equal(isOverdue({...c,due_at:null}),false)});
