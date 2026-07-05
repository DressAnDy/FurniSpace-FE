import { createContext, useContext } from 'react';

export type Lang = 'vi' | 'en';

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
});

export function useLang() {
  return useContext(LangContext);
}
