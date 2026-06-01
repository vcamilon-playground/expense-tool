'use client';

import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export function useSortState<T extends string>(defaultKey: T, defaultDir: SortDir = 'asc') {
  const [col, setCol] = useState<T>(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);

  function handleSort(key: T) {
    if (col === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setCol(key);
      setDir('asc');
    }
  }

  return { sortCol: col, sortDir: dir, handleSort };
}

export function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  const active = col === sortCol;
  return (
    <span className={`sort-icon${active ? ' sort-active' : ''}`}>
      {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

export function sortRows<T>(
  arr: T[],
  key: (item: T) => string | number | boolean,
  dir: SortDir,
): T[] {
  return [...arr].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    let cmp: number;
    if (typeof ka === 'number' && typeof kb === 'number') {
      cmp = ka - kb;
    } else if (typeof ka === 'boolean' && typeof kb === 'boolean') {
      cmp = Number(ka) - Number(kb);
    } else {
      cmp = String(ka).localeCompare(String(kb));
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}
