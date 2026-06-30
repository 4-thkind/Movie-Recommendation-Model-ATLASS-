export const state = {
  tmdbCache: {},
  watchlist: [],
  watchlistToRestore: [], // array of movie ids that were in watchlist before being marked as watched
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
  },
  isLoggedIn: false,
  user: null
};

// LocalStorage helpers
export function saveWatchlistToStorage() {
  localStorage.setItem('user_watchlist', JSON.stringify(state.watchlist));
  localStorage.setItem('user_watchlist_to_restore', JSON.stringify(state.watchlistToRestore));
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
  const savedWLR = localStorage.getItem('user_watchlist_to_restore');
  if (savedWLR) {
    try {
      state.watchlistToRestore = JSON.parse(savedWLR);
    } catch(e) {
      state.watchlistToRestore = [];
    }
  } else {
    state.watchlistToRestore = [];
  }
}

export function loadAuthState() {
  const auth = localStorage.getItem('user_auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      state.isLoggedIn = parsed.isLoggedIn || false;
      state.user = parsed.user || null;
    } catch(e) {
      state.isLoggedIn = false;
      state.user = null;
    }
  }
}

export function saveAuthState() {
  localStorage.setItem('user_auth', JSON.stringify({ isLoggedIn: state.isLoggedIn, user: state.user }));
}
