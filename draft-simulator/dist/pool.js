/** Player pool columns, filters, sorting and chemistry links. Pure functions; no DOM access. */
export const groups = [
  {id:'profile',label:'Profile'},
  {id:'batting',label:'Batting'},
  {id:'pitching',label:'Pitching'},
  {id:'fielding',label:'Fielding & running'},
  {id:'size',label:'Size & catch range'},
  {id:'other',label:'Unlabeled bytes'},
];
const layout = {
  profile:['class','battingArm','pitchingArm','captain','weight','starPitch','starSwing','starPitchType','fieldingAbility','baserunningAbility','trajectory','hitCurve'],
  batting:['displayBatting','slapContact','chargeContact','slapPower','chargePower','bunting'],
  pitching:['displayPitching','curveballSpeed','chargePitchSpeed','curve','stamina','windupCharge','windupStar','windupCurve','changeupMultiplier','changeupHeight'],
  fielding:['displayFielding','displaySpeed','speed','throwing','fielding'],
  other:['unknown3','unknown25'],
};
// Column headers are narrow, so some fields get a shorter header; the full label stays in filters and the inspector.
const labels = {
  battingArm:['Bats','Bats'],pitchingArm:['Throws','Throws'],class:['Class','Class'],captain:['Captain','Captain'],
  starPitchType:['Star pitch type','Pitch type'],fieldingAbility:['Fielding ability','Field ability'],baserunningAbility:['Baserunning ability','Run ability'],
  displayBatting:['Batting rating (of 10)','Bat /10'],displayPitching:['Pitching rating (of 10)','Pitch /10'],displayFielding:['Fielding rating (of 10)','Field /10'],displaySpeed:['Running rating (of 10)','Run /10'],
  slapContact:['Slap contact','Slap con'],chargeContact:['Charge contact','Charge con'],slapPower:['Slap power','Slap pow'],chargePower:['Charge power','Charge pow'],
  curveballSpeed:['Curveball speed','Curveball'],chargePitchSpeed:['Charge pitch speed','Charge pitch'],throwing:['Outfield throwing','Throwing'],
  unknown3:['Unknown byte','Unknown byte'],unknown25:['Unknown (not stamina)','Unknown stat'],
};
export const handShort = ['R','L'];
export const defaultColumns = ['battingArm','pitchingArm','slapPower','chargePower','speed','displayPitching','chem'];

export function buildColumns(fields) {
  const group = key => Object.entries(layout).find(([,keys])=>keys.includes(key))?.[0] ?? (fields.find(f=>f.key===key)?.source ? 'size' : 'other');
  const order = key => {const g=group(key);const i=layout[g]?.indexOf(key);return groups.findIndex(x=>x.id===g)*100+(i>=0?i:fields.findIndex(f=>f.key===key)/100+99);};
  const statColumns = fields.map(field=>({
    id:field.key,field,kind:field.enum?'enum':'number',group:group(field.key),
    label:labels[field.key]?.[0] ?? field.label,short:labels[field.key]?.[1] ?? field.label,
  })).sort((a,b)=>order(a.id)-order(b.id));
  return [
    {id:'name',kind:'text',label:'Player',short:'Player',group:null},
    ...statColumns,
    {id:'chem',kind:'chem',label:'Chemistry links',short:'Chem',group:'profile'},
  ];
}

export function chemistryLinks(player, others) {
  const good=[],bad=[];
  for(const other of others) {
    if(other.id===player.id) continue;
    const toward=player.chemistry[other.id],from=other.chemistry[player.id];
    if(toward===2||from===2) good.push(other);
    if(toward===0||from===0) bad.push(other);
  }
  return {good,bad};
}

export function emptyFilters() { return {stats:{},chemTeam:'any',goodWith:null,noBadWith:null}; }

export function activeFilterCount(filters) {
  let count=Object.values(filters.stats).filter(f=>f.equals!=null||f.min!=null||f.max!=null).length;
  if(filters.chemTeam!=='any') count++;
  if(filters.goodWith!=null) count++;
  if(filters.noBadWith!=null) count++;
  return count;
}

/** context.team: players already on the team on the clock (empty or null outside a draft); context.roster: all players by id. */
export function filterPlayers(players, filters, context) {
  const stats=Object.entries(filters.stats);
  const team=context.team?.length?context.team:null;
  return players.filter(p=>{
    for(const [key,f] of stats) {
      const value=p.stats[key];
      if(f.equals!=null&&value!==f.equals) return false;
      // Stats are float32 or small integers; rounding the typed bound the same way keeps 1.18 ≥ 1.18.
      if(f.min!=null&&!(value>=Math.fround(f.min))) return false;
      if(f.max!=null&&!(value<=Math.fround(f.max))) return false;
    }
    if(team&&filters.chemTeam!=='any') {
      const links=chemistryLinks(p,team);
      if((filters.chemTeam==='good'||filters.chemTeam==='goodnobad')&&!links.good.length) return false;
      if((filters.chemTeam==='nobad'||filters.chemTeam==='goodnobad')&&links.bad.length) return false;
    }
    if(filters.goodWith!=null) {
      const target=context.roster[filters.goodWith];
      if(!target||p.id===target.id||!chemistryLinks(p,[target]).good.length) return false;
    }
    if(filters.noBadWith!=null) {
      const target=context.roster[filters.noBadWith];
      if(target&&chemistryLinks(p,[target]).bad.length) return false;
    }
    return true;
  });
}

const firstDirection = column => column.kind==='number'||column.kind==='chem'?'desc':'asc';
/** Header clicks cycle through the column's natural order, the reverse, then back to roster order. */
export function nextSort(sort, column) {
  if(sort.column!==column.id) return {column:column.id,direction:firstDirection(column)};
  if(sort.direction===firstDirection(column)) return {column:column.id,direction:sort.direction==='asc'?'desc':'asc'};
  return {column:null,direction:null};
}

export function sortPlayers(players, sort, columns, context) {
  const column=columns.find(c=>c.id===sort.column);
  const list=[...players];
  if(!column) return list.sort((a,b)=>a.id-b.id);
  const sign=sort.direction==='desc'?-1:1;
  let compare;
  if(column.kind==='text') compare=(a,b)=>a.name.localeCompare(b.name);
  else if(column.kind==='enum') compare=(a,b)=>String(column.field.enum[a.stats[column.id]]??a.stats[column.id]).localeCompare(String(column.field.enum[b.stats[column.id]]??b.stats[column.id]));
  else if(column.kind==='number') compare=(a,b)=>a.stats[column.id]-b.stats[column.id];
  else {
    const score=new Map(list.map(p=>{const l=chemistryLinks(p,context.chemistryPeers(p));return [p.id,[l.good.length-l.bad.length,l.good.length]];}));
    compare=(a,b)=>{const x=score.get(a.id),y=score.get(b.id);return x[0]-y[0]||x[1]-y[1];};
  }
  return list.sort((a,b)=>sign*compare(a,b)||a.id-b.id);
}
