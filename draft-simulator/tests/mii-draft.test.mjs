import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createModel} from '../dist/gecko.js';
import {createDraft,currentTurn,pickPlayer,teamChemistry,undoPick} from '../dist/draft.js';
import {createDraftExport,formatDraftExport} from '../dist/export.js';
import {chemistryLinks,emptyFilters,filterPlayers} from '../dist/pool.js';

import {readNewestParPatch} from './support/parpatch.mjs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const model=createModel(json('../dist/data/baseline.json'),json('../dist/data/schema.json'));
const vanilla=model.vanilla;
const patched=model.apply(readNewestParPatch(new URL('./fixtures/',import.meta.url)).text).roster;
const slot=name=>vanilla.find(p=>p.name===name).id;
const characters=vanilla.filter(p=>p.playable&&p.kind!=='mii').map(p=>p.id);
const miis=vanilla.filter(p=>p.kind==='mii').map(p=>p.id);
const leagueDraft=(options={})=>createDraft({names:['Stars','Comets'],rosterSize:9,order:'snake',playerIds:[...characters,...miis],unlimitedIds:miis,...options});

test('Mii slots can be drafted repeatedly by any team, each under a required unique name',()=>{
  let draft=leagueDraft();
  const redMale=slot('Red Mii (M)'),redFemale=slot('Red Mii (F)');
  draft=pickPlayer(draft,redMale,{name:'  Dave   T '});
  draft=pickPlayer(draft,redMale,{name:'Sam'});
  draft=pickPlayer(draft,redFemale,{name:'Alex'});
  assert.deepEqual(draft.picks.map(p=>[p.id,p.team,p.name]),[[redMale,0,'Dave T'],[redMale,1,'Sam'],[redFemale,1,'Alex']]);
  assert.throws(()=>pickPlayer(draft,redMale),/Name this Mii/);
  assert.throws(()=>pickPlayer(draft,redMale,{name:'   '}),/Name this Mii/);
  assert.throws(()=>pickPlayer(draft,redMale,{name:'dave t'}),/already named Dave T/);
  assert.throws(()=>pickPlayer(draft,redMale,{name:'x'.repeat(25)}),/24 characters/);
  draft=undoPick(draft);
  assert.equal(pickPlayer(draft,redFemale,{name:'Alex'}).picks.at(-1).name,'Alex','undo frees the name');
  // Characters are still single-draft, and a name passed for them is ignored.
  draft=pickPlayer(draft,0,{name:'Ignored'});
  assert.equal(draft.picks.at(-1).name,undefined);
  assert.throws(()=>pickPlayer(draft,0),/already been drafted/);
});

test('unlimited Miis lift the pool-size limit, and a draft of only Miis completes',()=>{
  assert.throws(()=>createDraft({names:Array.from({length:8},(_,i)=>`T${i}`),rosterSize:12,order:'snake',playerIds:characters}),/96 players/);
  let draft=leagueDraft({names:Array.from({length:8},(_,i)=>`T${i}`),rosterSize:12,playerIds:[0,miis[0]],unlimitedIds:[miis[0]]});
  for(let i=0;i<96;i++)draft=pickPlayer(draft,miis[0],{name:`Mii ${i}`});
  assert.equal(currentTurn(draft),null);
  assert.throws(()=>createDraft({names:['A','B'],rosterSize:9,order:'snake',playerIds:characters,unlimitedIds:[miis[0]]}),/invalid/);
});

test('Mii gender slots differ only in batting side, so the pick decides handedness',()=>{
  for(const roster of [vanilla,patched]) {
    for(let i=0;i<12;i++) {
      const male=roster[miis[i]],female=roster[miis[i+12]];
      assert.equal(male.name.replace(' (M)',''),female.name.replace(' (F)',''));
      assert.deepEqual(Object.keys(male.stats).filter(k=>male.stats[k]!==female.stats[k]),['battingArm']);
      assert.deepEqual([male.stats.battingArm,female.stats.battingArm],[0,1],`${male.name} bats right, ${female.name} bats left`);
    }
  }
});

test('team chemistry counts two Miis from the same slot using that slot\'s self-chemistry',()=>{
  const red=patched[slot('Red Mii (M)')],brown=patched[slot('Brown Mii (M)')];
  assert.equal(red.chemistry[red.id],2);assert.equal(brown.chemistry[brown.id],2);
  assert.deepEqual(teamChemistry([red,red]),{good:2,bad:0});
  assert.deepEqual(teamChemistry([brown,brown]),{good:2,bad:0});
  assert.deepEqual(teamChemistry([patched[0]]),{good:0,bad:0});
  // A pooled Red Mii row (a separate object for the same slot) links to a Red Mii already on the team.
  const pooledRed={...red,name:'Red Mii'};
  assert.equal(chemistryLinks(pooledRed,[red]).good.length,1);
  assert.equal(chemistryLinks(red,[red]).good.length,0,'a player never links to its own roster entry');
});

test('a pooled Mii color matches stat filters when either gender slot does',()=>{
  const male=vanilla[slot('Blue Mii (M)')],female=vanilla[slot('Blue Mii (F)')];
  const row={...male,name:'Blue Mii',variants:[male,female]};
  const context={roster:vanilla,team:null,chemistryPeers:()=>[]};
  for(const bats of [0,1]) {
    const filters=emptyFilters();filters.stats.battingArm={equals:bats};
    assert.deepEqual(filterPlayers([row,male],filters,context).map(p=>p.name),bats===0?['Blue Mii','Blue Mii (M)']:['Blue Mii']);
  }
  const filters=emptyFilters();filters.stats.battingArm={equals:1};filters.stats.chargePower={min:male.stats.chargePower+1,max:null};
  assert.deepEqual(filterPlayers([row],filters,context),[],'all stat filters must hold for the same slot');
});

test('exports show Mii league names with their color and gender',()=>{
  let draft=leagueDraft({rosterSize:9});
  const ids=[slot('Pink Mii (F)'),...characters.slice(0,16),slot('Pink Mii (M)')];
  ids.forEach((id,i)=>{draft=pickPlayer(draft,id,{name:i===0?'=Jo':i===17?'Pat':undefined});});
  const data=createDraftExport({draft,roster:patched,exportedAt:'2026-09-13T15:00:00.000Z'});
  const players=data.teams.flatMap(t=>t.players);
  assert.deepEqual(players.find(p=>p.pick===1),{id:slot('Pink Mii (F)'),name:'=Jo',character:'Pink Mii',miiGender:'Female',round:1,pick:1});
  assert.deepEqual(players.find(p=>p.pick===18),{id:slot('Pink Mii (M)'),name:'Pat',character:'Pink Mii',miiGender:'Male',round:9,pick:18});
  assert.equal(data.version,2);
  assert.match(formatDraftExport(data,'txt').content,/1\. =Jo \[Pink Mii, Female\] \(round 1, pick #1\)/);
  const csv=formatDraftExport(data,'csv').content;
  assert.ok(csv.includes('"\'=Jo","Pink Mii","Female"'),'formula-like Mii names stay text in CSV');
  assert.ok(csv.includes('"Pat","Pink Mii","Male"'));
});
