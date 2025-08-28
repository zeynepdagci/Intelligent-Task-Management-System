type Key = "baseline" | "quantized" | "cached" | "quantizedCached";

const BACKENDS: Record<Key, string> = {
  baseline: import.meta.env.VITE_API_BASE_BASELINE as string,
  quantized: import.meta.env.VITE_API_BASE_QUANTIZED as string,
  cached: import.meta.env.VITE_API_BASE_CACHED as string,
  quantizedCached: import.meta.env.VITE_API_BASE_QUANTIZED_CACHED as string,
};

function chooseBase(): string {
  const q = new URLSearchParams(window.location.search).get("backend") as Key | null;
  if (q && BACKENDS[q]) return BACKENDS[q];
  return BACKENDS.baseline;
}

export const API_BASE = chooseBase();
