import { useSyncExternalStore } from 'react';

/**
 * Tiny global store for the Open Account modal, so any CTA anywhere
 * (hero, wing menu, account cards, closing) can open it.
 */
let state: { open: boolean; tierId: string | null } = { open: false, tierId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openAccount(tierId: string | null = null) {
  state = { open: true, tierId };
  emit();
}
export function closeAccount() {
  state = { ...state, open: false };
  emit();
}
export function useOpenAccount() {
  return useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    () => state,
    () => state,
  );
}
