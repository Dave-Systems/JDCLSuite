import {createModel,formatStat,parseGecko} from './gecko.js';
import {createDraft,currentTurn,pickPlayer,undoPick,teamChemistry} from './draft.js';
import {loadLivePatch} from './live-patch.js';

const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let model,roster=[],draft=null,report=null,selectedId=null,ready=false;
let activeName='Vanilla',activeCode=null,stagedSource=null,inputRevision=0;
let pendingConfirm=null;
const classNames=['Balanced','Power','Speed','Technique'];
const classColors=['#47699b','#a64442','#327963','#805698'];
const eligible=()=>roster.filter(p=>p.playable&&($('include-miis').checked||p.kind!=='mii'));
const delta=(value,old)=>value===old?'':`<span class="delta ${value<old?'negative':''}">${value>old?'+':''}${Number((value-old).toFixed(4))}</span>`;
function notice(message,type='') { $('notice').textContent=message;$('notice').className=`notice ${type}`;$('notice').hidden=!message; }
function safe(action) {return (...args)=>{try{const result=action(...args);if(result?.catch)result.catch(e=>notice(e.message,'error'));return result;}catch(e){notice(e.message,'error');}};}
function confirmReset(action,message='This clears the current picks. Your applied stats stay loaded.',{title='Reset this draft?',accept='Reset draft'}={}) {
  if(!draft?.picks.length){action();return;}
  pendingConfirm=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-accept').textContent=accept;$('confirm-dialog').showModal();
}
function clearDraft(){draft=null;render();}
function sourceStatus() {
  const applied=activeCode!==null&&$('gecko-code').value===activeCode;
  let source='Pasted or edited Gecko Code';
  if(stagedSource) {
    const label=escape(stagedSource.sourceLabel);
    source=`<strong>${label}</strong><br>${stagedSource.sourceUrl?`<a href="${escape(stagedSource.sourceUrl)}" target="_blank" rel="noreferrer">${escape(stagedSource.sourcePath)}</a>`:escape(stagedSource.sourcePath)}`;
    if(stagedSource.loadedAt)source+=`<br>Read at ${escape(new Date(stagedSource.loadedAt).toLocaleTimeString())}`;
  }
  $('source-status').innerHTML=`${source}<span class="pending">${applied?'Applied to the roster.':$('gecko-code').value.trim()?'In the loader only · click Apply code to use these stats.':'Paste a code or reload the live ParPatch.'}</span>`;
}
async function stageLive() {
  const revision=++inputRevision;
  $('load-sample').disabled=true;$('load-sample').textContent='Reading JDCLSuite…';
  try {
    const result=await loadLivePatch();
    parseGecko(result.code);
    if(revision!==inputRevision)return;
    $('gecko-code').value=result.code;stagedSource=result;sourceStatus();
    $('import-panel').open=true;
    notice('Live JDCLSuite ParPatch is in the loader. Click Apply code to update the roster.');
  } catch(e) {
    if(revision===inputRevision){notice(e.message,'error');$('source-status').textContent='Live ParPatch unavailable. Paste your Gecko Code or try reloading. No saved copy was substituted.';}
  } finally {$('load-sample').disabled=false;$('load-sample').textContent='Reload live ParPatch';}
}
function applyCode() {
  if(!model)throw new Error('The baseline roster is still loading.');
  const code=$('gecko-code').value;
  const result=model.apply(code);
  const source=stagedSource;
  confirmReset(()=>{
    roster=result.roster;report=result.report;draft=null;ready=true;activeCode=code;
    activeName=source?.filename?source.filename.replace(/\.txt$/i,''):report.title;
    if(source?.source==='local'||source?.source==='github')activeName+=' · JDCLSuite';
    sourceStatus();render();
    notice(`${activeName} applied: ${report.statChanges} stat changes and ${report.chemistryChanges} chemistry changes.${report.warnings.length?' Some writes could not be fully modeled; review the import details.':''}`,report.warnings.length?'warn':'');
  },'Applying this code starts a fresh roster and clears the current draft picks.',{title:'Apply code and reset the draft?',accept:'Apply code'});
}
function chooseVanilla(){if(!model)return;confirmReset(()=>{roster=model.vanilla;report=null;draft=null;ready=true;activeName='Vanilla';activeCode=null;sourceStatus();render();notice('Vanilla stats selected. The code in the loader has not been applied.');},'Using vanilla stats clears the current draft picks.',{title:'Use vanilla stats and reset the draft?',accept:'Use vanilla stats'});}
function renderTeamNames() {
  const old=[...document.querySelectorAll('.team-name')].map(e=>e.value);
  $('team-names').innerHTML=Array.from({length:Number($('team-count').value)},(_,i)=>`<label>Team ${i+1} name<input class="team-name" aria-label="Team ${i+1} name" maxlength="32" value="${escape(old[i]||`Team ${i+1}`)}"></label>`).join('');
}
function startDraft() {
  if(!ready)throw new Error('Apply the code or select Use vanilla stats before starting a draft.');
  renderTeamNames();
  draft=createDraft({names:[...document.querySelectorAll('.team-name')].map(e=>e.value),rosterSize:Number($('roster-size').value),order:$('draft-order').value,playerIds:eligible().map(p=>p.id)});
  $('import-panel').open=false;notice('');render();
  $('on-clock').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
function doPick(id) {
  const player=roster.find(p=>p.id===id);
  const turn=currentTurn(draft);
  draft=pickPlayer(draft,id);
  if($('player-dialog').open)$('player-dialog').close();
  render();
  const next=currentTurn(draft);
  notice(`${draft.names[turn.team]} picked ${player.name}. ${next?`${draft.names[next.team]} picks next.`:'The draft is complete.'}`);
  return {player:player.name,team:draft.names[turn.team],nextTeam:next?draft.names[next.team]:null,complete:!next};
}
function renderReport() {
  $('patch-badge').textContent=ready?`${activeName}${report?.warnings.length?' · partial coverage':''}`:'Vanilla · no code applied';
  $('import-summary').textContent=report?`${report.statChanges} stats · ${report.chemistryChanges} chemistry`:ready?'Vanilla selected':'Apply a code to begin';
  $('import-report').hidden=!report;
  if(!report)return;
  $('import-report').innerHTML=`<p>${report.codeLines} code lines · ${report.instructions} instructions · ${report.changedPlayers} playable characters changed</p>${report.warnings.length?`<details open><summary>${report.warnings.length} import warning(s)</summary><ul>${report.warnings.slice(0,30).map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}`;
}
function renderTable() {
  const used=new Map(draft?.picks.map(p=>[p.id,p.team])||[]);
  const pool=eligible();
  const search=$('search').value.trim().toLowerCase();
  const sort=$('sort-by').value;
  const list=pool.filter(p=>(!used.has(p.id)||$('show-drafted').checked)&&(!search||p.name.toLowerCase().includes(search))&&($('class-filter').value==='all'||classNames[p.stats.class]===$('class-filter').value)&&(!$('changed-only').checked||p.changes.length||p.chemistryChanges.length));
  list.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='id'?a.id-b.id:(b.stats[sort]-a.stats[sort])||a.id-b.id);
  $('pool-count').textContent=`${pool.length-used.size} available`;
  $('changed-count').textContent=report?`${pool.filter(p=>p.changes.length||p.chemistryChanges.length).length} patched`:'';
  const turn=currentTurn(draft);
  $('player-table').innerHTML=list.map(p=>{
    const initials=p.name.split(/\s+/).filter(w=>!w.startsWith('(')).slice(0,2).map(w=>w[0]).join('');
    const changed=p.changes.length||p.chemistryChanges.length;
    return `<tr${used.has(p.id)?' class="drafted"':''}><td><button class="player-name" data-inspect="${p.id}" aria-label="Inspect ${escape(p.name)}"><span class="player-avatar" style="--avatar-bg:${classColors[p.stats.class]||'#476070'}" aria-hidden="true">${escape(initials)}</span><span><span class="player-label">${escape(p.name)}${changed?'<span class="patch-dot" aria-label="Patched">◆</span>':''}</span><span class="player-subtitle">${escape(classNames[p.stats.class]||`Class ${p.stats.class}`)}${p.stats.captain?' · Captain':''}</span></span></button></td>${['slapPower','chargePower','speed','displayPitching'].map(key=>`<td>${p.stats[key]}${delta(p.stats[key],model.vanilla[p.id].stats[key])}</td>`).join('')}<td>${used.has(p.id)?`<span class="small">${escape(draft.names[used.get(p.id)])}</span>`:`<button class="pick-button" data-pick="${p.id}" ${!turn?'disabled':''} aria-label="Pick ${escape(p.name)}${turn?` for ${escape(draft.names[turn.team])}`:''}">Pick +</button>`}</td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty-state">No players match these filters. Try a different name or clear the filters.</td></tr>';
}
function renderDraft() {
  const turn=currentTurn(draft);
  const total=draft?draft.names.length*draft.rosterSize:0;
  for(const e of document.querySelectorAll('.config-panel input,.config-panel select'))e.disabled=!!draft;
  $('start-draft').disabled=!ready||!!draft;
  $('start-draft').innerHTML=draft?'Draft started':'Start draft <span aria-hidden="true">↗</span>';
  $('undo').disabled=!draft?.picks.length;$('reset').disabled=!draft;
  $('draft-progress').style.width=draft?`${draft.picks.length/total*100}%`:'0%';
  $('draft-phase').textContent=!draft?'SCOUTING':turn?`ROUND ${turn.round} OF ${draft.rosterSize} · PICK ${turn.pick} OF ${total}`:'DRAFT COMPLETE';
  $('on-clock').textContent=!draft?'The board is yours.':turn?`${draft.names[turn.team]} is on the clock.`:'The teams are set.';
  $('draft-subtitle').textContent=!draft?'Apply your code, compare the roster, and make your picks.':turn?'Choose a player from the pool to add them to this team.':`${total} players drafted across ${draft.names.length} teams. Inspect any player to review their stats.`;
  $('turn-badge').textContent=!draft?'Choose your teams above':turn?`${draft.picks.length} / ${total} picked`:`${draft.names.length} full rosters`;
  $('setup-note').textContent=`${$('roster-size').value} rounds. ${$('draft-order').value==='snake'?'The pick order reverses each round.':'Teams pick in the same order each round.'} ${eligible().length} players in the pool.`;
  if(!draft){$('team-rosters').innerHTML='<div class="empty-rosters"><span class="empty-number">09</span><h3>Every pick counts.</h3><p>Your teams and their chemistry will appear here when the draft begins.</p></div>';return;}
  $('team-rosters').innerHTML=draft.names.map((name,index)=>{
    const picks=draft.picks.filter(p=>p.team===index);
    const chem=teamChemistry(picks.map(p=>roster[p.id]));
    return `<section class="team-card${turn?.team===index?' active':''}"><div class="team-title"><h3>${escape(name)}</h3><span>${picks.length} / ${draft.rosterSize}</span></div>${picks.length?`<ol class="team-players">${picks.map((pick,n)=>`<li><button data-inspect="${pick.id}"><span class="pick-index">${n+1}.</span>${escape(roster[pick.id].name)}</button><span class="small muted">#${pick.pick}</span></li>`).join('')}</ol>`:'<p class="empty-team">Waiting for the first pick.</p>'}<div class="team-meta" title="Directional chemistry links between different teammates; reciprocal relationships count twice."><span class="positive">${chem.good} good links</span><span class="negative">${chem.bad} bad links</span></div></section>`;
  }).join('');
}
function render() {
  if(!model)return;
  renderReport();renderDraft();renderTable();
}
function inspectPlayer(id) {
  const p=roster.find(p=>p.id===id&&p.playable);
  if(!p)throw new Error('Player not found.');
  selectedId=id;
  $('player-detail-title').textContent=p.name;
  $('player-detail-class').textContent=`${classNames[p.stats.class]||`Class ${p.stats.class}`} ${p.stats.captain?'· Captain':''} · ${p.changes.length} stat changes`;
  const original=model.vanilla[id];
  const statRow=f=>`<div class="detail-stat${p.stats[f.key]!==original.stats[f.key]?' changed':''}"><span>${escape(f.label)}</span><span>${p.stats[f.key]!==original.stats[f.key]?`<span class="small muted">${escape(formatStat(f,original.stats[f.key]))} → </span>`:''}${escape(formatStat(f,p.stats[f.key]))}</span></div>`;
  const chemTags=value=>roster.filter(q=>q.playable&&p.chemistry[q.id]===value).map(q=>`<span class="chem-tag${value===0?' bad':''}">${escape(q.name)}${q.id===p.id?' (self)':''}${p.chemistryChanges.some(c=>c.id===q.id)?' ◆':''}</span>`).join('')||'<span class="small muted">None</span>';
  const drafted=draft?.picks.find(p=>p.id===id);
  const turn=currentTurn(draft);
  $('player-detail-body').innerHTML=`<div class="detail-highlights">${[['displayBatting','Batting'],['displayPitching','Pitching'],['displayFielding','Fielding'],['displaySpeed','Running']].map(([key,label])=>`<div class="detail-highlight"><b>${p.stats[key]}</b><span>${label} / 10</span>${delta(p.stats[key],original.stats[key])}</div>`).join('')}</div><p class="small muted">Highlighted values show vanilla → patched. Displayed ratings are separate from the raw stats below.</p><div class="detail-grid">${model.fields.filter(f=>!f.source).map(statRow).join('')}</div><details class="methodology"><summary>Size, catch range and pitch timing</summary><div class="detail-grid">${model.fields.filter(f=>f.source).map(statRow).join('')}</div></details><section class="chem-section"><h3>Chemistry toward other players</h3><p>◆ Changed by this patch. Direction matters; the other player's relationship may differ.</p><div class="chem-tags">${chemTags(2)}</div><div class="chem-tags">${chemTags(0)}</div>${p.chemistryChanges.length?`<details><summary class="small">All ${p.chemistryChanges.length} chemistry changes</summary><ul class="change-list">${p.chemistryChanges.map(c=>`<li>${escape(roster[c.id].name)}: ${escape(['Bad','Neutral','Good'][c.from]??c.from)} → ${escape(['Bad','Neutral','Good'][c.to]??`Unknown (${c.to})`)}</li>`).join('')}</ul></details>`:''}</section><div class="detail-actions"><span>${drafted?`Drafted by ${escape(draft.names[drafted.team])}`:turn?`Next pick: ${escape(draft.names[turn.team])}`:draft?'The draft is complete.':'Start the draft to pick this player.'}</span><button class="primary" data-pick="${id}" ${drafted||!turn||!draft.playerIds.includes(id)?'disabled':''}>Draft player</button></div>`;
  if(!$('player-dialog').open)$('player-dialog').showModal();
  return p;
}

$('apply-code').addEventListener('click',safe(applyCode));
$('load-sample').addEventListener('click',safe(stageLive));
$('use-vanilla').addEventListener('click',chooseVanilla);
$('gecko-code').addEventListener('input',()=>{inputRevision++;stagedSource=null;sourceStatus();});
$('code-file').addEventListener('change',safe(async event=>{
  const file=event.target.files[0];if(!file)return;
  const revision=++inputRevision;
  if(file.size>2*1024*1024)throw new Error('Choose a stat patch under 2 MB.');
  const text=await file.text();if(revision!==inputRevision)return;
  $('gecko-code').value=text;stagedSource={filename:file.name,sourceLabel:'Selected text file',sourcePath:file.name};sourceStatus();notice('File added to the loader. Click Apply code to use it.');event.target.value='';
}));
$('team-count').addEventListener('change',()=>{renderTeamNames();render();});
for(const id of ['roster-size','draft-order','include-miis'])$(id).addEventListener('change',render);
for(const id of ['search','sort-by','class-filter','changed-only','show-drafted'])$(id).addEventListener(id==='search'?'input':'change',renderTable);
$('start-draft').addEventListener('click',safe(startDraft));
$('undo').addEventListener('click',safe(()=>{draft=undoPick(draft);render();notice('Last pick undone.');}));
$('reset').addEventListener('click',()=>confirmReset(()=>{clearDraft();notice('Draft reset. Your applied roster is ready for new teams.');}));
$('confirm-cancel').addEventListener('click',()=>{pendingConfirm=null;$('confirm-dialog').close();});
$('confirm-dialog').addEventListener('cancel',()=>{pendingConfirm=null;});
$('confirm-accept').addEventListener('click',safe(()=>{const action=pendingConfirm;pendingConfirm=null;$('confirm-dialog').close();action?.();}));
$('close-detail').addEventListener('click',()=>$('player-dialog').close());
document.addEventListener('click',safe(event=>{
  const inspect=event.target.closest('[data-inspect]');if(inspect)inspectPlayer(Number(inspect.dataset.inspect));
  const pick=event.target.closest('[data-pick]');
  if(pick&&!pick.disabled){
    // Re-rendering replaces the pool rows, so keep keyboard focus at the same row position.
    const row=[...$('player-table').rows].findIndex(r=>r.querySelector(`[data-inspect="${pick.dataset.pick}"]`));
    doPick(Number(pick.dataset.pick));
    if(row>=0){
      const rows=$('player-table').rows,next=rows[Math.min(row,rows.length-1)];
      (next?.querySelector('[data-pick]:not([disabled])')||next?.querySelector('[data-inspect]')||$('search')).focus();
    }
  }
}));
window.addEventListener('beforeunload',event=>{if(draft?.picks.length){event.preventDefault();event.returnValue='';}});

// Optional browser agent tools reuse the visible state; applying a code stays an explicit UI action.
function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const definitions=[
    {name:'read_draft_room',description:'Read the active patch, draft turn and team rosters. Code in the loader is not automatically applied.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({activePatch:ready?activeName:null,pendingCode:!!$('gecko-code').value.trim()&&$('gecko-code').value!==activeCode,turn:currentTurn(draft),draft})},
    {name:'inspect_draft_player',description:'Open a player inspector and read their current stats, changes and directional chemistry.',inputSchema:{type:'object',properties:{playerId:{type:'integer'}},required:['playerId'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(!Number.isInteger(input?.playerId))throw new Error('playerId must be an integer.');return inspectPlayer(input.playerId);}},
    {name:'draft_player',description:'Complete one pick for the team currently on the clock, using the applied roster. A draft must already be started.',inputSchema:{type:'object',properties:{playerId:{type:'integer'}},required:['playerId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!Number.isInteger(input?.playerId))throw new Error('playerId must be an integer.');return doPick(input.playerId);}},
  ];
  for(const definition of definitions){try{Promise.resolve(context.registerTool(definition,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

async function init(){
  try {
    const [baseline,schema]=await Promise.all(['data/baseline.json','data/schema.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('The baseline roster could not be loaded. Reload the page to try again.');return r.json();}));
    model=createModel(baseline,schema);roster=model.vanilla;$('apply-code').disabled=false;renderTeamNames();render();registerTools();
  } catch(e){notice(e.message,'error');$('player-table').innerHTML='<tr><td colspan="6" class="empty-state">Roster data unavailable. Reload to try again.</td></tr>';}
}
void init();
void stageLive();
