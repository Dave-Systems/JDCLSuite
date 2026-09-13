import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const baseline=json('../dist/data/baseline.json');
const portraits=json('../dist/data/portraits.json');
const manifest=json('./fixtures/portraits-manifest.json');

test('every playable character has a portrait and Mii slots fall back to initials',()=>{
  const characters=baseline.roster.filter(p=>p.playable&&p.kind!=='mii').map(p=>String(p.id));
  assert.deepEqual(Object.keys(portraits.players).sort((a,b)=>a-b),characters);
  assert.ok(baseline.roster.filter(p=>p.kind==='mii').every(p=>!(p.id in portraits.players)));
  assert.match(portraits.credit,/Nintendo/);
});

test('portrait files are the recorded images for the mapped player',()=>{
  assert.equal(manifest.assets.length,71*3);
  for(const asset of manifest.assets) {
    assert.equal(portraits.players[asset.player_id],asset.slug,`${asset.character} maps to its folder`);
    const bytes=readFileSync(new URL(`../dist/portraits/${asset.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
  }
});
