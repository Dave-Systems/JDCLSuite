import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLivePatch} from '../dist/live-patch.js';

test('local loader reads live endpoint with no-store and returns text without applying it',async()=>{
  const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
  const calls=[];
  try {
    globalThis.location={hostname:'127.0.0.1'};
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({code:'046CE9B8 00640050',source:'local',filename:'ParPatchv112.txt'})};};
    const result=await loadLivePatch();assert.equal(result.code,'046CE9B8 00640050');
    assert.equal(calls[0].url,'/api/parpatch');assert.equal(calls[0].options.cache,'no-store');
  } finally {globalThis.fetch=originalFetch;globalThis.location=originalLocation;}
});
test('LAN hostname still uses the local live endpoint',async()=>{
  const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
  const calls=[];
  try {
    globalThis.location={hostname:'192.168.0.17'};
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({code:'046CE9B8 00640050',source:'local'})};};
    const result=await loadLivePatch();assert.equal(result.source,'local');
    assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/parpatch');
  } finally {globalThis.fetch=originalFetch;globalThis.location=originalLocation;}
});
test('hosted loader reads current JDCLSuite main and chooses newest ParPatch file',async()=>{
  const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
  const calls=[];
  try {
    globalThis.location={hostname:'draft.example'};
    globalThis.fetch=async(url,options)=>{
      calls.push({url,options});
      if(String(url)==='/api/parpatch') return {ok:false,status:404};
      return calls.length===2
        ? {ok:true,json:async()=>[{name:'ParPatchv112.txt',type:'file',sha:'aaa'},{name:'ParPatchv113.txt',type:'file',sha:'bbb'},{name:'Other.txt',type:'file',sha:'ccc'}]}
        : {ok:true,json:async()=>({encoding:'base64',content:'JFBhciBQYXRjaCDigJQgdjEuMTMK\nMDQ2Q0U5QjggMDA2NDAwNTA=\n'})};
    };
    const result=await loadLivePatch();assert.equal(result.filename,'ParPatchv113.txt');
    assert.equal(result.code,'$Par Patch — v1.13\n046CE9B8 00640050');
    assert.equal(calls[0].url,'/api/parpatch');
    assert.match(calls[1].url,/Dave-Systems\/JDCLSuite\/contents\/Stat-Editor\/Gecko-Codes/);
    assert.match(calls[2].url,/Dave-Systems\/JDCLSuite\/git\/blobs\/bbb$/);
    assert.ok(calls.every(c=>c.options.cache==='no-store'));
    assert.equal(result.sourceLabel,'Live JDCLSuite · GitHub main');
  } finally {globalThis.fetch=originalFetch;globalThis.location=originalLocation;}
});
test('live loading failure never silently substitutes a bundled snapshot',async()=>{
  const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
  try {
    globalThis.location={hostname:'127.0.0.1'};
    globalThis.fetch=async()=>({ok:false,status:503});
    await assert.rejects(loadLivePatch(),/503/);
  } finally {globalThis.fetch=originalFetch;globalThis.location=originalLocation;}
});
