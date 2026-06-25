export const TMDB_API_KEY = localStorage.getItem('tmdb_api_key') || '572a69a7b33b22b3aaa05c9c9351fbab';
export const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
export const DEFAULT_RECS = [
  318, 858, 296, 527, 593, 2571, 50, 1198, 2858, 47,
  260, 480, 589, 356, 608, 1, 7153, 6016, 4226, 33794,
  112852, 1891, 122, 155, 13, 680, 240, 278, 311, 550
]; // ~30 varied classics + modern hits for offline fallback
