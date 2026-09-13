import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createModel,parseGecko} from '../dist/gecko.js';
import {createDraft,currentTurn,pickPlayer,undoPick,teamChemistry} from '../dist/draft.js';

const baseline=JSON.parse(readFileSync(new URL('../dist/data/baseline.json',import.meta.url)));
const schema=JSON.parse(readFileSync(new URL('../dist/data/schema.json',import.meta.url)));
const model=createModel(baseline,schema);
const sample=readFileSync(new URL('./fixtures/ParPatchv112.txt',import.meta.url),'utf8');
const ids=model.vanilla.filter(p=>p.playable).map(p=>p.id);

test('ParPatch fixture matches independently verified 173-line patch and known stats',()=>{
  const {roster,report}=model.apply(sample);
  assert.equal(report.codeLines,173);assert.equal(report.instructions,153);
  assert.equal(report.modeledBytes,687);assert.equal(report.paddingBytes,2);
  assert.equal(report.statChanges,26);assert.equal(report.chemistryChanges,202);
  assert.equal(report.changedPlayers,83);assert.deepEqual(report.warnings,[]);
  const byName=name=>roster.find(p=>p.name===name);
  assert.equal(byName('Green Koopa Troopa').stats.speed,75);
  assert.equal(byName('Red Koopa Troopa').stats.slapPower,40);
  assert.equal(byName('Red Koopa Troopa').stats.chargePower,60);
  assert.equal(byName('Blue Noki').stats.stamina,55);
  assert.equal(byName('Blue Noki').stats.displayPitching,7);
  assert.equal(byName('Blooper').stats.curve,60);
  assert.equal(byName('Luigi').stats.class,3);
  assert.equal(byName('Donkey Kong').stats.fieldingAbility,11);
  assert.equal(byName('Peach').stats.trajectory,0);
  assert.equal(roster[100].chemistry[100],2);
  assert.equal(roster.filter(p=>p.chemistryChanges.some(c=>c.id===p.id)).length,22);
  assert.equal(roster[86].chemistryChanges.some(c=>c.id===86),false);
  assert.equal(model.vanilla[12].stats.speed,64);
});
test('preserves all 101 IDs and excludes six unused slots from the 95-player pool',()=>{
  assert.equal(model.vanilla.length,101);assert.equal(ids.length,95);
  assert.equal(model.vanilla.filter(p=>p.playable&&p.kind!=='mii').length,71);
  assert.deepEqual(ids.filter(id=>id>=71&&id<=76),[]);
  assert.equal(ids.at(-1),100);
});
test('06 consumes padded payload and applies only the requested bytes',()=>{
  const parsed=parseGecko('066CE9B8 00000003\n006400FF FFFFFFFF\n006CE9BB 00000050');
  assert.equal(parsed.instructions,2);assert.equal(parsed.writes.size,4);
  assert.deepEqual([...parsed.writes.values()].map(v=>v.value),[0,100,0,80]);
  const p=model.apply('066CE9B8 00000003\n006400FF FFFFFFFF\n006CE9BB 00000050').roster[0];
  assert.equal(p.stats.slapPower,100);assert.equal(p.stats.chargePower,80);
});
test('8/16-bit fills, 32-bit writes, and serial value wrapping',()=>{
  let w=parseGecko('006CE9B8 000200AB').writes;
  assert.deepEqual([...w.values()].map(v=>v.value),[171,171,171]);
  w=parseGecko('026CE9B8 00011234').writes;
  assert.deepEqual([...w.values()].map(v=>v.value),[18,52,18,52]);
  w=parseGecko('046CE9B8 12345678').writes;
  assert.deepEqual([...w.values()].map(v=>v.value),[18,52,86,120]);
  w=parseGecko('086CE9B8 000000FE\n00020001 00000001').writes;
  assert.deepEqual([...w.values()].map(v=>v.value),[254,255,0]);
  w=parseGecko('086CE9B8 0000FFFF\n10010002 00000001').writes;
  assert.deepEqual([...w.values()].map(v=>v.value),[255,255,0,0]);
});
test('overlapping writes use the last byte; each import starts from vanilla',()=>{
  const result=model.apply('046CE9B8 00640050\n006CE9B9 0000003C');
  assert.equal(result.roster[0].stats.slapPower,60);
  assert.equal(model.apply('006CE9B9 00000032').report.statChanges,0);
  assert.equal(model.vanilla[0].stats.slapPower,50);
});
test('float tables are byte accurate without spurious baseline changes',()=>{
  const result=model.apply('0462EB50 40000000');
  assert.equal(result.roster[0].stats.gameplayScale,2);
  assert.equal(result.report.statChanges,1);
  assert.equal(result.roster[0].changes[0].key,'gameplayScale');
});
test('chemistry preserves direction and self changes',()=>{
  const result=model.apply('006CE9D1 00000000\n006D21AC 00000002');
  assert.equal(result.roster[0].chemistry[1],0);
  assert.equal(result.roster[1].chemistry[0],2);
  assert.equal(result.roster[100].chemistry[100],2);
  assert.deepEqual(teamChemistry(result.roster.slice(0,2)),{good:1,bad:1});
});
test('invalid or unsupported patches fail atomically with an actionable error',()=>{
  const before=JSON.stringify(model.vanilla);
  for(const text of ['', 'hello','046CE9B8 ZZZZZZZZ','066CE9B8 00000009\n00000000 00000000','086CE9B8 00000001','086CE9B8 00000001\n30010001 00000001','046CE9B8 00640050\n206CE9B8 00640050','C26CE9B8 00000001\n046CE9B8 00640050','[Gecko]\n046CE9B8 00640050'])assert.throws(()=>model.apply(text));
  assert.throws(()=>model.apply('0462EB50 7FC00000'),/finite/);
  assert.throws(()=>model.apply('04000000 00000000'),/No supported/);
  assert.equal(JSON.stringify(model.vanilla),before);
});
test('reports unmapped writes without pretending the whole patch is modeled',()=>{
  const result=model.apply('046CE9B8 00640050\n04000000 00000001');
  assert.equal(result.report.unmodeledBytes,4);
  assert.equal(result.report.warnings.length,1);
  assert.equal(result.roster[0].stats.slapPower,100);
});
test('Stat Editor word padding is recognized, but a changed character ID byte is reported',()=>{
  // Mario → Black Mii (F) chemistry word runs into Luigi's 00 00 01 record header.
  let result=model.apply('046CEA34 02000001');
  assert.deepEqual([result.report.chemistryChanges,result.report.paddingBytes,result.report.unmodeledBytes,result.report.warnings],[1,3,0,[]]);
  result=model.apply('046CEA34 02000000');
  assert.equal(result.report.unmodeledBytes,1);assert.match(result.report.warnings[0],/0x806CEA37/);
  // Zero-filled tails after the star pitch type, stamina and trajectory tables, and the header after the last record.
  for(const [code,padding] of [['04628920 02000000',3],['046289EC 00500000',2],['0462A224 02010000',2],['046D21AC 02000065',3]]) {
    result=model.apply(code);
    assert.deepEqual([result.report.statChanges+result.report.chemistryChanges,result.report.paddingBytes,result.report.unmodeledBytes],[1,padding,0],code);
  }
  assert.equal(model.apply('04628920 02010000').report.unmodeledBytes,1);
});
test('block payloads and serial parameters cannot consume the next named patch',()=>{
  assert.throws(()=>model.apply('$Truncated\n06628954 00000008\n$Another\n046CF064 001E004B'),/another named code/);
  assert.throws(()=>model.apply('$Truncated\n08628954 00000008\n$Another\n00010002 00000001'),/another named code/);
});
test('comments, labels, uppercase/lowercase and terminators are accepted',()=>{
  const result=model.apply('\uFEFF$Test patch\r\n* description\r\n046ce9b8 00640050 # comment\r\nE0000000 80008000\r\nF0000000 00000000');
  assert.equal(result.report.title,'Test patch');assert.equal(result.roster[0].stats.slapPower,100);
});
test('three-team snake draft reverses turns and supports undo across round boundary',()=>{
  let d=createDraft({names:['A','B','C'],rosterSize:9,order:'snake',playerIds:ids});
  const turns=[];
  for(const id of ids.slice(0,7)){turns.push(currentTurn(d).team);d=pickPlayer(d,id);}
  assert.deepEqual(turns,[0,1,2,2,1,0,0]);
  d=undoPick(d);assert.deepEqual(currentTurn(d),{round:3,pick:7,team:0});
  d=undoPick(d);assert.deepEqual(currentTurn(d),{round:2,pick:6,team:0});
  assert.throws(()=>pickPlayer(d,0),/already/);
});
test('eight-team draft completes without duplicated players or uneven rosters',()=>{
  let d=createDraft({names:Array.from({length:8},(_,i)=>`Team ${i+1}`),rosterSize:9,order:'snake',playerIds:ids});
  for(const id of ids.slice(0,72))d=pickPlayer(d,id);
  assert.equal(currentTurn(d),null);assert.equal(new Set(d.picks.map(p=>p.id)).size,72);
  for(let i=0;i<8;i++)assert.equal(d.picks.filter(p=>p.team===i).length,9);
  assert.throws(()=>pickPlayer(d,ids[72]),/open roster/);
});
test('linear order, capacity and team-name validation',()=>{
  let d=createDraft({names:['A','B','C'],rosterSize:9,order:'linear',playerIds:ids});
  for(const id of ids.slice(0,3))d=pickPlayer(d,id);
  assert.equal(currentTurn(d).team,0);
  assert.throws(()=>createDraft({names:Array.from({length:8},(_,i)=>`T${i}`),rosterSize:12,order:'snake',playerIds:ids}),/96 players/);
  assert.throws(()=>createDraft({names:['A','a'],rosterSize:9,order:'snake',playerIds:ids}),/different name/);
  assert.throws(()=>pickPlayer(d,71),/not in/);
});
