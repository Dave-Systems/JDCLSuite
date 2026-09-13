import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createModel,formatStat} from '../dist/gecko.js';
import {activeFilterCount,buildColumns,chemistryLinks,defaultColumns,emptyFilters,filterPlayers,nextSort,sortPlayers} from '../dist/pool.js';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const model=createModel(json('../dist/data/baseline.json'),json('../dist/data/schema.json'));
const roster=model.vanilla;
const pool=roster.filter(p=>p.playable);
const columns=buildColumns(model.fields);
const byName=name=>roster.find(p=>p.name===name);
const context=(team=null)=>({roster,team,chemistryPeers:()=>team||pool});

test('every modeled stat is a filterable, sortable column, plus player and chemistry',()=>{
  assert.equal(columns.length,model.fields.length+2);
  assert.deepEqual(columns.filter(c=>c.field).map(c=>c.id).sort(),model.fields.map(f=>f.key).sort());
  assert.ok(columns.every(c=>c.id==='name'||c.group),'every column is grouped for the menus');
  assert.ok(defaultColumns.every(id=>columns.some(c=>c.id===id)));
  assert.deepEqual(columns.filter(c=>['battingArm','pitchingArm'].includes(c.id)).map(c=>c.short),['Bats','Throws']);
});

test('numeric ranges are inclusive and enum filters match exact values',()=>{
  const filters=emptyFilters();
  filters.stats.chargePower={min:90,max:null};
  let result=filterPlayers(pool,filters,context());
  assert.ok(result.length>0&&result.every(p=>p.stats.chargePower>=90));
  assert.ok(result.some(p=>p.stats.chargePower===90),'minimum is inclusive');
  filters.stats.battingArm={equals:1};
  result=filterPlayers(pool,filters,context());
  assert.ok(result.length>0&&result.every(p=>p.stats.chargePower>=90&&p.stats.battingArm===1));
  assert.equal(activeFilterCount(filters),2);
  filters.stats.chargePower={min:null,max:null};
  assert.equal(activeFilterCount(filters),1);
  filters.stats.gameplayScale={min:1.5,max:1.5};
  assert.deepEqual(filterPlayers(pool,filters,context()),[]);
});

test('decimal bounds match float32 stats exactly as they are displayed',()=>{
  const field=model.fields.find(f=>f.key==='gameplayScale');
  for(const shown of [...new Set(pool.map(p=>formatStat(field,p.stats.gameplayScale)))]) {
    const expected=pool.filter(p=>formatStat(field,p.stats.gameplayScale)===shown).map(p=>p.id);
    const filters=emptyFilters();filters.stats.gameplayScale={min:Number(shown),max:Number(shown)};
    assert.deepEqual(filterPlayers(pool,filters,context()).map(p=>p.id),expected,`Gameplay size ${shown}`);
  }
  const filters=emptyFilters();filters.stats.gameplayScale={min:1.18,max:null};
  assert.ok(filterPlayers(pool,filters,context()).some(p=>p.name==='Mario'));
});

test('chemistry links count players in either direction and filters use them',()=>{
  const daisy=byName('Daisy');
  const links=chemistryLinks(daisy,pool);
  assert.deepEqual(links.good.map(p=>p.name).sort(),['Birdo','Luigi','Orange Mii (F)','Orange Mii (M)','Peach']);
  assert.deepEqual(links.bad.map(p=>p.name),['Hammer Bro']);
  // A one-way link still counts: only Mario likes Luigi in this made-up pair.
  const mario={...byName('Mario'),chemistry:[...byName('Mario').chemistry]},luigi={...byName('Luigi'),chemistry:[...byName('Luigi').chemistry]};
  mario.chemistry[1]=2;luigi.chemistry[0]=1;
  assert.equal(chemistryLinks(luigi,[mario]).good.length,1);

  const filters=emptyFilters();
  filters.goodWith=daisy.id;
  assert.deepEqual(filterPlayers(pool,filters,context()).map(p=>p.name).sort(),links.good.map(p=>p.name).sort());
  filters.goodWith=null;filters.noBadWith=daisy.id;
  assert.ok(!filterPlayers(pool,filters,context()).some(p=>p.name==='Hammer Bro'));
  filters.noBadWith=null;filters.chemTeam='goodnobad';
  assert.equal(filterPlayers(pool,filters,context()).length,pool.length,'team chemistry filter waits for a team with players');
  const team=[daisy];
  const matched=filterPlayers(pool,filters,context(team)).map(p=>p.name).sort();
  assert.deepEqual(matched,links.good.map(p=>p.name).sort());
});

test('header sorting cycles natural order, reverse, then roster order, with stable ties',()=>{
  const speed=columns.find(c=>c.id==='speed'),name=columns.find(c=>c.id==='name'),bats=columns.find(c=>c.id==='battingArm'),chem=columns.find(c=>c.id==='chem');
  let sort=nextSort({column:null,direction:null},speed);
  assert.deepEqual(sort,{column:'speed',direction:'desc'});
  let list=sortPlayers(pool,sort,columns,context());
  assert.ok(list.every((p,i)=>!i||list[i-1].stats.speed>p.stats.speed||(list[i-1].stats.speed===p.stats.speed&&list[i-1].id<p.id)));
  sort=nextSort(sort,speed);assert.equal(sort.direction,'asc');
  list=sortPlayers(pool,sort,columns,context());
  assert.ok(list.every((p,i)=>!i||list[i-1].stats.speed<=p.stats.speed));
  sort=nextSort(sort,speed);assert.deepEqual(sort,{column:null,direction:null});
  assert.deepEqual(sortPlayers([...pool].reverse(),sort,columns,context()).map(p=>p.id),pool.map(p=>p.id));
  assert.deepEqual(nextSort(sort,name),{column:'name',direction:'asc'});
  list=sortPlayers(pool,{column:'name',direction:'asc'},columns,context());
  assert.equal(list[0].name,[...pool].map(p=>p.name).sort((a,b)=>a.localeCompare(b))[0]);
  list=sortPlayers(pool,{column:'battingArm',direction:'asc'},columns,context());
  assert.equal(bats.field.enum[list[0].stats.battingArm],'Left');
  list=sortPlayers(pool,nextSort({column:null},chem),columns,context([byName('Daisy')]));
  assert.ok(['Birdo','Luigi','Peach','Orange Mii (M)','Orange Mii (F)'].includes(list[0].name));
  assert.equal(list.at(-1).name,'Hammer Bro');
});
