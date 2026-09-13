import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareVanilla} from './support/vanilla-reference.mjs';
import {literalAt,toJson} from '../scripts/sync-sluggers-fyi.mjs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const baseline=json('../dist/data/baseline.json');
const schema=json('../dist/data/schema.json');
const reference=json('./fixtures/sluggers-fyi.json');

test('sluggers.fyi snapshot covers exactly the 71 playable characters',()=>{
  const ids=reference.characters.map(c=>c.id).sort((a,b)=>a-b);
  const playable=baseline.roster.filter(p=>p.playable&&p.kind!=='mii').map(p=>p.id);
  assert.deepEqual(ids,playable);
  assert.match(reference.meta.source,/^https:\/\/www\.sluggers\.fyi\/characters$/);
});

test('sync tokenizer reads minified roster literals without running them',()=>{
  const bundle='const x=1;const bb=[{id:0,character:"Mario \\"M\\", Jr.",a:1.5,b:.5,c:!0,d:!1,e:-12.25,f:[1,2],g:{h:null}}],y=2;';
  const literal=literalAt(bundle,bundle.indexOf('[{id:0'));
  assert.deepEqual(toJson(literal),[{id:0,character:'Mario "M", Jr.',a:1.5,b:0.5,c:true,d:false,e:-12.25,f:[1,2],g:{h:null}}]);
  assert.throws(()=>toJson('[{id:0,a:alert(1)}]'),/Unexpected identifier/);
});

test('Stat Editor vanilla stats match sluggers.fyi on every compared field',()=>{
  const result=compareVanilla(baseline,schema,reference);
  assert.equal(result.characters,71);
  assert.equal(result.fields,26);
  assert.deepEqual(result.statDifferences,[]);
});

test('the only vanilla chemistry disagreement is Daisy with Fire Bro and Boomerang Bro',()=>{
  // The Stat Editor agrees with in-game Daisy as reported by the JDCL maintainer (good: Peach, Luigi, Birdo, Orange Mii; bad: Hammer Bro).
  // sluggers.fyi also marks Fire Bro and Boomerang Bro as bad, so the roster keeps the editor's values.
  const names=id=>baseline.roster[id].name;
  const differences=compareVanilla(baseline,schema,reference).chemistryDifferences.map(d=>`${names(d.id)} → ${names(d.target)}: editor ${d.editor}, sluggers.fyi ${d.reference}`);
  assert.deepEqual(differences,[
    'Daisy → Fire Bro: editor Neutral, sluggers.fyi Bad',
    'Daisy → Boomerang Bro: editor Neutral, sluggers.fyi Bad',
    'Fire Bro → Daisy: editor Neutral, sluggers.fyi Bad',
    'Boomerang Bro → Daisy: editor Neutral, sluggers.fyi Bad',
  ]);
});
