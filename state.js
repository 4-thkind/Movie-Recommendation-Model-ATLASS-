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
  user: null,
  userEmail: null     // tracks the email of the currently logged-in account
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
      state.user       = parsed.user       || null;
      state.userEmail  = parsed.userEmail  || null;
    } catch(e) {
      state.isLoggedIn = false;
      state.user       = null;
      state.userEmail  = null;
    }
  }
}

export function saveAuthState() {
  localStorage.setItem('user_auth', JSON.stringify({
    isLoggedIn: state.isLoggedIn,
    user:       state.user,
    userEmail:  state.userEmail
  }));
}

// ─── PER-USER STORAGE ───

export function getUserStorageKey(email) {
  return `atlass_user_${email}`;
}

export function saveUserData(email) {
  if (!email) return;
  const blob = {
    onboardingCompleted:      localStorage.getItem('swipe_onboarding_completed') === 'true',
    onboardingGenres:         JSON.parse(localStorage.getItem('onboarding_genres')          || '[]'),
    onboardingLanguages:      JSON.parse(localStorage.getItem('onboarding_languages')       || '[]'),
    onboardingTalents:        JSON.parse(localStorage.getItem('onboarding_talents')          || '[]'),
    onboardingLikes:          JSON.parse(localStorage.getItem('onboarding_likes')            || '[]'),
    onboardingDislikes:       JSON.parse(localStorage.getItem('onboarding_dislikes')         || '[]'),
    onboardingExcludedGenres: JSON.parse(localStorage.getItem('onboarding_excluded_genres')  || '[]'),
    watchlist:                state.watchlist,
    watchlistToRestore:       state.watchlistToRestore,
    movieRatings:             JSON.parse(localStorage.getItem('user_movie_ratings')          || '{}'),
    watchedTimestamps:        JSON.parse(localStorage.getItem('user_watched_timestamps')     || '{}'),
  };
  localStorage.setItem(getUserStorageKey(email), JSON.stringify(blob));
}

export function loadUserData(email) {
  if (!email) return;
  const raw = localStorage.getItem(getUserStorageKey(email));
  if (!raw) return;  // first-ever login for this email — nothing to restore
  try {
    const blob = JSON.parse(raw);
    // Restore in-memory state
    state.watchlist          = blob.watchlist          || [];
    state.watchlistToRestore = blob.watchlistToRestore || [];
    // Restore the flat keys the rest of the app reads
    localStorage.setItem('swipe_onboarding_completed', blob.onboardingCompleted ? 'true' : '');
    localStorage.setItem('onboarding_genres',          JSON.stringify(blob.onboardingGenres          || []));
    localStorage.setItem('onboarding_languages',       JSON.stringify(blob.onboardingLanguages       || []));
    localStorage.setItem('onboarding_talents',         JSON.stringify(blob.onboardingTalents         || []));
    localStorage.setItem('onboarding_likes',           JSON.stringify(blob.onboardingLikes           || []));
    localStorage.setItem('onboarding_dislikes',        JSON.stringify(blob.onboardingDislikes        || []));
    localStorage.setItem('onboarding_excluded_genres', JSON.stringify(blob.onboardingExcludedGenres  || []));
    localStorage.setItem('user_watchlist',             JSON.stringify(state.watchlist));
    localStorage.setItem('user_watchlist_to_restore',  JSON.stringify(state.watchlistToRestore));
    localStorage.setItem('user_movie_ratings',         JSON.stringify(blob.movieRatings              || {}));
    localStorage.setItem('user_watched_timestamps',    JSON.stringify(blob.watchedTimestamps         || {}));
  } catch(e) {
    console.warn('loadUserData: failed to parse blob for', email, e);
  }
}
