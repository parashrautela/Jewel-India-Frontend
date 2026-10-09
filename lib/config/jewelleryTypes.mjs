// Normalize chain aliases without changing the existing taxonomy for other types.
export const CHAIN_ALIASES = Object.freeze(["chain", "chains", "neck chain", "neck chains"]);

export function normalizeChainType(value) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return CHAIN_ALIASES.includes(normalized) ? "chain" : value;
}

export function catalogueTypeAliases(value) {
  if (normalizeChainType(value) === "chain") return [...CHAIN_ALIASES];
  const base = value.trim().toLowerCase().replace(/s$/, "");
  return [base, `${base}s`];
}
