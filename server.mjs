import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openGraph,IMPACT_QUERY} from './graph.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),value=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const store=path.resolve(value('--store',path.join(root,'.local/decision-graph.rl')));
await fs.mkdir(path.dirname(store),{recursive:true});
const graph=openGraph(store);
const snapshot=graph.read().nodes.length?null:JSON.parse(await fs.readFile(value('--import',path.join(root,'fixture.json')),'utf8'));
if(snapshot)graph.import(snapshot);
const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||'';
    if(!/^127\.0\.0\.1:\d+$/.test(host))throw Error('Loopback requests only');
    const url=new URL(req.url,'http://'+host);
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(['/api/graph','/api/impact','/api/query'].includes(url.pathname)){
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify(url.pathname==='/api/query'?{statement:IMPACT_QUERY,maxHops:6,maxCandidates:100}:url.pathname==='/api/graph'?graph.read():graph.impact((url.searchParams.get('id')||'').slice(0,300))));return;
    }
    if(url.pathname!=='/'){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await fs.readFile(path.join(root,'index.html')));
  }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
server.listen(Number(value('--port',0)),'127.0.0.1',()=>console.log(`Decision Graph: http://127.0.0.1:${server.address().port}\nRelate 1.0.1 · persistent local store: ${store}\nRead-only browser queries; original task status is never modified.`));
