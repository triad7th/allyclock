export interface WorldCardConfig {
  id: number; // stable key for @for tracking / future reorder
  zone: string; // IANA id, e.g. 'America/Los_Angeles'
  lineBreak: boolean; // when true this card ends its row; next card starts a new row
}

export interface WorldCardSizes {
  time: number; // 0.5–2.0, default 1.0
  date: number; // 0.5–2.0, default 1.0
}

// Per-band fields. `cards` is GLOBAL — broadcast identically to
// every band (read from any band via the store's sample()). `sizes` is per-band
// (resolution-based), tuned by the Adjust panel for the active band.
export interface WorldCardsFields {
  cards: WorldCardConfig[];
  sizes: WorldCardSizes;
}

export const MIN_CARDS = 1;
export const MAX_CARDS = 12;
