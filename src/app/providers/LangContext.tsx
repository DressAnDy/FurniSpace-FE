import { useState, type ReactNode } from 'react';

import { LangContext, type Lang } from './useLang';

const LANG_STORAGE_KEY = 'furnispace.lang';

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') return stored;
  } catch {
    // ignore storage access errors
  }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage access errors
    }
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}
