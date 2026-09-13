import {currentTurn} from './draft.js';

export function canExportDraft(draft) {
  return !!draft && draft.picks.length===draft.names.length*draft.rosterSize && !currentTurn(draft);
}

export function createDraftExport({draft,roster,patchName='Vanilla',exportedAt=new Date().toISOString()}) {
  if(!canExportDraft(draft))throw new Error('Finish drafting all teams before exporting.');
  const byId=new Map(roster.map(player=>[player.id,player]));
  return {
    version:1,
    exportedAt,
    patchName,
    order:draft.order,
    rosterSize:draft.rosterSize,
    teams:draft.names.map((name,index)=>({
      name,
      players:draft.picks.filter(pick=>pick.team===index).map(pick=>{
        const player=byId.get(pick.id);
        if(!player)throw new Error(`Player ${pick.id} is missing from the roster.`);
        return {id:player.id,name:player.name,round:pick.round,pick:pick.pick};
      }),
    })),
  };
}

function csvCell(value) {
  let text=String(value);
  // Treat user-entered names as text when opened in spreadsheet software.
  if(typeof value==='string'&&/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text))text="'"+text;
  return `"${text.replace(/"/g,'""')}"`;
}

export function formatDraftExport(data,format) {
  const basename=`jdcl-teams-${data.exportedAt.replace(/[:.]/g,'-')}`;
  let content,type;
  if(format==='txt') {
    type='text/plain;charset=utf-8';
    content=[
      'JDCL Draft Room — Completed teams',
      `Exported: ${data.exportedAt}`,
      `Applied stats: ${data.patchName}`,
      `Draft: ${data.order==='snake'?'Snake':'Linear'} · ${data.teams.length} teams · ${data.rosterSize} players per team`,
      '',
      ...data.teams.flatMap(team=>[
        team.name,
        ...team.players.map((player,index)=>`${index+1}. ${player.name} (round ${player.round}, pick #${player.pick})`),
        '',
      ]),
    ].join('\n');
  } else if(format==='csv') {
    type='text/csv;charset=utf-8';
    const rows=[['Team','Roster slot','Player','Player ID','Round','Overall pick','Draft order','Players per team','Applied stats','Exported at']];
    for(const team of data.teams)team.players.forEach((player,index)=>rows.push([
      team.name,index+1,player.name,player.id,player.round,player.pick,data.order,data.rosterSize,data.patchName,data.exportedAt,
    ]));
    content='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
  } else if(format==='json') {
    type='application/json;charset=utf-8';
    content=JSON.stringify(data,null,2)+'\n';
  } else throw new Error('Choose text, CSV, or JSON for the export.');
  return {content,type,filename:`${basename}.${format}`};
}

// Keep export controls separate from drafting, filtering, and roster rendering.
export function setupDraftExport(getState,notice) {
  const $=id=>document.getElementById(id);
  let snapshot=null;
  const attempt=action=>()=>{try{action();}catch(error){notice(error.message,'error');}};
  const preview=()=>{
    const file=formatDraftExport(snapshot,$('export-format').value);
    $('export-preview').value=file.content;
    $('export-download').textContent=`Download .${$('export-format').value}`;
    return file;
  };
  $('export-teams').addEventListener('click',attempt(()=>{
    snapshot=createDraftExport(getState());
    preview();
    $('export-dialog').showModal();
  }));
  $('export-format').addEventListener('change',attempt(preview));
  $('export-close').addEventListener('click',()=>$('export-dialog').close());
  $('export-download').addEventListener('click',attempt(()=>{
    if(!canExportDraft(getState().draft))throw new Error('Finish drafting all teams before exporting.');
    const file=preview();
    const url=URL.createObjectURL(new Blob([file.content],{type:file.type}));
    const link=document.createElement('a');
    link.href=url;link.download=file.filename;
    document.body.append(link);
    try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    notice(`Export download started: ${file.filename}`);
  }));
  return ()=>{
    const complete=canExportDraft(getState().draft);
    $('export-teams').disabled=!complete;
    $('export-teams').title=complete?'Save the completed team rosters':'Available once all teams are drafted';
    if(!complete&&$('export-dialog').open)$('export-dialog').close();
  };
}
