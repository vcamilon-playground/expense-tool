'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { shouldRefreshOnResume } from '@/lib/data-refresh';

type DataRefreshContextValue = {
  refreshKey: number;
  triggerRefresh: () => void;
};

const DataRefreshContext = createContext<DataRefreshContextValue>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

// Provides a `refreshKey` that pages add to their data-loading effect deps so
// they refetch when it changes. Navigating between modules already refetches
// (App Router remounts each page), so this only adds the resume case: when the
// tab/PWA is brought back to the foreground after being hidden long enough that
// its data is likely stale, the key bumps and every mounted page reloads.
export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const hiddenAtRef = useRef<number | null>(null);

  const triggerRefresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (shouldRefreshOnResume(hiddenAt, Date.now())) {
        triggerRefresh();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [triggerRefresh]);

  return (
    <DataRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  return useContext(DataRefreshContext);
}
