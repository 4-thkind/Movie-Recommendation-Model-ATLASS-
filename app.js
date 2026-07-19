import { state, loadWatchlistFromStorage, loadAuthState } from './state.js?v=33';
import { loadMovieLensDatabase } from './recommender.js?v=33';
import { buildPlatforms, updateWatchlistUI, updateWLCount, initScrollspy, renderRows, buildTrending, initHero, initSeeAllButtons, initScrollReveal, initNavbarScroll, initHashRouting, initGridMotion, initProfileDropdown, initPickGallery, initGenrePopover, renderHomeSections } from './ui.js?v=33';
import { initPillNav } from './PillNav.js?v=33';
import './onboarding.js?v=33';

// Bind to window for onboarding completions
window.renderHomeSections = renderHomeSections;

/* ─── INIT ─── */
function initApp() {
  // Load watchlist and auth from localStorage
  loadWatchlistFromStorage();
  loadAuthState();

  if (state.isLoggedIn) { 
    document.body.classList.remove('not-logged-in');
    document.body.classList.remove('show-landing-page');
  } else {
    document.body.classList.add('not-logged-in');
    document.body.classList.add('show-landing-page');
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
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
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
