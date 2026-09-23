import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_QUERY, useIsMobile, useMediaQuery } from './use-media-query';

type Listener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initial: Record<string, boolean>) {
  const listeners = new Map<string, Set<Listener>>();
  const state = { ...initial };

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return state[query] ?? false;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: 'change', listener: Listener) => {
        const set = listeners.get(query) ?? new Set<Listener>();
        set.add(listener);
        listeners.set(query, set);
      },
      removeEventListener: (_type: 'change', listener: Listener) => {
        listeners.get(query)?.delete(listener);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );

  return {
    emit(query: string, matches: boolean) {
      state[query] = matches;
      listeners.get(query)?.forEach((listener) => {
        listener({ matches, media: query } as MediaQueryListEvent);
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(false);
  });

  it('reflects the initial match and reacts to media changes', () => {
    const media = installMatchMedia({ [MOBILE_QUERY]: true });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);

    act(() => media.emit(MOBILE_QUERY, false));
    expect(result.current).toBe(false);

    act(() => media.emit(MOBILE_QUERY, true));
    expect(result.current).toBe(true);
  });
});
