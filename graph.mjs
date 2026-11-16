import {Database} from '@relate/relate';
const kinds=new Set(['requirement','task','document','review','check','change']);
const relations=new Set(['DEPENDS_ON','REVISION_OF','CHECKED','CHANGED']);
export const IMPACT_QUERY='MATCH (root:Record {id:$id})<-[:DEPENDS_ON*1..6]-(n:Record) RETURN DISTINCT n.id AS id,n.title AS title,n.kind AS kind,n.version AS version,n.source AS source ORDER BY n.id LIMIT 100';

export function openGraph(file,{readOnly=false}={}){
  const db=Database.open(file,{readOnly}),conn=db.connect();
  return {
    import(snapshot){
      if(snapshot.schemaVersion!==1||!Array.isArray(snapshot.nodes)||!Array.isArray(snapshot.edges))throw Error('Expected a version 1 lineage snapshot');
      if(snapshot.nodes.length>10000||snapshot.edges.length>30000)throw Error('Snapshot exceeds this demo’s bounded import size');
      const ids=new Set(snapshot.nodes.map(n=>n.id));
      if(ids.size!==snapshot.nodes.length)throw Error('Duplicate source IDs');
      for(const n of snapshot.nodes)if(!kinds.has(n.kind)||!n.id||typeof n.title!=='string'||typeof n.source!=='string')throw Error('Invalid source record');
      for(const e of snapshot.edges)if(!relations.has(e.type)||!ids.has(e.from)||!ids.has(e.to))throw Error('Unrecognized relation or missing source record');
      conn.begin();
      try{
        for(const n of snapshot.nodes)conn.query('MERGE (n:Record {id:$id}) SET n.kind=$kind, n.title=$title, n.version=$version, n.source=$source, n.summary=$summary', {id:n.id,kind:n.kind,title:n.title,version:n.version??1,source:n.source,summary:n.summary??''});
        for(const e of snapshot.edges)conn.query(`MATCH (a:Record {id:$from}), (b:Record {id:$to}) MERGE (a)-[:${e.type}]->(b)`,{from:e.from,to:e.to});
        conn.commit();db.checkpoint();
      }catch(e){conn.rollback();throw e;}
      return this.read();
    },
    read(){return {nodes:conn.query('MATCH (n:Record) RETURN n.id AS id,n.kind AS kind,n.title AS title,n.version AS version,n.source AS source,n.summary AS summary ORDER BY n.id LIMIT 10000').rows,edges:conn.query('MATCH (a:Record)-[r]->(b:Record) RETURN a.id AS from,b.id AS to,type(r) AS type LIMIT 30000').rows};},
    impact(id){return conn.query(IMPACT_QUERY,{id}).rows;}
  };
}
