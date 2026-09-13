import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createModel} from '../dist/gecko.js';
import {createDraft,pickPlayer,undoPick} from '../dist/draft.js';
import {canExportDraft,createDraftExport,formatDraftExport} from '../dist/export.js';

const baseline=JSON.parse(readFileSync(new URL('../dist/data/baseline.json',import.meta.url)));
const schema=JSON.parse(readFileSync(new URL('../dist/data/schema.json',import.meta.url)));
const roster=createModel(baseline,schema).vanilla;
const ids=roster.filter(p=>p.playable).map(p=>p.id);
const exportedAt='2026-09-13T15:00:00.000Z';
function complete({names=['Stars','Comets'],rosterSize=9,order='snake',playerIds=ids}={}) {
  let draft=createDraft({names,rosterSize,order,playerIds});
  for(const id of playerIds.slice(0,names.length*rosterSize))draft=pickPlayer(draft,id);
  return draft;
}

test('export requires completion and becomes unavailable after undo or reset',()=>{
  const draft=complete();
  for(const incomplete of [null,createDraft({names:draft.names,rosterSize:9,order:'snake',playerIds:ids}),undoPick(draft)]) {
    assert.equal(canExportDraft(incomplete),false);
    assert.throws(()=>createDraftExport({draft:incomplete,roster}),/Finish drafting/);
  }
  assert.equal(canExportDraft(draft),true);
  assert.equal(canExportDraft(pickPlayer(undoPick(draft),draft.picks.at(-1).id)),true);
});

test('snake export preserves team assignments, round numbers, and actual pick order without mutation',()=>{
  const draft=complete(),before=JSON.stringify({draft,roster});
  const data=createDraftExport({draft,roster:[...roster].reverse(),patchName:'ParPatch v1.12',exportedAt});
  assert.deepEqual(data.teams.map(t=>t.name),['Stars','Comets']);
  assert.deepEqual(data.teams[0].players.slice(0,3),[
    {id:0,name:'Mario',character:'Mario',round:1,pick:1},
    {id:3,name:'Diddy Kong',character:'Diddy Kong',round:2,pick:4},
    {id:4,name:'Peach',character:'Peach',round:3,pick:5},
  ]);
  assert.equal(data.teams[1].players.at(-1).pick,18);
  assert.equal(data.patchName,'ParPatch v1.12');
  assert.equal(JSON.stringify({draft,roster}),before);
  draft.names[0]='Renamed';
  assert.equal(data.teams[0].name,'Stars');
});

test('linear 12-player rosters include Mii slots with their correct game IDs',()=>{
  const draft=complete({rosterSize:12,order:'linear',playerIds:[...ids].reverse()});
  const data=createDraftExport({draft,roster,exportedAt});
  assert.equal(data.rosterSize,12);assert.equal(data.order,'linear');
  assert.deepEqual(data.teams.map(t=>t.players.length),[12,12]);
  assert.deepEqual(data.teams[0].players.map(p=>p.pick),[1,3,5,7,9,11,13,15,17,19,21,23]);
  assert.equal(data.teams[0].players[0].id,100);
  assert.equal(data.teams[0].players[0].name,roster[100].name);
});

test('text and JSON contain every drafted player, settings, and applied patch label',()=>{
  const data=createDraftExport({draft:complete(),roster,patchName:'Applied patch',exportedAt});
  const text=formatDraftExport(data,'txt');
  assert.match(text.content,/Applied stats: Applied patch/);
  assert.match(text.content,/Snake · 2 teams · 9 players per team/);
  for(const team of data.teams)for(const player of team.players)assert.ok(text.content.includes(`${player.name} (round ${player.round}, pick #${player.pick})`));
  const json=formatDraftExport(data,'json');
  assert.deepEqual(JSON.parse(json.content),data);
  assert.match(json.filename,/^jdcl-teams-2026-09-13T15-00-00-000Z\.json$/);
  assert.equal(json.type,'application/json;charset=utf-8');
});

test('CSV escapes punctuation and Unicode and treats formula-like names as text',()=>{
  const draft=complete({names:['Stars, "Élite"','=1+1']});
  const data=createDraftExport({draft,roster,patchName:'@Patch',exportedAt});
  const csv=formatDraftExport(data,'csv');
  assert.ok(csv.content.startsWith('\uFEFF"Team","Roster slot"'));
  assert.ok(csv.content.includes('"Stars, ""Élite""","1","Mario","Mario","","0","1","1"'));
  assert.ok(csv.content.includes('"\'=1+1"'));
  assert.ok(csv.content.includes('"\'@Patch"'));
  assert.equal(csv.content.trimEnd().split('\r\n').length,19);
  assert.ok(csv.content.endsWith('\r\n'));
});

test('eight-team export includes all rosters and no duplicate players',()=>{
  const data=createDraftExport({draft:complete({names:Array.from({length:8},(_,i)=>`Team ${i+1}`)}),roster,exportedAt});
  assert.equal(data.teams.length,8);
  assert.ok(data.teams.every(t=>t.players.length===9));
  assert.equal(new Set(data.teams.flatMap(t=>t.players.map(p=>p.id))).size,72);
});

test('missing player data and unsupported export formats fail clearly',()=>{
  assert.throws(()=>createDraftExport({draft:complete(),roster:[]}),/Player 0 is missing/);
  const data=createDraftExport({draft:complete(),roster,exportedAt});
  assert.throws(()=>formatDraftExport(data,'html'),/Choose text, CSV, or JSON/);
});
