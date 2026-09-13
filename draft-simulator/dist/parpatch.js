export const PAR_PATCH_FILE=/^ParPatchv[\d.]+\.txt$/i;

export function newestParPatchName(names) {
  return names.filter(name=>PAR_PATCH_FILE.test(name)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))[0]??null;
}
