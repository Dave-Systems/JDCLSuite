import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {newestParPatchName} from '../../dist/parpatch.js';

export function readNewestParPatch(dirUrl) {
  const filename=newestParPatchName(readdirSync(fileURLToPath(dirUrl)));
  if(!filename) throw new Error(`No ParPatchv*.txt in ${fileURLToPath(dirUrl)}`);
  return {filename,text:readFileSync(new URL(filename,dirUrl),'utf8')};
}
