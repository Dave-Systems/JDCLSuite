/** Static NTSC-U Gecko writes. No code is executed; every import starts from baseline. */
export class GeckoError extends Error {
  constructor(message, line) { super(line ? `Line ${line}: ${message}` : message); this.name = 'GeckoError'; }
}
const MAX_TEXT = 2 * 1024 * 1024;
const MAX_WRITTEN_BYTES = 262144;
const hex = value => '0x' + (0x80000000 + value).toString(16).toUpperCase();

export function parseGecko(text) {
  if (typeof text !== 'string' || !text.trim()) throw new GeckoError('Paste a Gecko Code first.');
  if (text.length > MAX_TEXT) throw new GeckoError('This code is too large. Use a stat patch under 2 MB.');
  const lines = [];
  const titles = [];
  let section = 0;
  for (const [index, source] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const trimmed = source.trim();
    if (!trimmed || /^(#|;|\/\/|\*)/.test(trimmed)) continue;
    if (trimmed.startsWith('$')) { titles.push(trimmed.slice(1).trim().slice(0,100)); section++; continue; }
    if (trimmed.startsWith('[')) throw new GeckoError('Paste the stat code itself, without Dolphin INI sections.', index + 1);
    const code = trimmed.replace(/\s+(?:#|;|\/\/).*$/, '').trim();
    const match = code.match(/^([a-f\d]{8})\s*([a-f\d]{8})$/i);
    if (!match) throw new GeckoError('Expected two 8-digit hexadecimal words.', index + 1);
    lines.push({ a: Number.parseInt(match[1], 16), b: Number.parseInt(match[2], 16), line: index + 1, section });
  }
  if (!lines.length) throw new GeckoError('No Gecko instructions found.');
  const writes = new Map();
  let expandedBytes = 0;
  let instructions = 0;
  const put = (address, value, width, line) => {
    expandedBytes += width;
    if (expandedBytes > MAX_WRITTEN_BYTES) throw new GeckoError('Expanded writes exceed the 256 KB stat-patch limit.', line);
    if (address < 0 || address + width > 0x02000000) throw new GeckoError('A write exceeds the supported address range.', line);
    for (let j=0;j<width;j++) writes.set(address+j, { value: (value >>> (8*(width-j-1))) & 255, line });
  };
  for (let i=0;i<lines.length;i++) {
    const {a,b,line,section:codeSection} = lines[i];
    if (a === 0xE0000000 && b === 0x80008000) continue;
    if (a === 0xF0000000 && b === 0) {
      if (i !== lines.length-1) throw new GeckoError('Instructions after an end-of-code marker are not supported.', line);
      break;
    }
    const type = (a >>> 24) & 0xFE;
    const address = a & 0x01FFFFFF;
    instructions++;
    if (type === 0 || type === 2) {
      const width = type === 0 ? 1 : 2;
      const count = (b >>> 16) + 1;
      if(type === 0 && (b & 0xFF00)) throw new GeckoError('Invalid 8-bit fill: the reserved byte must be 00.',line);
      for(let n=0;n<count;n++) put(address+n*width,b,width,line);
    } else if (type === 4) {
      put(address,b,4,line);
    } else if (type === 6) {
      if (b === 0 || b > MAX_WRITTEN_BYTES) throw new GeckoError('Invalid or oversized block-write length.',line);
      const payloadLines = Math.ceil(b/8);
      if (i + payloadLines >= lines.length) throw new GeckoError(`Truncated block: expected ${payloadLines} payload line(s).`,line);
      for(let n=0;n<payloadLines;n++) {
        const payload = lines[++i];
        if(payload.section!==codeSection) throw new GeckoError('Truncated block: its payload crosses into another named code.',line);
        const values = [payload.a,payload.b];
        for(let j=0;j<8 && n*8+j<b;j++) put(address+n*8+j,(values[Math.floor(j/4)] >>> (24-(j%4)*8)) & 255,1,line);
      }
    } else if (type === 8) {
      const spec = lines[++i];
      if (!spec) throw new GeckoError('Serial write is missing its parameter line.',line);
      if(spec.section!==codeSection) throw new GeckoError('Serial parameters cross into another named code.',line);
      const size = spec.a >>> 28;
      if (size > 2) throw new GeckoError('Serial write size must be 0, 1, or 2.',spec.line);
      const count = ((spec.a >>> 16) & 0xFFF) + 1;
      const stride = spec.a & 0xFFFF;
      for(let n=0;n<count;n++) put(address+n*stride,(b+n*spec.b)>>>0,2**size,line);
    } else {
      throw new GeckoError(`Unsupported instruction ${a.toString(16).padStart(8,'0').slice(0,2).toUpperCase()}. Use a static stat patch (00, 02, 04, 06 or 08). Conditional, pointer and assembly codes cannot be inspected safely.`,line);
    }
  }
  if (!instructions || !writes.size) throw new GeckoError('This code contains no static writes.');
  return { writes, instructions, codeLines: lines.length, title: titles.filter(Boolean).join(' + ') || 'Custom Gecko Code' };
}

const extraGroups = [
  {key:'windupCharge',label:'Charge windup',region:'pitchingWindup',index:0,source:'pitching',sourceIndex:0},
  {key:'windupStar',label:'Star pitch windup',region:'pitchingWindup',index:1,source:'pitching',sourceIndex:1},
  {key:'windupCurve',label:'Curve windup',region:'pitchingWindup',index:2,source:'pitching',sourceIndex:2},
  {key:'changeupMultiplier',label:'Change-up speed multiplier',region:'changeup',index:0,source:'pitching',sourceIndex:3},
  {key:'changeupHeight',label:'Change-up height',region:'changeup',index:1,source:'pitching',sourceIndex:4},
  {key:'gameplayScale',label:'Gameplay size',region:'sizeScale',index:0,source:'size',sourceIndex:0},
  {key:'menuScale',label:'Selection-screen size',region:'sizeScale',index:1,source:'size',sourceIndex:1},
  ...['Catch range','Catch range facing away','Catch parameter 3 (unknown)','Catch height','Catch parameter 5 (unknown)','Catch parameter 6 (unknown)','Dive range','Catch parameter 8 (unknown)','Jump range','Catch parameter 10 (unknown)'].map((label,index)=>({key:`catch${index}`,label,region:'catchRange',index,source:'size',sourceIndex:index+2})),
  {key:'hitboxWidth',label:'Hitbox width',region:'hitbox',index:0,source:'size',sourceIndex:12},
  {key:'hitboxHeight',label:'Hitbox height',region:'hitbox',index:1,source:'size',sourceIndex:13},
];

export function createModel(baseline, schema) {
  const extraFields = extraGroups.map(f=>{
    const region = schema.regions.find(r=>r.key===f.region);
    return {...f,baseOffset:region.baseOffset,stride:region.stride,offset:f.index*4,bytes:4,type:'f32',enum:null};
  });
  const fields = [...schema.statFields,...extraFields];
  const memory = new Map();
  const bytes = new DataView(new ArrayBuffer(4));
  const encode = (address,value,width,type) => {
    if(type==='f32') bytes.setFloat32(0,value,false);
    else if(width===2) bytes.setUint16(0,value,false);
    else bytes.setUint8(0,value);
    for(let i=0;i<width;i++) memory.set(address+i,bytes.getUint8(i));
  };
  for(const p of baseline.roster) {
    for(const f of fields) encode(f.baseOffset + p.id*f.stride + f.offset,f.source?p[f.source][f.sourceIndex]:p.stats[f.key],f.bytes,f.type);
    p.chemistry.forEach((v,id)=>memory.set(schema.chemistry.baseOffset+p.id*schema.chemistry.rowStride+id,v));
  }
  function materialize(writes = new Map()) {
    const read = (address,width,type) => {
      for(let i=0;i<width;i++) bytes.setUint8(i,writes.has(address+i)?writes.get(address+i).value:memory.get(address+i));
      return type==='f32'?bytes.getFloat32(0,false):width===2?bytes.getUint16(0,false):bytes.getUint8(0);
    };
    return baseline.roster.map(p=>({
      id:p.id,name:p.name,kind:p.kind,playable:p.playable,variantGroup:p.variantGroup,
      stats:Object.fromEntries(fields.map(f=>[f.key,read(f.baseOffset+p.id*f.stride+f.offset,f.bytes,f.type)])),
      chemistry:p.chemistry.map((_,id)=>read(schema.chemistry.baseOffset+p.id*schema.chemistry.rowStride+id,1,'u8')),
      changes:[],chemistryChanges:[],
    }));
  }
  const vanilla = materialize();
  const main = schema.regions.find(r=>r.key==='statsAndChemistry');
  // Bytes the Stat Editor's generator writes to fill whole 4-byte words but no field reads:
  // each 142-byte record starts 00 00 <id> (including the word after the last record), and
  // tables that end mid-word are padded with zeros up to the word boundary.
  const fieldTables = schema.regions.filter(r=>r!==main && fields.some(f=>f.baseOffset===r.baseOffset));
  function fillerValue(address) {
    const relative = address-main.baseOffset;
    if(relative>=0 && relative<=main.endOffset-main.baseOffset+3 && relative%main.stride<3) return relative%main.stride<2?0:Math.floor(relative/main.stride);
    if(fieldTables.some(r=>address>r.endOffset && address<=(r.endOffset|3))) return 0;
  }
  return {
    fields,
    vanilla,
    apply(text) {
      const parsed = parseGecko(text);
      const roster = materialize(parsed.writes);
      const unknown = [];
      let modeledBytes = 0;
      let paddingBytes = 0;
      for(const [address,write] of parsed.writes) {
        if(memory.has(address)) modeledBytes++;
        else if(fillerValue(address)===write.value) paddingBytes++;
        else unknown.push({address,line:write.line,region:schema.regions.find(r=>address>=r.baseOffset && address<=r.endOffset)?.key});
      }
      if(!modeledBytes) throw new GeckoError('No supported character stat or chemistry addresses found. Check that this is an NTSC-U Sluggers stat patch.');
      let statChanges = 0;
      let chemistryChanges = 0;
      const warnings = [];
      for(const p of roster) {
        const original = vanilla[p.id];
        for(const f of fields) {
          const value = p.stats[f.key];
          if(!Number.isFinite(value)) throw new GeckoError(`${p.name}: ${f.label} is not a finite number.`);
          if(value!==original.stats[f.key]) {
            p.changes.push({key:f.key,label:f.label,from:original.stats[f.key],to:value});
            statChanges++;
            if(f.enum && !f.enum[value]) warnings.push(`${p.name}: ${f.label} uses unknown value ${value}.`);
          }
        }
        p.chemistry.forEach((value,id)=>{
          if(value!==original.chemistry[id]) {p.chemistryChanges.push({id,from:original.chemistry[id],to:value});chemistryChanges++;}
          if(value>2) warnings.push(`${p.name} → ${roster[id].name}: unknown chemistry value ${value}.`);
        });
      }
      if(unknown.length) {
        const examples = [...new Set(unknown.map(u=>`${hex(u.address)}${u.region?' ('+u.region+')':''}`))].slice(0,4);
        warnings.unshift(`${unknown.length} byte(s) fall outside the supported character tables and were not modeled: ${examples.join(', ')}. These may affect gameplay beyond the stats shown.`);
      }
      return {roster,report:{title:parsed.title,instructions:parsed.instructions,codeLines:parsed.codeLines,modeledBytes,paddingBytes,unmodeledBytes:unknown.length,statChanges,chemistryChanges,changedPlayers:roster.filter(p=>p.playable&&(p.changes.length||p.chemistryChanges.length)).length,warnings}};
    },
  };
}

export function formatStat(field,value) {
  if(field.enum) return field.enum[value] ?? `Unknown (${value})`;
  return Number.isInteger(value)?String(value):Number(value.toFixed(4)).toString();
}
