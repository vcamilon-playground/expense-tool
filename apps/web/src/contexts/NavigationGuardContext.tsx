'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type NavigationGuard = {
  save: () => Promise<void>;
};

type Ctx = {
  guard: NavigationGuard | null;
  setGuard: (g: NavigationGuard | null) => void;
};

const NavigationGuardContext = createContext<Ctx>({ guard: null, setGuard: () => {} });

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<NavigationGuard | null>(null);
  return (
    <NavigationGuardContext.Provider value={{ guard, setGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
