import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const GroundContext = createContext({ ground: 'night', setGround: () => {}, toggle: () => {} });

const STORAGE_KEY = 'coddex.ground';

const readInitial = () => {
  if (typeof window === 'undefined') return 'night';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'night' || stored === 'day') return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'day' : 'night';
};

export function GroundProvider({ children }) {
  const [ground, setGround] = useState(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-ground', ground);
    window.localStorage.setItem(STORAGE_KEY, ground);
  }, [ground]);

  const toggle = useCallback(
    () => setGround((g) => (g === 'night' ? 'day' : 'night')),
    []
  );

  return (
    <GroundContext.Provider value={{ ground, setGround, toggle }}>{children}</GroundContext.Provider>
  );
}

export const useGround = () => useContext(GroundContext);
