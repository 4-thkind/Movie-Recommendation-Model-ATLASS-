export const state = {
  tmdbCache: {},
  watchlist: [],
  currentModalMovie: null,
  currentHeroMovie: null,
  currentSurpriseMovie: null,
  spinLock: false,
  activePlatform: 'netflix',
  activeType: 'movies',
  personalizedRecommendations: {},
  movieLensData: {
    movies: {},
    ratings: {},
    movieRatings: {},
    loaded: false
  }
};

// LocalStorage helpers
export function saveWatchlistToStorage() {
  localStorage.setItem('user_watchlist', JSON.stringify(state.watchlist));
}

export function loadWatchlistFromStorage() {
  const savedWL = localStorage.getItem('user_watchlist');
  if (savedWL) {
    try {
      state.watchlist = JSON.parse(savedWL);
    } catch(e) {
      state.watchlist = [];
    }
  } else {
    state.watchlist = [];
  }
}
