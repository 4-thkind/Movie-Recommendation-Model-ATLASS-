import { state, loadWatchlistFromStorage, loadAuthState } from './state.js';
import { loadMovieLensDatabase } from './recommender.js';
import { buildPlatforms, updateWatchlistUI, updateWLCount, initScrollspy, renderRows, buildTrending, initHero, initSeeAllButtons, initScrollReveal, initNavbarScroll, initHashRouting, initGridMotion, initProfileDropdown, initPickGallery } from './ui.js';
import { initPillNav } from './PillNav.js';

/* ─── INIT ─── */
window.addEventListener('DOMContentLoaded', () => {
  // Load watchlist and auth from localStorage
  loadWatchlistFromStorage();
  loadAuthState();

  if (state.isLoggedIn) {
    document.body.classList.remove('not-logged-in');
  } else {
    document.body.classList.add('not-logged-in');
  }

  // Initialize TMDB API key if not present in localStorage
  if (!localStorage.getItem('tmdb_api_key')) {
    localStorage.setItem('tmdb_api_key', '572a69a7b33b22b3aaa05c9c9351fbab');
  }

  // Load database (MovieLens CSV or TMDB Live setup)
  loadMovieLensDatabase();

  // Initialize UI components
  buildPlatforms();
  updateWatchlistUI();
  updateWLCount();
  initScrollspy();
  initSeeAllButtons();
  initScrollReveal();
  initNavbarScroll();
  initPillNav();
  initHashRouting();
  initGridMotion();
  initProfileDropdown();

  if (!state.movieLensData.loaded) {
    renderRows();
    buildTrending();
    initHero();
  }
});
