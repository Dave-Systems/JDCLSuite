import {newestParPatchName} from './parpatch.js';
const repoPath = 'Dave-Systems/JDCLSuite';
const folder = 'Stat-Editor/Gecko-Codes';
async function get(url,kind='json') {
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error(`Live ParPatch could not be read (HTTP ${response.status}). Paste a code or try Reload live ParPatch.`);
  return kind==='text'?response.text():response.json();
}
function isLoopback() {
  return ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
}
export async function loadLivePatch() {
  // Prefer the local server's live file when it exists — including LAN IPs
  // so a phone on the same network still reads JDCLSuite/Stat-Editor, not GitHub.
  try {
    const response=await fetch('/api/parpatch',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(response.ok) {
      const data=await response.json();
      if(typeof data.code!=='string') throw new Error('The local ParPatch response did not contain a code.');
      return {...data,loadedAt:new Date().toISOString()};
    }
    if(isLoopback() || response.status===503) {
      throw new Error(`Live ParPatch could not be read (HTTP ${response.status}). Paste a code or try Reload live ParPatch.`);
    }
  } catch (error) {
    if(isLoopback() || /HTTP 503/.test(String(error?.message||''))) throw error;
  }
  const contents=await get(`https://api.github.com/repos/${repoPath}/contents/${folder}?ref=main&_=${Date.now()}`);
  if(!Array.isArray(contents)) throw new Error('JDCLSuite did not return its Gecko Code folder.');
  const filename=newestParPatchName(contents.filter(f=>f.type==='file').map(f=>f.name));
  const file=contents.find(f=>f.name===filename);
  if(!file) throw new Error('No ParPatch text file was found in the live JDCLSuite repository.');
  const {sha}=file;
  // raw.githubusercontent.com caches by path for minutes, so read the listed blob by hash instead.
  const blob=await get(`https://api.github.com/repos/${repoPath}/git/blobs/${encodeURIComponent(sha)}`);
  if(blob.encoding!=='base64'||typeof blob.content!=='string') throw new Error('JDCLSuite returned the ParPatch in an unexpected format.');
  const code=new TextDecoder().decode(Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  return {code,filename,source:'github',sourceLabel:'Live JDCLSuite · GitHub main',sourcePath:`JDCLSuite/${folder}/${filename}`,sourceUrl:`https://github.com/${repoPath}/blob/main/${folder}/${filename}`,loadedAt:new Date().toISOString()};
}
