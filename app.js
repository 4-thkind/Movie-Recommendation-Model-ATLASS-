import { state, loadWatchlistFromStorage, loadAuthState } from './state.js?v=28';
import { loadMovieLensDatabase } from './recommender.js?v=28';
import { buildPlatforms, updateWatchlistUI, updateWLCount, initScrollspy, renderRows, buildTrending, initHero, initSeeAllButtons, initScrollReveal, initNavbarScroll, initHashRouting, initGridMotion, initProfileDropdown, initPickGallery, initGenrePopover, renderHomeSections } from './ui.js?v=28';
import { initPillNav } from './PillNav.js?v=28';

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
  initThemeToggle();
  initGenrePopover();

  if (!state.movieLensData.loaded) {
    renderRows();
    buildTrending();
    initHero();
    renderHomeSections();
  }
});

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  const icon = document.querySelector('#theme-toggle-btn i');
  if (icon) icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  localStorage.setItem('theme', theme);
}

window.toggleTheme = function() {
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
};

function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
}
