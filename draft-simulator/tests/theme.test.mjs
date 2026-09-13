import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyTheme,readTheme,toggleTheme,THEME_KEY} from '../dist/theme.js';

function storage(start={}) {
  const map=new Map(Object.entries(start));
  return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),map};
}
function documentStub(themeColor='#e52521') {
  const meta={content:themeColor};
  return {documentElement:{dataset:{},style:{}},querySelector:sel=>sel==='meta[name="theme-color"]'?meta:null,meta};
}

test('missing or unknown stored theme is dark',()=>{
  assert.equal(readTheme(storage()),'dark');
  assert.equal(readTheme(storage({[THEME_KEY]:'sepia'})),'dark');
});

test('stored light theme is restored',()=>{
  assert.equal(readTheme(storage({[THEME_KEY]:'light'})),'light');
});

test('applyTheme writes the document, color-scheme, and storage',()=>{
  const doc=documentStub();
  const store=storage();
  assert.equal(applyTheme('light',{document:doc,storage:store}),'light');
  assert.equal(doc.documentElement.dataset.theme,'light');
  assert.equal(doc.documentElement.style.colorScheme,'light');
  assert.equal(store.getItem(THEME_KEY),'light');
  assert.equal(applyTheme('nope',{document:doc,storage:store}),'dark');
  assert.equal(doc.documentElement.dataset.theme,'dark');
});

test('toggleTheme flips dark and light',()=>{
  const doc=documentStub();
  const store=storage();
  assert.equal(toggleTheme('dark',{document:doc,storage:store}),'light');
  assert.equal(toggleTheme('light',{document:doc,storage:store}),'dark');
});

test('private-mode storage failures still apply a theme',()=>{
  const doc=documentStub();
  const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  assert.equal(readTheme(storage),'dark');
  assert.equal(applyTheme('light',{document:doc,storage}),'light');
  assert.equal(doc.documentElement.dataset.theme,'light');
});

test('the draft room ships a theme toggle and light tokens',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(html,/id="theme-toggle"/);
  assert.match(app,/from '\.\/theme\.js'/);
  assert.match(css,/html\[data-theme=light\]/);
});
