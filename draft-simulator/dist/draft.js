export function createDraft({names,rosterSize,order,playerIds}) {
  if(!Array.isArray(names)||names.length<2||names.length>8) throw new Error('Choose between 2 and 8 teams.');
  if(![9,12].includes(rosterSize)) throw new Error('Choose 9 or 12 players per team.');
  if(!['snake','linear'].includes(order)) throw new Error('Choose a valid pick order.');
  if(!Array.isArray(playerIds)||new Set(playerIds).size!==playerIds.length||!playerIds.every(Number.isInteger)) throw new Error('The player pool is invalid.');
  if(names.length*rosterSize>playerIds.length) throw new Error(`${names.length} teams need ${names.length*rosterSize} players, but the pool has ${playerIds.length}. Include Miis, choose fewer teams, or reduce team size.`);
  const teamNames=names.map((name,i)=>String(name).trim().slice(0,32)||`Team ${i+1}`);
  if(new Set(teamNames.map(n=>n.toLowerCase())).size!==teamNames.length) throw new Error('Give each team a different name.');
  return {names:teamNames,rosterSize,order,playerIds:[...playerIds],picks:[]};
}
export function currentTurn(draft) {
  if(!draft || draft.picks.length>=draft.names.length*draft.rosterSize) return null;
  const round=Math.floor(draft.picks.length/draft.names.length);
  const position=draft.picks.length%draft.names.length;
  return {round:round+1,pick:draft.picks.length+1,team:draft.order==='snake'&&round%2?draft.names.length-position-1:position};
}
export function pickPlayer(draft,id) {
  const turn=currentTurn(draft);
  if(!turn) throw new Error('Start a draft with open roster spots first.');
  if(!Number.isInteger(id)||!draft.playerIds.includes(id)) throw new Error('This player is not in the draft pool.');
  if(draft.picks.some(p=>p.id===id)) throw new Error('This player has already been drafted.');
  return {...draft,picks:[...draft.picks,{id,team:turn.team,round:turn.round,pick:turn.pick}]};
}
export function undoPick(draft) {
  if(!draft||!draft.picks.length) throw new Error('There are no picks to undo.');
  return {...draft,picks:draft.picks.slice(0,-1)};
}
export function teamChemistry(players) {
  let good=0,bad=0;
  for(const p of players) for(const q of players) if(p.id!==q.id) {
    if(p.chemistry[q.id]===2) good++;
    if(p.chemistry[q.id]===0) bad++;
  }
  return {good,bad};
}
