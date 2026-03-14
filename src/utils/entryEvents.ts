const ENTRIES_CHANGED_EVENT = "stone-diary:entries-changed";

export function notifyEntriesChanged() {
  window.dispatchEvent(new CustomEvent(ENTRIES_CHANGED_EVENT));
}

export function subscribeEntriesChanged(callback: () => void) {
  window.addEventListener(ENTRIES_CHANGED_EVENT, callback);
  return () => window.removeEventListener(ENTRIES_CHANGED_EVENT, callback);
}
