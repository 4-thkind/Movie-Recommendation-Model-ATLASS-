/* ─── GLOBAL APPLICATION STATE ─── */
let tmdbCache = {};
let watchlist = [];
let currentModalMovie = null;
let spinLock = false;

/* ─── INIT ─── */
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('tmdb_api_key')) {
    localStorage.setItem('tmdb_api_key', '572a69a7b33b22b3aaa05c9c9351fbab');
  }
  loadMovieLensDatabase();
  if (!movieLensData.loaded) {
    renderRows();
    buildTrending();
    if (typeof initHero === 'function') initHero();
  }
});
