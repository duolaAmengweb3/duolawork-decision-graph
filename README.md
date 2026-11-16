# DuolaWork Decision Graph

**A requirement changes. What deserves another look?**

Connect requirement versions, tasks, drafts, review findings and acceptance records in an embedded [Relate](https://relatedb.ai/) database. Select a source version to trace its dependencies and inspect each record’s source reference.

New component started **November 16, 2026**, for the [Relate by Neo4j Hackathon](https://relate.devpost.com/). The existing [DuolaWork workspace](https://github.com/duolaAmengweb3/duolawork) is prior work. The NAS competition Skill is separate and is not included.

## Run

Use **Node.js 24+** and npm. No API key, model subscription or personal workspace is needed.

```sh
git clone https://github.com/duolaAmengweb3/duolawork-decision-graph.git
cd duolawork-decision-graph
npm ci
npm test
npm start
```

Open the loopback URL printed in the terminal. The server chooses an available port and binds only to `127.0.0.1`. Stop with Ctrl+C. The bundled dataset is synthetic. The viewer displays **actual Relate query results**, with no external model or commercial agent calls.

## How it uses Relate

**Mode: single file**, created at `.local/decision-graph.rl`. This runtime file is excluded from Git. The embedded engine is `@relate/relate` **1.0.1**, pinned in the lockfile. Imports validate the snapshot, upsert nodes and edges in a transaction, then checkpoint. A restart preserves the graph; repeating a snapshot does not multiply its nodes or edges. Imports are additive and do not delete old records absent from a later snapshot.

A single file fits a small project lineage snapshot: judges can run locally and retain state without provisioning a database service. Browser routes execute fixed read-only queries. Values are bound as parameters.

The repository also includes an actual saved synthetic graph at [data/example.rl](data/example.rl): **8 records, 10 relationships**, created and checkpointed with Relate 1.0.1. Inspect it with `node server.mjs --store data/example.rl`. The default `.local` working store is separate. Saved example SHA-256: `9a054012d7285d4df2705fb91c0af5a37519f61f5cede8958cbea823a67b7fb6`.

```cypher
MATCH (root:Record {id: $id})<-[:DEPENDS_ON*1..6]-(n:Record)
RETURN DISTINCT n.id AS id, n.title AS title, n.kind AS kind,
                n.version AS version, n.source AS source
ORDER BY n.id LIMIT 100
```

Traversal follows only `DEPENDS_ON`, at most six hops and 100 candidates. `REVISION_OF`, `CHECKED` and `CHANGED` edges provide context. When a requirement is superseded, select its **earlier source version** to find records that relied on it. This release does not automatically infer semantic changes or replace the authoritative task state.

## Walkthrough

1. Select **Validate 10 source records**. Five records are returned: task, original draft, finding, corrected draft and historical acceptance.
2. Inspect **Source says 10, not 100** and the corrected draft, including their versions and source references.
3. Inspect **Expand the scope to 11 records**. Historical acceptance still concerns the earlier scope and revision 2. It remains in the record.
4. Restart the server and repeat the query against the same persistent store.

A dependency is a **review candidate**, not proof of an error. An empty result does not prove independence beyond the imported data or traversal limit. The graph never reassigns work, declares completion or silently reuses an old acceptance for a changed artifact.

## Other snapshots

```sh
node server.mjs --store .local/another-project.rl --import /absolute/path/snapshot.json
```

Startup imports seed an **empty** store only. Existing data is preserved. To update deliberately, use `openGraph(file).import(snapshot)` from [graph.mjs](graph.mjs). See [fixture.json](fixture.json) for schema version 1: nodes have stable source ID, kind, title, version, source and optional summary; edges have from, to and type. Kinds: requirement, task, document, review, check, change. Edge types: DEPENDS_ON, REVISION_OF, CHECKED, CHANGED. Imports reject unknown kinds, relations and missing source records. Only import information you are authorized to share.

The separate DuolaWork judge walkthrough includes a compatible exporter for its controlled HTTP/SQLite records. It is optional; this standalone entry runs independently of private accounts and services.

## Validation and limits

`npm test` uses the actual Relate engine: a child process writes and checkpoints a store, then a later process opens it read-only. Assertions cover persistence, repeated import counts, transitive impact, injection-like parameter text, and malformed import rejection without changing stored data.

Verified locally on **macOS ARM64, Node 24.19.0**. Other native package platforms have not been independently tested for this entry. This is one focused integration scenario, not a general benchmark or productivity measurement. The UI has been inspected in a local browser. A dedicated demo film and final contest submission remain in preparation.

## Prior work, AI and license

The graph model, importer, queries, local viewer and test are new contest work. DuolaWork’s pre-existing workspace and protocol are background and a possible snapshot producer. Codex assisted with research, implementation and verification; the creator remains responsible for the submission.

This component retains the **DuolaWork Source-Available License 1.0** in [LICENSE](LICENSE), which is not an OSI-approved open-source license. Dependencies retain their own licenses. No credentials, model weights, user conversations or production workspace data are included.
