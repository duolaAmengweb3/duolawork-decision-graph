import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {openGraph} from './graph.mjs';
const snapshot=JSON.parse(await fs.readFile(new URL('./fixture.json',import.meta.url),'utf8'));
test('real Relate persistence, idempotent import, transitive impact and parameter safety',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'decision-graph-'));
  try{
    const file=path.join(dir,'graph.rl');
    const imported=spawnSync(process.execPath,['--input-type=module','-e',`import {openGraph} from './graph.mjs';import fs from 'node:fs';const g=openGraph(process.argv[1]);const d=JSON.parse(fs.readFileSync('fixture.json'));g.import(d);g.import(d);console.log(g.read().nodes.length);`,file],{cwd:new URL('.',import.meta.url),encoding:'utf8'});
    assert.equal(imported.status,0,imported.stderr);assert.equal(Number(imported.stdout.trim().split('\n').at(-1)),8);
    const graph=openGraph(file,{readOnly:true});
    assert.deepEqual(graph.impact('req-v1').map(n=>n.id),['acceptance','draft-v1','draft-v2','finding','task']);
    assert.deepEqual(graph.impact("req-v1'}) MATCH (n) DETACH DELETE n //"),[]);
    assert.equal(graph.read().nodes.length,8);
    assert.throws(()=>graph.import({...snapshot,edges:[{from:'task',to:'missing',type:'DEPENDS_ON'}]}),/missing source/);
    assert.equal(graph.read().nodes.length,8);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
