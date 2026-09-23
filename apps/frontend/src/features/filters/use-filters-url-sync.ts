import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filtersEqual, filtersFromSearchParams, filtersToSearchParams } from './lib';
import { selectFilterValues, useFiltersStore } from './store';

/**
 * Keeps the Zustand filter store and the URL query string in sync.
 *
 * The URL is treated as the source of truth on navigation (back/forward, deep
 * links); the store is written back to the URL only when it produces a
 * different canonical query string, which prevents an update loop.
 */
export function useFiltersUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsString = searchParams.toString();
  const paramsRef = useRef(paramsString);

  useEffect(() => {
    const fromUrl = filtersFromSearchParams(new URLSearchParams(paramsString));
    if (!filtersEqual(selectFilterValues(useFiltersStore.getState()), fromUrl)) {
      useFiltersStore.getState().setAll(fromUrl);
    }
  }, [paramsString]);

  useEffect(() => {
    paramsRef.current = paramsString;
  }, [paramsString]);

  useEffect(() => {
    return useFiltersStore.subscribe((state) => {
      const next = filtersToSearchParams(state).toString();
      if (next !== paramsRef.current) {
        paramsRef.current = next;
        setSearchParams(new URLSearchParams(next), { replace: true });
      }
    });
  }, [setSearchParams]);
}
