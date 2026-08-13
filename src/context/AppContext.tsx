/**
 * AppContext.tsx
 * Global settings state shared across screens.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CountOptions, SenderStats } from '../lib/counter';

export type AppScreen = 'upload' | 'processing' | 'results' | 'settings';

export interface AppSettings extends CountOptions {
  redactPhoneNumbers: boolean;
}

export interface ProcessingProgress {
  phase: 'parsing' | 'counting' | 'done';
  progress: number; // 0–100
  messageCount: number;
}

export interface AppState {
  screen: AppScreen;
  settings: AppSettings;
  results: SenderStats[];
  groupName: string;
  totalMessages: number;
  selectedIds: Set<string>;
  progress: ProcessingProgress;

  setScreen: (s: AppScreen) => void;
  setSettings: (patch: Partial<AppSettings>) => void;
  setResults: (results: SenderStats[], totalMessages: number) => void;
  setGroupName: (name: string) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  setProgress: (p: ProcessingProgress) => void;
  mergeEntries: (ids: string[], keepId: string) => void;
  reset: () => void;
}

const defaultSettings: AppSettings = {
  mode: 'every-occurrence',
  looseMatching: false,
  redactPhoneNumbers: false,
};

const defaultProgress: ProcessingProgress = {
  phase: 'parsing',
  progress: 0,
  messageCount: 0,
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>('upload');
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [results, setResultsState] = useState<SenderStats[]>([]);
  const [groupName, setGroupName] = useState('');
  const [totalMessages, setTotalMessages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ProcessingProgress>(defaultProgress);

  const setSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setResults = useCallback((r: SenderStats[], total: number) => {
    setResultsState(r);
    setTotalMessages(total);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => setSelectedIds(new Set()), []);

  const mergeEntries = useCallback((ids: string[], keepId: string) => {
    setResultsState((prev) => {
      const toMerge = prev.filter((s) => ids.includes(s.id));
      const rest = prev.filter((s) => !ids.includes(s.id));
      const merged = toMerge.reduce(
        (acc, s) => ({
          ...acc,
          id: keepId,
          displayName: s.id === keepId ? s.displayName : acc.displayName,
          totalCount: acc.totalCount + s.totalCount,
          messageCount: acc.messageCount + s.messageCount,
          matchedLines: [...acc.matchedLines, ...s.matchedLines],
        }),
        {
          id: keepId,
          displayName: keepId,
          totalCount: 0,
          messageCount: 0,
          matchedLines: [],
        } as SenderStats
      );
      return [...rest, merged].sort((a, b) => b.totalCount - a.totalCount);
    });
    setSelectedIds(new Set());
  }, []);

  const reset = useCallback(() => {
    setScreen('upload');
    setResultsState([]);
    setTotalMessages(0);
    setSelectedIds(new Set());
    setGroupName('');
    setProgress(defaultProgress);
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        settings,
        results,
        groupName,
        totalMessages,
        selectedIds,
        progress,
        setScreen,
        setSettings,
        setResults,
        setGroupName,
        toggleSelected,
        clearSelected,
        setProgress,
        mergeEntries,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
