export const THEME_KEY='jdcl-theme';

export function readTheme(storage=globalThis.localStorage) {
  try {
    return storage?.getItem(THEME_KEY)==='light'?'light':'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme,{document:doc=globalThis.document,storage=globalThis.localStorage}={}) {
  const next=theme==='light'?'light':'dark';
  if(doc?.documentElement) {
    doc.documentElement.dataset.theme=next;
    doc.documentElement.style.colorScheme=next;
  }
  try {storage?.setItem(THEME_KEY,next);} catch {}
  return next;
}

export function toggleTheme(current,env) {
  return applyTheme(current==='light'?'dark':'light',env);
}
