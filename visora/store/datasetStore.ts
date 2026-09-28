import { create } from 'zustand';
import type { DatasetMeta, ColumnProfile, SemanticType } from '@/types';

interface DatasetState {
  dataset: DatasetMeta | null;
  parsing: boolean;
  error: string | null;
  includeMap: Record<string, boolean>;
  setDataset: (dataset: DatasetMeta | null) => void;
  setParsing: (parsing: boolean) => void;
  setError: (error: string | null) => void;
  setColumnIncluded: (colId: string, include: boolean) => void;
  toggleColumnIncluded: (colId: string) => void;
  clear: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  dataset: null,
  parsing: false,
  error: null,
  includeMap: {},
  setDataset: (dataset) =>
    set({
      dataset,
      includeMap: dataset
        ? Object.fromEntries(dataset.columns.map((c: ColumnProfile) => [c.id, c.include]))
        : {},
    }),
  setParsing: (parsing) => set({ parsing }),
  setError: (error) => set({ error }),
  setColumnIncluded: (colId, include) =>
    set((state) => ({ includeMap: { ...state.includeMap, [colId]: include } })),
  toggleColumnIncluded: (colId) =>
    set((state) => ({
      includeMap: { ...state.includeMap, [colId]: !state.includeMap[colId] },
    })),
  clear: () => set({ dataset: null, error: null, includeMap: {} }),
}));

/** Convenience selector: count of columns matching a given semantic type. */
export function columnTypeCount(dataset: DatasetMeta | null, type: SemanticType): number {
  return dataset ? dataset.typeCounts[type] ?? 0 : 0;
}