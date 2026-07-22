import { state, saveWatchlistToStorage, saveUserData, loadUserData, getUserStorageKey } from './state.js?v=33';
import { TMDB_API_KEY, IS_FILE_PROTOCOL, DEFAULT_RECS } from './config.js?v=33';
import { MOVIES } from './data.js?v=33';
import { initializeRecommender, calculateMatchScore } from './recommender.js?v=33';
import { createCircularGallery } from './CircularGallery.js?v=33';
import { loadModel, isModelLoaded, rerankByML, buildUserRatingsFromOnboarding, prepareUserVectors } from './ml-model.js?v=33';

const sessionStart = Date.now();

// Live platforms list
export const LIVE_PLATFORMS = [
  { id: 'netflix', name: 'Netflix', color: '#e50914', icon: 'fa-solid fa-n', providerId: 8 },
  { id: 'prime', name: 'Prime Video', color: '#00a8e0', icon: 'fa-brands fa-amazon', providerId: 9 },
  { id: 'appletv', name: 'Apple TV+', color: '#a2aaad', icon: 'fa-brands fa-apple', providerId: 350 },
  { id: 'disney', name: 'Disney+', color: '#113ccf', icon: 'fa-solid fa-star', providerId: 337 },
  { id: 'max', name: 'Max', color: '#002be0', icon: 'fa-solid fa-m', providerId: 384 },
  { id: 'hulu', name: 'Hulu', color: '#1ce783', icon: 'fa-solid fa-h', providerId: 15 }
];

// Offline platform list
export const PLATFORMS_DATA = [
  {
    id: 'netflix', name: 'Netflix', color: '#e50914', icon: 'fa-solid fa-n',
    movieLensIds: [109487, 164179, 2571, 79132, 58559, 1],
    movies: [MOVIES[6], MOVIES[7], MOVIES[8], MOVIES[11], MOVIES[3], MOVIES[1]],
    series: [
      {id: "tmdb-tv-66732", title: "Stranger Things", year: "2016–2025", type: "series", genre: "Sci-Fi · Horror", rating: "8.7", poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80"},
      {id: "tmdb-tv-65494", title: "The Crown", year: "2016–2023", type: "series", genre: "Drama · History", rating: "8.1", poster: "https://images.unsplash.com/photo-1580130732478-4e339fb33746?w=400&q=80"},
      {id: "tmdb-tv-93405", title: "Squid Game", year: "2021–", type: "series", genre: "Thriller · Drama", rating: "8.0", poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80"},
      {id: "tmdb-tv-119051", title: "Wednesday", year: "2022–", type: "series", genre: "Comedy · Horror", rating: "7.1", poster: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80"},
      {id: "tmdb-tv-69050", title: "Ozark", year: "2017–2022", type: "series", genre: "Crime · Drama", rating: "8.4", poster: "https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?w=400&q=80"},
      {id: "tmdb-tv-1412", title: "Black Mirror", year: "2011–", type: "series", genre: "Sci-Fi · Thriller", rating: "8.2", poster: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80"},
    ]
  },
  {
    id: 'prime', name: 'Prime Video', color: '#00a8e0', icon: 'fa-brands fa-amazon',
    movieLensIds: [480, 296, 2959, 356, 593, 1704],
    movies: [MOVIES[1], MOVIES[5], MOVIES[11], MOVIES[3], MOVIES[4], MOVIES[9]],
    series: [
      {id: "tmdb-tv-76479", title: "The Boys", year: "2019–", type: "series", genre: "Action · Satire", rating: "8.7", poster: "https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=400&q=80"},
      {id: "tmdb-tv-84773", title: "Rings of Power", year: "2022–", type: "series", genre: "Fantasy · Adventure", rating: "6.9", poster: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=400&q=80"},
      {id: "tmdb-tv-67070", title: "Fleabag", year: "2016–2019", type: "series", genre: "Comedy · Drama", rating: "8.7", poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80"},
      {id: "tmdb-tv-119060", title: "Reacher", year: "2022–", type: "series", genre: "Action · Thriller", rating: "8.0", poster: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80"},
      {id: "tmdb-tv-62560", title: "Mr. Robot", year: "2015–2019", type: "series", genre: "Thriller · Drama", rating: "8.5", poster: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80"},
    ]
  },
  {
    id: 'appletv', name: 'Apple TV+', color: '#a2aaad', icon: 'fa-brands fa-apple',
    movieLensIds: [924, 260, 4993, 7361, 50, 1198],
    movies: [MOVIES[4], MOVIES[0], MOVIES[5], MOVIES[2], MOVIES[10]],
    series: [
      {id: "tmdb-tv-95396", title: "Severance", year: "2022–", type: "series", genre: "Sci-Fi · Mystery", rating: "8.7", poster: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80"},
      {id: "tmdb-tv-97546", title: "Ted Lasso", year: "2020–", type: "series", genre: "Comedy · Sports", rating: "8.8", poster: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80"},
      {id: "tmdb-tv-74204", title: "The Morning Show", year: "2019–", type: "series", genre: "Drama", rating: "7.9", poster: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80"},
      {id: "tmdb-tv-153496", title: "Slow Horses", year: "2022–", type: "series", genre: "Thriller · Spy", rating: "8.1", poster: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&q=80"},
    ]
  },
  {
    id: 'disney', name: 'Disney+', color: '#113ccf', icon: 'fa-solid fa-star',
    movieLensIds: [364, 588, 595, 6377, 4896, 2],
    movies: [MOVIES[3], MOVIES[0], MOVIES[7], MOVIES[11], MOVIES[1]],
    series: [
      {id: "tmdb-tv-83865", title: "Andor", year: "2022–", type: "series", genre: "Sci-Fi · Drama", rating: "8.4", poster: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80"},
      {id: "tmdb-tv-82856", title: "The Mandalorian", year: "2019–", type: "series", genre: "Sci-Fi · Western", rating: "8.7", poster: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80"},
      {id: "tmdb-tv-84958", title: "Loki", year: "2021–", type: "series", genre: "Superhero · Comedy", rating: "8.2", poster: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&q=80"},
      {id: "tmdb-tv-91363", title: "What If...?", year: "2021–", type: "series", genre: "Animated · Sci-Fi", rating: "7.4", poster: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&q=80"},
    ]
  },
  {
    id: 'max', name: 'Max', color: '#002be0', icon: 'fa-solid fa-m',
    movieLensIds: [318, 858, 58559, 912, 919, 50, 1198],
    movies: [MOVIES[0], MOVIES[2], MOVIES[7], MOVIES[10], MOVIES[8], MOVIES[9]],
    series: [
      {id: "tmdb-tv-100088", title: "The Last of Us", year: "2023–", type: "series", genre: "Drama · Horror", rating: "8.8", poster: "https://images.unsplash.com/photo-1520209268518-aec60b8bb5ca?w=400&q=80"},
      {id: "tmdb-tv-94997", title: "House of the Dragon", year: "2022–", type: "series", genre: "Fantasy · Drama", rating: "8.5", poster: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80"},
      {id: "tmdb-tv-76331", title: "Succession", year: "2018–2023", type: "series", genre: "Drama · Comedy", rating: "8.9", poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80"},
      {id: "tmdb-tv-46648", title: "True Detective", year: "2014–", type: "series", genre: "Crime · Mystery", rating: "8.9", poster: "https://images.unsplash.com/photo-1542261777448-23d2a9e529b2?w=400&q=80"},
      {id: "tmdb-tv-85552", title: "Euphoria", year: "2019–", type: "series", genre: "Drama", rating: "7.9", poster: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80"},
    ]
  },
  {
    id: 'mubi', name: 'MUBI', color: '#45a0ff', icon: 'fa-solid fa-film',
    movieLensIds: [1208, 904, 908, 4973, 5618, 924],
    movies: [MOVIES[5], MOVIES[9], MOVIES[10], MOVIES[2], MOVIES[6], MOVIES[3]],
    series: [
      {id: "tmdb-tv-110034", title: "Pachinko", year: "2022–", type: "series", genre: "Drama · History", rating: "8.4", poster: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80"},
      {id: "tmdb-tv-154948", title: "Irma Vep", year: "2022", type: "series", genre: "Drama · Comedy", rating: "7.7", poster: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80"},
      {id: "tmdb-tv-61175", title: "The Affair", year: "2014–2019", type: "series", genre: "Drama · Romance", rating: "7.7", poster: "https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?w=400&q=80"},
    ]
  }
];

export function applyMatchScorePreferencesBoost(movieObj) {
  if (!movieObj) return;
  let score = movieObj.match || 75;
  
  // Load favorite genres
  const favGenresStr = localStorage.getItem('fav_genres');
  if (favGenresStr) {
    try {
      const favGenres = JSON.parse(favGenresStr);
      if (Array.isArray(favGenres) && favGenres.length > 0 && movieObj.genre) {
        const movieGenres = movieObj.genre.split('·').map(g => g.trim().toLowerCase());
        favGenres.forEach(fg => {
          if (movieGenres.includes(fg.toLowerCase())) {
            score += 4; // Boost by 4% per matching genre
          }
        });
      }
    } catch(e) {
      console.error("Error parsing fav_genres settings", e);
    }
  }

  // Load favorite providers
  const favProvidersStr = localStorage.getItem('fav_providers');
  if (favProvidersStr) {
    try {
      const favProviders = JSON.parse(favProvidersStr);
      if (Array.isArray(favProviders) && favProviders.length > 0 && movieObj.platforms) {
        const providerMap = {
          'netflix': 'Netflix',
          'prime': 'Prime Video',
          'appletv': 'Apple TV+',
          'disney': 'Disney+',
          'max': 'Max',
          'hulu': 'Hulu'
        };
        const moviePlatforms = movieObj.platforms.map(p => p.toLowerCase());
        let hasFavProvider = false;
        favProviders.forEach(fp => {
          const platformName = providerMap[fp.toLowerCase()];
          if (platformName && moviePlatforms.includes(platformName.toLowerCase())) {
            hasFavProvider = true;
          }
        });
        if (hasFavProvider) {
          score += 5; // Boost by 5% if available on a favorite platform
        }
      }
    } catch(e) {
      console.error("Error parsing fav_providers settings", e);
    }
  }
  
  movieObj.match = Math.min(99, Math.max(0, score));
  applyMatchScoreTasteBoost(movieObj);
}

/* ─── FETCH TMDB DETAILS (WITH CACHING & FALLBACK) ─── */
export async function fetchTMDBDetails(movieId) {
  if (state.tmdbCache[movieId]) return state.tmdbCache[movieId];
  
  const isVirtual = typeof movieId === 'string' && movieId.startsWith('tmdb-');
  let type = 'movie';
  let tmdbId = null;
  let cleanTitle = "Loading...";
  let year = "N/A";
  let genresList = "Drama";

  if (isVirtual) {
    const parts = movieId.split('-');
    type = parts[1]; // 'movie' or 'tv'
    tmdbId = parts[2];
  } else if (TMDB_API_KEY && (!state.movieLensData.loaded || Object.keys(state.movieLensData.movies || {}).length === 0)) {
    tmdbId = movieId;
    type = 'movie';
  } else {
    if (!state.movieLensData.loaded) {
      const fallback = MOVIES.find(m => m.id === movieId);
      if (fallback) {
        const copied = { ...fallback };
        applyMatchScorePreferencesBoost(copied);
        return copied;
      }
      const inlineFallback = {
        id: movieId,
        title: `MovieLens #${movieId}`,
        year: "N/A",
        match: 85,
        rating: "7.5",
        runtime: "2h 0m",
        genre: "Drama",
        synopsis: "Detailed information requires the MovieLens database to be loaded.",
        poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
        backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
        platforms: ["Streaming"],
        reasons: ["Popular Choice"],
        cast: [{name: "Cast N/A", character: "Cast Member", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}],
        director: [{name: "Director N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}]
      };
      applyMatchScorePreferencesBoost(inlineFallback);
      return inlineFallback;
    }
    const movie = state.movieLensData.movies[movieId];
    if (!movie) return null;
    tmdbId = movie.tmdbId;
    cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
    year = movie.title.match(/\((\d{4})\)$/)?.[1] || 'N/A';
    genresList = movie.genres.replace(/\|/g, ' · ');
  }
  
  if (!TMDB_API_KEY || !tmdbId) {
    const fallbackMock = {
      id: movieId,
      title: isVirtual ? `TMDb ${type === 'tv' ? 'TV' : 'Movie'} #${tmdbId}` : cleanTitle,
      year: isVirtual ? "N/A" : year,
      match: calculateMatchScore(isVirtual ? tmdbId : movieId),
      rating: isVirtual ? "7.0" : (6.5 + ((movieId * 3) % 25) / 10).toFixed(1),
      runtime: isVirtual ? "N/A" : `${1 + ((movieId * 2) % 2)}h ${10 + ((movieId * 11) % 45)}m`,
      genre: isVirtual ? (type === 'tv' ? 'TV Show' : 'Movie') : genresList,
      synopsis: isVirtual
        ? `Virtual title. Connect CineMatch with your TMDb API Key (gear icon in the top right) to fetch rich metadata for this title.`
        : `Synopsis for ${cleanTitle}. Connect CineMatch with your TMDb API Key (gear icon in the top right) to fetch rich metadata, real posters, trailers, and cast profiles from TMDb!`,
      poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
      backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
      platforms: ["Netflix", "Prime Video", "Apple TV+"].slice(0, 1 + (isVirtual ? parseInt(tmdbId) % 3 : movieId % 3)),
      reasons: isVirtual ? [type === 'tv' ? 'TV Show' : 'Movie'] : genresList.split('·').slice(0, 3).map(g => g.trim()),
      cast: [
        { name: "Lead Actor", character: "Main Character", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" },
        { name: "Supporting Cast", character: "Sidekick", img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&q=80" }
      ],
      director: [
        { name: "Director N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }
      ]
    };
    applyMatchScorePreferencesBoost(fallbackMock);
    state.tmdbCache[movieId] = fallbackMock;
    return fallbackMock;
  }
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,release_dates,content_ratings`);
    if (!res.ok) throw new Error("TMDB network error");
    const data = await res.json();
    
    let cert = '';
    if (type === 'tv' && data.content_ratings && data.content_ratings.results) {
      const usRating = data.content_ratings.results.find(r => r.iso_3166_1 === 'US');
      if (usRating && usRating.rating) cert = usRating.rating;
    } else if (data.release_dates && data.release_dates.results) {
      const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates) {
        const validRelease = usRelease.release_dates.find(r => r.certification);
        if (validRelease) cert = validRelease.certification;
      }
      if (!cert) {
        for (const country of data.release_dates.results) {
          if (country.release_dates) {
            const valid = country.release_dates.find(r => r.certification);
            if (valid) {
              cert = valid.certification;
              break;
            }
          }
        }
      }
    }
    if (!cert) cert = type === 'tv' ? 'TV-14' : 'NR';
    
    const mapped = {
      id: movieId,
      title: type === 'tv' ? data.name : data.title,
      year: type === 'tv'
        ? (data.first_air_date ? data.first_air_date.split('-')[0] : 'N/A')
        : (data.release_date ? data.release_date.split('-')[0] : year),
      match: calculateMatchScore(isVirtual ? tmdbId : movieId),
      rating: data.vote_average ? data.vote_average.toFixed(1) : '7.0',
      cert: cert,
      runtime: type === 'tv'
        ? (data.episode_run_time && data.episode_run_time.length > 0 ? `${data.episode_run_time[0]}m` : 'N/A')
        : (data.runtime ? `${Math.floor(data.runtime/60)}h ${data.runtime%60}m` : 'N/A'),
      genre: data.genres ? data.genres.map(g => g.name).join(' · ') : (type === 'tv' ? 'TV Show' : genresList),
      synopsis: data.overview || 'No synopsis available.',
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85',
      platforms: type === 'tv'
        ? ["Netflix", "Prime Video", "Apple TV+", "Disney+"].slice(0, 1 + (data.id % 4))
        : ["Max", "Netflix", "Prime Video", "Apple TV+"].slice(0, 1 + (data.id % 3)),
      reasons: data.genres ? data.genres.map(g => g.name).slice(0, 3) : (type === 'tv' ? ['TV Series'] : ['Highly Rated']),
      cast: data.credits && data.credits.cast ? data.credits.cast.slice(0, 5).map(c => ({
        name: c.name,
        character: c.character || 'Cast Member',
        img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
      })) : [],
      director: data.credits && data.credits.crew ? data.credits.crew.filter(c => c.job === 'Director').map(d => ({
        name: d.name,
        img: d.profile_path ? `https://image.tmdb.org/t/p/w185${d.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
      })) : [],
      cert: cert
    };
    
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) {
        mapped.trailerKey = trailer.key;
      }
    }
    
    applyMatchScorePreferencesBoost(mapped);
    state.tmdbCache[movieId] = mapped;
    return mapped;
  } catch (err) {
    console.error("TMDB error:", err);
    return null;
  }
}

/* ─── WEB AUDIO API SYNTHESIZER ─── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch(e){}
}

function playSpinAccel() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch(e){}
}

function playWhoosh() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, ctx.currentTime);
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 1.5);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 1.5);
  } catch(e){}
}

function playWin() {
  try {
    const ctx = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.28);
      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.3);
    });
  } catch(e){}
}

function playClick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(300, ctx.currentTime + 0.01);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch(e){}
}

/* ─── IN-CARD EXPAND SYSTEM (NETFLIX-STYLE MORPH) ─── */
let expandTimer = null;
let collapseTimer = null;
let currentExpandedCard = null;

/* ─── HERO AUTO-ROTATION ─── */
let heroRotationInterval = null;
let heroProgressTimer = null;
let heroRotationPool = []; // filled by startHeroRotation
let heroRotationIndex = 0;
const HERO_ROTATION_DURATION = 8000; // ms per slide

export function schedulePopup(movie, cardEl) {
  if (!cardEl) return;
  clearTimeout(expandTimer);
  clearTimeout(collapseTimer);
  expandTimer = setTimeout(() => showPopup(movie, cardEl), 500);
}

export function cancelPopup() {
  clearTimeout(expandTimer);
  collapseTimer = setTimeout(() => hidePopup(), 120);
}

export function showPopup(movie, cardEl) {
  if (!cardEl) return;

  // Collapse any other open card first
  if (currentExpandedCard && currentExpandedCard !== cardEl) {
    _collapseCard(currentExpandedCard);
  }

  state.currentPopupMovie = movie;
  currentExpandedCard = cardEl;

  // Find or build the expand panel
  let panel = cardEl.querySelector('.card-expand');
  if (!panel) {
    panel = _buildExpandPanel();
    cardEl.appendChild(panel);
  }
  if (!panel) {
    panel = _buildExpandPanel();
    cardEl.appendChild(panel);
  }

  // Populate
  const img = panel.querySelector('.ce-img');
  if (img) img.src = movie.backdrop || movie.poster || '';
  const titleEl = panel.querySelector('.ce-title');
  if (titleEl) titleEl.textContent = movie.title || '';
  const matchEl = panel.querySelector('.ce-match');
  if (matchEl) matchEl.textContent = (movie.match || 85) + '% Match';
  const ratingEl = panel.querySelector('.ce-rating-val');
  if (ratingEl) ratingEl.textContent = movie.rating || '7.0';
  const certEl = panel.querySelector('.ce-cert');
  if (certEl) certEl.textContent = movie.cert || 'PG-13';
  const genreEl = panel.querySelector('.ce-genres');
  if (genreEl) {
    const genres = (movie.genre || '').split('·').map(g => g.trim()).filter(Boolean);
    genreEl.innerHTML = genres.map((g, i) =>
      i < genres.length - 1
        ? `<span>${g}</span><span class="ce-dot"></span>`
        : `<span>${g}</span>`
    ).join('');
  }

  // Watchlist button state
  const addBtn = panel.querySelector('.ce-add');
  if (addBtn) {
    const inList = state.watchlist.find(m => String(m.id) === String(movie.id));
    addBtn.classList.toggle('added', !!inList);
    addBtn.innerHTML = inList
      ? '<i class="fa-solid fa-check" style="font-size:10px"></i>'
      : '<i class="fa-solid fa-plus" style="font-size:10px"></i>';
  }

  // Wire buttons
  const playBtn = panel.querySelector('.ce-play');
  if (playBtn) playBtn.onclick = (e) => { e.stopPropagation(); openModal(movie); };
  if (addBtn) addBtn.onclick = (e) => {
    e.stopPropagation();
    toggleWatchlist(movie);
    const inList = state.watchlist.find(m => String(m.id) === String(movie.id));
    addBtn.classList.toggle('added', !!inList);
    addBtn.innerHTML = inList
      ? '<i class="fa-solid fa-check" style="font-size:10px"></i>'
      : '<i class="fa-solid fa-plus" style="font-size:10px"></i>';
  };
  const infoBtn = panel.querySelector('.ce-info');
  if (infoBtn) infoBtn.onclick = (e) => { e.stopPropagation(); openModal(movie); };

  // Keep hover alive while over the expand panel
  panel.onmouseenter = () => { clearTimeout(collapseTimer); };
  panel.onmouseleave = () => { hidePopup(); };

  // Determine horizontal clamp — flip left/right if near viewport edge
  const rect = cardEl.getBoundingClientRect();
  const panelW = parseInt(getComputedStyle(panel).width) || 240;
  const centreLeft = rect.left + rect.width / 2 - panelW / 2;
  cardEl.classList.remove('expand-left', 'expand-right');
  if (centreLeft < 8) {
    cardEl.classList.add('expand-right');
  } else if (centreLeft + panelW > window.innerWidth - 8) {
    cardEl.classList.add('expand-left');
  }

  cardEl.classList.add('card-is-expanded');
}

export function hidePopup() {
  clearTimeout(expandTimer);
  if (currentExpandedCard) {
    _collapseCard(currentExpandedCard);
    currentExpandedCard = null;
  }
  state.currentPopupMovie = null;
}

// No-op — kept for any legacy call sites
export function repositionPopup() {}

function _collapseCard(card) {
  card.classList.remove('card-is-expanded', 'expand-left', 'expand-right');
}

function _buildExpandPanel() {
  const panel = document.createElement('div');
  panel.className = 'card-expand';
  panel.innerHTML = `
    <div class="ce-poster">
      <img class="ce-img" src="" alt="" draggable="false"/>
      <div class="ce-poster-fade"></div>
    </div>
    <div class="ce-body">
      <div class="ce-actions">
        <button class="ce-btn ce-play" title="Watch Now">
          <i class="fa-solid fa-play" style="margin-left:2px;font-size:10px"></i>
        </button>
        <button class="ce-btn ce-add" title="Add to Watchlist">
          <i class="fa-solid fa-plus" style="font-size:10px"></i>
        </button>
        <button class="ce-btn ce-like" title="I like this">
          <i class="fa-solid fa-thumbs-up" style="font-size:10px"></i>
        </button>
        <button class="ce-btn ce-info" title="More Info" style="margin-left:auto">
          <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
        </button>
      </div>
      <div class="ce-meta">
        <span class="ce-match"></span>
        <span class="ce-rating">
          <i class="fa-solid fa-star" style="font-size:9px"></i>
          <span class="ce-rating-val"></span>
        </span>
        <span class="ce-cert"></span>
      </div>
      <div class="ce-title"></div>
      <div class="ce-genres"></div>
    </div>`;
  return panel;
}

// Bind scroll events — no repositioning needed anymore but keep for legacy
document.addEventListener('scroll', () => {}, { capture: true, passive: true });

/* ─── RENDER MOVIES CARD ─── */
export function buildCard(movieId, initialData = null) {
  const wrap = document.createElement('div');
  wrap.className = 'movie-card';
  wrap.dataset.id = movieId;

  const isVirtual = typeof movieId === 'string' && movieId.startsWith('tmdb-');
  const alreadyIn = state.watchlist.some(m => String(m.id) === String(movieId));

  let cleanTitle = 'Loading...';
  let poster = 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
  let match = 85;

  if (TMDB_API_KEY) {
    cleanTitle = initialData ? (initialData.title || initialData.name || 'Loading...') : 'Loading...';
    poster = initialData && initialData.poster_path
      ? `https://image.tmdb.org/t/p/w500${initialData.poster_path}`
      : (initialData && initialData.poster ? initialData.poster : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80');
    match = initialData && initialData.match ? initialData.match : calculateMatchScore(movieId);
  } else {
    if (isVirtual) {
      cleanTitle = 'Loading...';
    } else if (state.movieLensData.loaded) {
      const movie = state.movieLensData.movies[movieId];
      if (movie) {
        cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
      }
    } else {
      const fallback = MOVIES.find(m => m.id === movieId);
      if (fallback) {
        cleanTitle = fallback.title;
      }
    }
    match = calculateMatchScore(movieId);
  }

  const starCount = match >= 90 ? 5 : (match >= 75 ? 4 : (match >= 60 ? 3 : (match >= 40 ? 2 : 1)));
  const starsStr = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

  let personBadgeHtml = '';
  if (initialData && initialData.personReason) {
    const roleText = initialData.personReason.role === 'Director' ? 'Directed by' : 'Starring';
    personBadgeHtml = `<div class="person-badge" title="${roleText} ${initialData.personReason.name}">${roleText} <strong>${initialData.personReason.name}</strong></div>`;
  }

  wrap.innerHTML = `
    <div class="card-thumb">
      <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity:${initialData || TMDB_API_KEY ? '1' : '0.35'};transition:opacity .25s var(--smooth)"/>
      <div class="m-badge"><span class="m-stars-inline">${starsStr}</span> ${match}%</div>
      ${personBadgeHtml}
      <button class="card-quick-add${alreadyIn ? ' added' : ''}" data-id="${movieId}" title="${alreadyIn ? 'In Watchlist' : 'Add to Watchlist'}">
        ${alreadyIn ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' : '<i class="fa-solid fa-plus" style="font-size:9px"></i>'}
      </button>
    </div>`;

  let resolvedDetails = initialData ? {
    id: movieId,
    title: initialData.title || initialData.name || '',
    year: (initialData.release_date || initialData.first_air_date || '').split('-')[0] || 'N/A',
    match,
    rating: initialData.vote_average ? initialData.vote_average.toFixed(1) : '7.0',
    runtime: 'N/A',
    genre: '',
    synopsis: initialData.overview || '',
    poster,
    backdrop: initialData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${initialData.backdrop_path}` : poster,
    platforms: [],
    reasons: [],
    cast: [],
    director: [],
    personReason: initialData.personReason
  } : null;

  const cardAddBtn = wrap.querySelector('.card-quick-add');

  wrap.addEventListener('click', (e) => {
    if (resolvedDetails) openModal(resolvedDetails);
  });
  cardAddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (resolvedDetails) toggleWatchlist(resolvedDetails);
  });

  // Attach hover popup immediately — uses whatever resolvedDetails is available at that moment
  wrap._popupDetails = resolvedDetails; // expose for clones (may be null initially in offline mode)
  wrap.addEventListener('mouseenter', () => {
    if (resolvedDetails) schedulePopup(resolvedDetails, wrap);
  });
  wrap.addEventListener('mouseleave', () => cancelPopup());

  fetchTMDBDetails(movieId).then(details => {
    if (!details) return;
    if (initialData && initialData.personReason) {
      details.personReason = initialData.personReason;
    } else if (resolvedDetails && resolvedDetails.personReason) {
      details.personReason = resolvedDetails.personReason;
    }
    resolvedDetails = details;
    wrap._popupDetails = details; // expose for clones
    const img = wrap.querySelector('.lazy-poster');
    if (img) {
      img.src = details.poster;
      img.style.opacity = 1;
    }
    
    // Dynamic Glow Extraction
    const glow = getGlowColor(details.genre);
    wrap.style.setProperty('--glow-color', glow.color);
    wrap.style.setProperty('--glow-border', glow.border);
  });

  return wrap;
}

/* ─── RENDER TRENDING GRID ─── */
export function buildTrending() {
  if (TMDB_API_KEY) {
    fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.results) renderTrendingGrid(data.results.slice(0, 10));
      });
    return;
  }

  const trendingIds = [1, 296, 318, 356, 593, 260, 2571, 480];
  renderTrendingGrid(trendingIds);
}

export function renderTrendingGrid(itemsList) {
  const grid = document.getElementById('trend-row');
  if (!grid) return;
  grid.innerHTML = '';
  grid._infiniteInit = false;

  itemsList.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'trend-card';
    
    let tmdbId = TMDB_API_KEY ? item.id : item;
    card.dataset.id = tmdbId;

    let title = "Loading...";
    let poster = "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80";
    let rating = "7.5";
    let year = "N/A";

    if (TMDB_API_KEY) {
      title = item.title;
      poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : poster;
      rating = item.vote_average ? item.vote_average.toFixed(1) : rating;
      year = item.release_date ? item.release_date.split('-')[0] : year;
    } else {
      const fallback = MOVIES.find(m => m.id === item);
      if (fallback) {
        title = fallback.title;
        poster = fallback.poster;
        rating = fallback.rating;
        year = fallback.year;
      }
    }

    card.innerHTML = `
      <img class="lazy-poster" src="${poster}" alt="${title}" style="opacity: 1;"/>
      <div class="trend-num">${i + 1}</div>
      ${i < 3 ? `<div class="trend-badge"><span class="live-dot"></span>#${i + 1} Today</div>` : ''}
      <div class="trend-overlay"></div>
      <div class="trend-info">
        <div class="trend-title">${title}</div>
        <div class="trend-meta">
          <span class="trend-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ${rating}</span>
          <span style="color:var(--t3)">·</span><span>${year}</span>
        </div>
        <div class="trend-btns">
          <button class="trend-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
          <button class="trend-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
        </div>
      </div>
    `;

    let resolvedDetails = null;
    const playBtn = card.querySelector('.trend-btn.play');
    const addBtn = card.querySelector('.trend-btn.add');

    const handleOpen = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) openModal(resolvedDetails); };
    const handleAdd = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) toggleWatchlist(resolvedDetails); };

    card.addEventListener('click', () => handleOpen(null));
    playBtn.addEventListener('click', e => handleOpen(e));
    addBtn.addEventListener('click', handleAdd);

    // Attach hover popup — uses a quick fallback immediately, updated when details load
    const quickFallback = { id: tmdbId, title, poster, match: 85, rating, year, cert: 'PG-13', genre: '' };
    card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || quickFallback, card));
    card.addEventListener('mouseleave', () => cancelPopup());

    fetchTMDBDetails(tmdbId).then(details => {
      if (!details) return;
      resolvedDetails = details;
      card._popupDetails = details; // expose for clones
    });
    grid.appendChild(card);
  });

  // Infinite scroll — seamless loop in both directions
  requestAnimationFrame(() => makeRowInfinite(grid));
}

/* ─── RENDER ROWS ─── */
export function renderRows() {
  initializeRecommender();

  const rw2 = document.getElementById('rw2');
  const rw2Title = document.getElementById('rw2-title');
  if (!rw2) return;
  rw2.innerHTML = '';
  rw2._infiniteInit = false;

  let rw2Sub;
  if (rw2Title) {
    rw2Sub = rw2Title.closest('.sec-head').querySelector('.sec-sub');
  }

  const userRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
  const ratedIds = Object.keys(userRatings);

  const fetchPopular = () => {
    if (rw2Title) rw2Title.textContent = "Trending Movies";
    if (rw2Sub) rw2Sub.classList.add('hidden');
    if (TMDB_API_KEY) {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${randomPage}`)
        .then(res => res.json())
        .then(data => {
          if (data.results) {
            let currentDislikes = [];
            try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
            const filtered = data.results.filter(m => !currentDislikes.some(id => String(id) === String(m.id)));
            
            let onboardingGenres = [];
            let onboardingLanguages = [];
            try { onboardingGenres = JSON.parse(localStorage.getItem('onboarding_genres') || '[]'); } catch(e){}
            try { onboardingLanguages = JSON.parse(localStorage.getItem('onboarding_languages') || '[]'); } catch(e){}

            // Score based on onboarding language and genre matching
            const scored = filtered.map(m => {
              let score = 0;
              if (onboardingLanguages.length === 0 || onboardingLanguages.includes(m.original_language)) {
                score += 1000;
              }
              const matchingGenresCount = (m.genre_ids || []).filter(gId => onboardingGenres.includes(gId)).length;
              score += matchingGenresCount * 100;
              score += (m.popularity || 0) / 1000;
              return { item: m, score };
            });

            // Sort descending by score
            scored.sort((a, b) => b.score - a.score);
            const finalRecs = scored.map(s => s.item);

            finalRecs.slice(0, 15).forEach(m => rw2.appendChild(buildCard(m.id, m)));
            requestAnimationFrame(() => makeRowInfinite(rw2));
          }
        });
    } else {
      const popularRecs = DEFAULT_RECS.slice(Math.floor(DEFAULT_RECS.length / 2));
      popularRecs.forEach(id => rw2.appendChild(buildCard(id)));
      requestAnimationFrame(() => makeRowInfinite(rw2));
    }
  };

  if (ratedIds.length > 0) {
    // Pick a random highly rated movie (or random if none >= 4)
    const highRated = ratedIds.filter(id => userRatings[id] >= 4);
    const pool = highRated.length > 0 ? highRated : ratedIds;
    const seedId = pool[Math.floor(Math.random() * pool.length)];

    if (TMDB_API_KEY) {
      Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${seedId}?api_key=${TMDB_API_KEY}`).then(r => r.json()),
        fetch(`https://api.themoviedb.org/3/movie/${seedId}/recommendations?api_key=${TMDB_API_KEY}`).then(r => r.json())
      ]).then(([details, recs]) => {
        if (rw2Title && details.title) {
          rw2Title.textContent = details.title;
          if (rw2Sub && details.genres) {
            rw2Sub.classList.remove('hidden');
            rw2Sub.textContent = "Matched on: " + details.genres.slice(0,3).map(g => g.name).join(' · ');
          }
        }
        if (recs.results && recs.results.length > 0) {
          let currentDislikes = [];
          try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
          const dislikeSet = new Set(currentDislikes.map(id => String(id)));
          const filteredRecs = recs.results.filter(m => !dislikeSet.has(String(m.id)));
          
          let onboardingGenres = [];
          let onboardingLanguages = [];
          try { onboardingGenres = JSON.parse(localStorage.getItem('onboarding_genres') || '[]'); } catch(e){}
          try { onboardingLanguages = JSON.parse(localStorage.getItem('onboarding_languages') || '[]'); } catch(e){}

          // Filter strictly by preferred language and genres, and omit unreleased movies
          let finalRecs = filteredRecs.filter(m => {
            if (m.release_date && new Date(m.release_date) > new Date()) return false;
            const matchesLang = onboardingLanguages.length === 0 || onboardingLanguages.includes(m.original_language);
            const matchesGenre = onboardingGenres.length === 0 || (m.genre_ids || []).some(gId => onboardingGenres.includes(gId));
            return matchesLang && matchesGenre;
          });

          // Score based on onboarding genre matching count, popularity, and ML model score
          const scored = finalRecs.map(m => {
            let score = 0;
            const matchingGenresCount = (m.genre_ids || []).filter(gId => onboardingGenres.includes(gId)).length;
            score += matchingGenresCount * 100;
            score += (m.popularity || 0) / 1000;
            
            // Blend ML score if available
            if (state.personalizedRecommendations && state.personalizedRecommendations[m.id]) {
               score += (state.personalizedRecommendations[m.id] * 50);
            }
            
            return { item: m, score };
          });
          scored.sort((a, b) => b.score - a.score);
          let sortedRecs = scored.map(s => s.item);

          // Backfill if needed
          if (sortedRecs.length < 15 && (onboardingLanguages.length > 0 || onboardingGenres.length > 0)) {
            const genreStr = onboardingGenres.join(',');
            const langStr = onboardingLanguages.join('|');
            let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1`;
            if (genreStr) discoverUrl += `&with_genres=${genreStr}`;
            if (langStr) discoverUrl += `&with_original_language=${langStr}`;

            fetch(discoverUrl)
              .then(r => r.json())
              .then(backfillRes => {
                if (backfillRes.results) {
                  const seen = new Set(sortedRecs.map(m => m.id));
                  backfillRes.results.forEach(m => {
                    const isUnreleased = m.release_date && new Date(m.release_date) > new Date();
                    if (!seen.has(m.id) && !dislikeSet.has(String(m.id)) && !isUnreleased) {
                      seen.add(m.id);
                      sortedRecs.push(m);
                    }
                  });
                }
                sortedRecs = sortedRecs.slice(0, 15);
                sortedRecs.forEach(m => rw2.appendChild(buildCard(m.id, m)));
                requestAnimationFrame(() => makeRowInfinite(rw2));
              })
              .catch(() => {
                sortedRecs = sortedRecs.slice(0, 15);
                sortedRecs.forEach(m => rw2.appendChild(buildCard(m.id, m)));
                requestAnimationFrame(() => makeRowInfinite(rw2));
              });
          } else {
            sortedRecs = sortedRecs.slice(0, 15);
            sortedRecs.forEach(m => rw2.appendChild(buildCard(m.id, m)));
            requestAnimationFrame(() => makeRowInfinite(rw2));
          }
        } else {
          fetchPopular();
        }
      }).catch(() => fetchPopular());
    } else {
      // Offline mode fallback
      const movieData = state.movieLensData?.movies?.[seedId];
      if (rw2Title && movieData) {
        rw2Title.textContent = movieData.title;
        if (rw2Sub && movieData.genres) {
          rw2Sub.classList.remove('hidden');
          rw2Sub.textContent = "Matched on: " + movieData.genres.split('|').slice(0,3).join(' · ');
        }
      } else if (rw2Title) {
        rw2Title.textContent = "Your Favorites";
        if (rw2Sub) rw2Sub.classList.add('hidden');
      }
      fetchPopular();
    }
  } else {
    fetchPopular();
  }
}

/* ─── HOME SECTIONS RENDERER ──────────────────────────────────────────────────
   Renders 16 personalized content rows on the home page. Each section uses
   the same buildCard() + makeRowInfinite() engine as the rest of the app.
   TMDB mode: distinct endpoints + page offsets so each row has unique content.
   Offline mode: genre-accurate, hand-curated TMDB IDs per section.
──────────────────────────────────────────────────────────────────────────── */

export function renderHomeSections() {
  // Refresh the ML recommendations rows (rw1 & rw2) as well
  renderRows();

  // Cross-section deduplication — IDs seen in earlier (higher-priority) rows
  // are pushed to the end of later rows rather than shown first.
  const globalSeenIds = new Set();

  let onboardingDislikes = [];
  try { onboardingDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
  const dislikeSet = new Set(onboardingDislikes.map(id => String(id)));

  // TMDB genre IDs
  const GENRE = {
    action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
    drama: 18, family: 10751, fantasy: 14, history: 36, horror: 27,
    mystery: 9648, romance: 10749, scifi: 878, thriller: 53,
  };

  // ── ML Model: prepare user vectors for re-ranking ALL sections ──────────
  // Build synthetic ratings from onboarding signals + explicit ratings + watchlist
  // then precompute SVD & content vectors once (reused across all _fillRowTMDB calls)
  let _mlUvec = null;
  let _mlProfile = null;
  let _mlReady = false;

  // Store as a promise that _fillRowTMDB can await — ensures model is ready
  const _mlReadyPromise = loadModel().then(() => {
    const userRatings = buildUserRatingsFromOnboarding();
    const ratingCount = Object.keys(userRatings).length;
    if (ratingCount > 0) {
      const vectors = prepareUserVectors(userRatings);
      _mlUvec    = vectors.uvec;
      _mlProfile = vectors.profile;
      _mlReady   = true;
      console.log(`[ML-RERANK] Model ready — ${ratingCount} user signals, vectors prepared for re-ranking`);
    } else {
      console.log('[ML-RERANK] No user signals found — sections will use TMDB default ordering');
    }
  }).catch(e => {
    console.warn('[ML-RERANK] Model load failed, falling back to TMDB ordering:', e);
  });

  // Helper: populate a row element with TMDB discover results
  // Any ID already in globalSeenIds is pushed to the END of the row (not front)
  // After filtering, results are RE-RANKED by the ML model (SVD+content hybrid)
  async function _fillRowTMDB(rowId, url, limit = 20) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    row._infiniteInit = false;
    
    // Auto-append release date filter for discover queries to prevent unreleased movies
    if (url.includes('/discover/movie') && !url.includes('primary_release_date.lte')) {
      const today = new Date().toISOString().split('T')[0];
      url += `&primary_release_date.lte=${today}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('TMDB fetch failed');
      const data = await res.json();
      const all = (data.results || []).slice(0, limit + 10);
      const fresh = [];
      const repeats = [];
      all.forEach(item => {
        // Skip movies that haven't been released yet
        if (item.release_date && new Date(item.release_date) > new Date()) return;

        let currentDislikes = [];
        try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
        if (currentDislikes.some(id => String(id) === String(item.id))) return;
        if (globalSeenIds.has(item.id)) {
          repeats.push(item);
        } else {
          globalSeenIds.add(item.id);
          fresh.push(item);
        }
      });

      // Combine fresh + repeats, then ML re-rank before slicing to limit
      let combined = [...fresh, ...repeats];

      // ── ML RE-RANKING: wait for model, then sort by hybrid SVD+content score
      await _mlReadyPromise;
      if (_mlReady && _mlUvec) {
        combined = rerankByML(combined, _mlUvec, _mlProfile);
        console.log(`[ML-RERANK] ${rowId}: re-ranked ${combined.length} items by ML score`);
      }

      const toShow = combined.slice(0, limit);
      if (toShow.length === 0) return;
      toShow.forEach(item => row.appendChild(buildCard(item.id, item)));
      requestAnimationFrame(() => makeRowInfinite(row));
    } catch (e) {
      console.warn(`[renderHomeSections] ${rowId} fetch error:`, e);
    }
  }

  // Helper: populate a row element with TV show cards
  async function _fillRowTMDBTV(rowId, url, limit = 20) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    row._infiniteInit = false;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('TMDB TV fetch failed');
      const data = await res.json();
      const all = (data.results || []).slice(0, limit + 10);
      const fresh = [];
      const repeats = [];
      all.forEach(item => {
        const normalisedId = `tmdb-tv-${item.id}`;
        let currentDislikes = [];
        try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
        if (currentDislikes.some(id => String(id) === String(item.id)) || currentDislikes.some(id => String(id) === normalisedId)) return;
        const key = `tv-${item.id}`;
        if (globalSeenIds.has(key)) {
          repeats.push(item);
        } else {
          globalSeenIds.add(key);
          fresh.push(item);
        }
      });
      const toShow = [...fresh, ...repeats].slice(0, limit);
      if (toShow.length === 0) return;
      toShow.forEach(item => {
        const normalised = { ...item, id: `tmdb-tv-${item.id}`, title: item.name || item.title, release_date: item.first_air_date };
        row.appendChild(buildCard(normalised.id, normalised));
      });
      requestAnimationFrame(() => makeRowInfinite(row));
    } catch (e) {
      console.warn(`[renderHomeSections] ${rowId} TV fetch error:`, e);
    }
  }

  // Helper: populate a row from a static list of numeric/TMDB IDs
  function _fillRowOffline(rowId, ids) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    row._infiniteInit = false;
    const filteredIds = ids.filter(id => !dislikeSet.has(String(id)));
    filteredIds.forEach(id => row.appendChild(buildCard(id)));
    requestAnimationFrame(() => makeRowInfinite(row));
  }

  if (TMDB_API_KEY) {
    const K = TMDB_API_KEY;
    const base = 'https://api.themoviedb.org/3';
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    function customizeRowTitle(rowId, newTitleText) {
      const rowEl = document.getElementById(rowId);
      if (!rowEl) return;
      const sectionEl = rowEl.closest('section');
      if (!sectionEl) return;
      const titleEl = sectionEl.querySelector('.sec-title');
      if (titleEl) {
        const icon = titleEl.querySelector('i');
        titleEl.innerHTML = '';
        if (icon) titleEl.appendChild(icon);
        titleEl.appendChild(document.createTextNode(' ' + newTitleText));
      }
    }

    if (localStorage.getItem('swipe_onboarding_completed') === 'true') {
      (async () => {
        let onboardingGenres = [];
        let onboardingLanguages = [];
        let onboardingTalents = [];
        let onboardingLikes = [];
        let onboardingExcludedGenres = [];

        try { onboardingGenres = JSON.parse(localStorage.getItem('onboarding_genres') || '[]'); } catch(e){}
        try { onboardingLanguages = JSON.parse(localStorage.getItem('onboarding_languages') || '[]'); } catch(e){}
        try { onboardingTalents = JSON.parse(localStorage.getItem('onboarding_talents') || '[]'); } catch(e){}
        try { onboardingLikes = JSON.parse(localStorage.getItem('onboarding_likes') || '[]'); } catch(e){}
        try { onboardingExcludedGenres = JSON.parse(localStorage.getItem('onboarding_excluded_genres') || '[]'); } catch(e){}

        const genreMap = {
          28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
          18: "Drama", 10751: "Family", 14: "Fantasy", 27: "Horror", 9648: "Mystery",
          10749: "Romance", 878: "Sci-Fi", 53: "Thriller"
        };
        const langNames = { en: "English", es: "Spanish", fr: "French", ja: "Japanese", ko: "Korean", hi: "Hindi" };
        const excludedStr = onboardingExcludedGenres.length > 0 ? `&without_genres=${onboardingExcludedGenres.join(',')}` : '';

        customizeRowTitle('hs-new-releases', 'Top Picks for You');
        const hsNewReleases = document.getElementById('hs-new-releases');
        if (hsNewReleases) {
          hsNewReleases.innerHTML = '';
          hsNewReleases._infiniteInit = false;
          
          let likedId = null;
          if (onboardingLikes.length > 0) {
            likedId = onboardingLikes[Math.floor(Math.random() * onboardingLikes.length)];
          }

          let fetchUrl = likedId 
            ? `${base}/movie/${likedId}/recommendations?api_key=${K}&page=1`
            : `${base}/movie/now_playing?api_key=${K}&page=1`;

          try {
            const res = await fetch(fetchUrl).then(r => r.json());
            let recs = res.results || [];
            
            let currentDislikes = [];
            try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
            const dislikeSet = new Set(currentDislikes.map(id => String(id)));

            let filtered = recs.filter(m => !dislikeSet.has(String(m.id)) && !(m.release_date && new Date(m.release_date) > new Date()));

            // Filter strictly by preferred language and genres
            let finalRecs = filtered.filter(m => {
              const matchesLang = onboardingLanguages.length === 0 || onboardingLanguages.includes(m.original_language);
              const matchesGenre = onboardingGenres.length === 0 || (m.genre_ids || []).some(gId => onboardingGenres.includes(gId));
              return matchesLang && matchesGenre;
            });

            // Backfill if needed
            if (finalRecs.length < 20 && (onboardingLanguages.length > 0 || onboardingGenres.length > 0)) {
              const genreStr = onboardingGenres.join(',');
              const langStr = onboardingLanguages.join('|');
              let discoverUrl = `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&page=1`;
              if (genreStr) discoverUrl += `&with_genres=${genreStr}`;
              if (langStr) discoverUrl += `&with_original_language=${langStr}`;

              const backfillRes = await fetch(discoverUrl).then(r => r.json());
              if (backfillRes.results) {
                const seen = new Set(finalRecs.map(m => m.id));
                backfillRes.results.forEach(m => {
                  if (!seen.has(m.id) && !dislikeSet.has(String(m.id))) {
                    seen.add(m.id);
                    finalRecs.push(m);
                  }
                });
              }
            }

            finalRecs = finalRecs.slice(0, 20);

            // ── ML RE-RANKING for Top Picks ────────────────────────
            await _mlReadyPromise;
            if (_mlReady && _mlUvec) {
              finalRecs = rerankByML(finalRecs, _mlUvec, _mlProfile);
              console.log(`[ML-RERANK] hs-new-releases (Top Picks): re-ranked ${finalRecs.length} items by ML score`);
            }

            finalRecs.forEach(item => hsNewReleases.appendChild(buildCard(item.id, item)));
            requestAnimationFrame(() => makeRowInfinite(hsNewReleases));
          } catch (e) {
            console.error("hs-new-releases curation failed:", e);
          }
        }
        await delay(100);

        const chosenGenreId = onboardingGenres[0] || 28;
        const genreName = genreMap[chosenGenreId] || 'Action';
        customizeRowTitle('hs-hidden-gems', `Because you like ${genreName}`);
        _fillRowTMDB('hs-hidden-gems', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=${chosenGenreId}${excludedStr}&page=1`);
        await delay(100);

        const chosenLangCode = onboardingLanguages[0] || 'en';
        const langName = langNames[chosenLangCode] || 'English';
        customizeRowTitle('hs-genres-you-love', `Trending in ${langName}`);
        _fillRowTMDB('hs-genres-you-love', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_original_language=${chosenLangCode}${excludedStr}&page=1`);
        await delay(100);

        if (onboardingTalents.length > 0) {
          const talent = onboardingTalents[0];
          customizeRowTitle('hs-classics', `Spotlight on ${talent.name}`);
          _fillRowTMDB('hs-classics', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_people=${talent.id}&page=1`);
        } else {
          customizeRowTitle('hs-classics', 'Classics');
          _fillRowTMDB('hs-classics', `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&vote_count.gte=5000&primary_release_date.lte=1989-12-31${excludedStr}&page=1`);
        }
        await delay(100);

        _fillRowTMDB('hs-award-winning', `${base}/discover/movie?api_key=${K}&sort_by=revenue.desc&vote_average.gte=8.0&vote_count.gte=10000${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-critically-acclaimed', `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&vote_count.gte=8000${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-scifi', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=878${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-action', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=28${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-comedy', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=35${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-thriller', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=53,9648${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-family', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=10751${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-animation', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=16${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDBTV('hs-binge-tv', `${base}/discover/tv?api_key=${K}&sort_by=popularity.desc&with_original_language=en&page=1`);
        await delay(100);
        _fillRowTMDB('hs-recently-added', `${base}/discover/movie?api_key=${K}&sort_by=release_date.desc&vote_count.gte=100${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-most-rewatched', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&vote_count.gte=8000${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-editors-picks', `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&vote_average.gte=7.5${excludedStr}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-popular-atlass', `${base}/movie/popular?api_key=${K}&page=1`);
        await delay(100);
        _fillRowTMDB('hs-currently-trending', `${base}/trending/movie/day?api_key=${K}`);
      })();
      return;
    }

    (async () => {
      // Each section uses a structurally different TMDB endpoint or filter combination
      // so the server itself returns a distinct result set � not just page offsets of the same list.

      // 1. New Releases � movies currently in theatres (now_playing endpoint)
      //    Completely separate endpoint; zero overlap with discover-based rows.
      _fillRowTMDB('hs-new-releases',
        `${base}/movie/now_playing?api_key=${K}&page=1`);

      await delay(100);

      // 2. Hidden Gems � genuinely obscure quality films
      //    popularity.lte=15 removes every mainstream title.
      //    vote_count 200�3000 = beloved by those who found it, ignored by the masses.
      _fillRowTMDB('hs-hidden-gems',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&vote_average.gte=7.8&vote_count.gte=200&vote_count.lte=3000&popularity.lte=15&page=1`);

      await delay(100);

      // 3. Genres You Love � user's saved genre, popularity-sorted page 2
      //    popularity sort (not vote_average) gives a different ranked order
      //    than all quality-sorted genre rows below.
      const favGenresRaw = localStorage.getItem('fav_genres');
      let favGenreId = GENRE.drama;
      try {
        const fg = JSON.parse(favGenresRaw || '[]');
        const gm = { action:28, adventure:12, animation:16, comedy:35, crime:80, drama:18, fantasy:14, horror:27, romance:10749, 'sci-fi':878, thriller:53 };
        if (fg.length > 0) favGenreId = gm[fg[0].toLowerCase()] || 18;
      } catch(e) {}
      _fillRowTMDB('hs-genres-you-love',
        `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=${favGenreId}&vote_count.gte=500&page=2`);

      await delay(100);

      // 4. Classics � released before 1990, enormous vote counts = stood the test of time
      //    Hard date ceiling guarantees zero overlap with any modern-era section.
      _fillRowTMDB('hs-classics',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&vote_count.gte=5000&primary_release_date.lte=1989-12-31&page=1`);

      await delay(100);

      // 5. Award-Winning � certified cultural landmarks
      //    vote_avg >= 8.0 + vote_count >= 10000 = universally beloved AND widely seen.
      //    revenue sort = box-office / prestige proxy (Oscars go to big films).
      _fillRowTMDB('hs-award-winning',
        `${base}/discover/movie?api_key=${K}&sort_by=revenue.desc&vote_average.gte=8.0&vote_count.gte=10000&page=1`);

      await delay(100);

      // 6. Critically Acclaimed � pure editorial quality signal, NO genre filter, NO revenue sort
      //    vote_avg desc + high vote floor (8000+) = critical consensus across all genres.
      //    Structurally different from Award-Winning (different sort + different vote threshold).
      _fillRowTMDB('hs-critically-acclaimed',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&vote_count.gte=8000&primary_release_date.gte=1990-01-01&page=1`);

      await delay(100);

      // 7. Sci-Fi Essentials � hard-locked to genre 878, quality-sorted
      _fillRowTMDB('hs-scifi',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&with_genres=${GENRE.scifi}&vote_count.gte=1500&page=1`);

      await delay(100);

      // 8. Action Blockbusters � hard-locked to genre 28, revenue-sorted
      //    Revenue sort = only the biggest cultural spectacles surface here.
      _fillRowTMDB('hs-action',
        `${base}/discover/movie?api_key=${K}&sort_by=revenue.desc&with_genres=${GENRE.action}&vote_count.gte=3000&page=1`);

      await delay(100);

      // 9. Comedy Picks � hard-locked to genre 35, quality-sorted, page 2
      //    Page 2 offsets away from the most obvious top-20 comedies.
      _fillRowTMDB('hs-comedy',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&with_genres=${GENRE.comedy}&vote_count.gte=1000&page=2`);

      await delay(100);

      // 10. Thriller & Mystery � genre 53, popularity-sorted (different metric from vote_avg rows)
      _fillRowTMDB('hs-thriller',
        `${base}/discover/movie?api_key=${K}&sort_by=popularity.desc&with_genres=${GENRE.thriller}&vote_count.gte=1500&page=1`);

      await delay(100);

      // 11. Family Favorites � hard-locked to genre 10751, quality-sorted
      _fillRowTMDB('hs-family',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&with_genres=${GENRE.family}&vote_count.gte=800&page=1`);

      await delay(100);

      // 12. Animation Collection � hard-locked to genre 16, quality-sorted
      _fillRowTMDB('hs-animation',
        `${base}/discover/movie?api_key=${K}&sort_by=vote_average.desc&with_genres=${GENRE.animation}&vote_count.gte=2000&page=1`);

      await delay(100);

      // 13. Binge-Worthy TV Shows � TV endpoint, entirely separate content type
      _fillRowTMDBTV('hs-binge-tv',
        `${base}/tv/top_rated?api_key=${K}&page=${1 + Math.floor(Math.random()*3)}`);

      await delay(100);

      // 14. Recently Added � upcoming pipeline (pre-release, not yet on now_playing)
      _fillRowTMDB('hs-recently-added',
        `${base}/movie/upcoming?api_key=${K}&page=1`);

      await delay(100);

      // 15. Most Rewatched � pure popularity signal, pages 5-10
      //     sort_by=popularity.desc on deeper pages = popular but not trending right now.
      _fillRowTMDB('hs-most-rewatched',
        `${base}/movie/popular?api_key=${K}&page=${5 + Math.floor(Math.random()*6)}`);

      await delay(100);

      // 16. Editor's Picks � balanced art + commerce, 2000�2019 window
      //     Date range is the hard differentiator: excludes Classics (pre-1990),
      //     New Releases & Upcoming, and Recent (post-2020).
      _fillRowTMDB('hs-editors-picks',
        `${base}/discover/movie?api_key=${K}&sort_by=revenue.desc&vote_average.gte=7.5&vote_count.gte=5000&primary_release_date.gte=2000-01-01&primary_release_date.lte=2019-12-31&page=1`);

      await delay(100);

      // 17. Popular on Atlass � weekly trending (time-decayed velocity signal)
      //     Trending uses a different ranking algorithm from popularity or vote_average.
      _fillRowTMDB('hs-popular-atlass',
        `${base}/trending/movie/week?api_key=${K}&page=1`);
    })();
  } else {
    // ── Offline fallback — genre-accurate, hand-curated TMDB IDs ──
    // IDs are real TMDB movie IDs matching each section's theme.
    // Any title that genuinely belongs in multiple sections appears only at
    // the END of the repeat section (first-seen section gets priority position).

    const sets = {
      // New Releases — 2023-2025 releases (Dune 2, Oppenheimer, Poor Things, Killers…)
      'hs-new-releases':         [968051, 872585, 792307, 940721, 466420, 507089, 609681, 848326, 634649, 786892, 447365, 447277, 565770, 933131, 569094, 615777],

      // Hidden Gems — critically loved but underseen (Anatomy of a Fall, Zone of Interest, Past Lives…)
      'hs-hidden-gems':          [915935, 467244, 940721, 385687, 346698, 299534, 286217, 337167, 395990, 391713, 258480, 205596, 290098, 293660, 337167, 361743],

      // Genres You Love — broad drama/romance/character-driven picks
      'hs-genres-you-love':      [238, 346, 389, 129, 598, 19404, 372058, 348, 783, 807, 38, 274, 637, 769, 745, 599],

      // Classics — pre-2000 cinematic greats (Shawshank, Godfather, Schindler's…)
      'hs-classics':             [278, 240, 424, 389, 129, 13, 122, 311, 637, 769, 745, 429, 599, 510, 857, 11, 76],

      // Award-Winning — Oscar / Golden Globe decorated (different IDs from Critically Acclaimed)
      'hs-award-winning':        [424, 389, 129, 274, 510, 637, 769, 857, 429, 599, 348, 598, 783, 19404, 372058, 807],

      // Critically Acclaimed — universal critical praise / near-perfect scores
      'hs-critically-acclaimed': [278, 238, 240, 680, 155, 122, 346, 13, 50, 807, 120, 12477, 539, 949, 396535, 862],

      // Sci-Fi Essentials — space, AI, time, aliens (Interstellar, 2001, Arrival, Gravity…)
      'hs-scifi':                [157336, 329865, 49047, 62, 1891, 1892, 76, 603, 245891, 271110, 9806, 299534, 438631, 329865, 508442, 300671],

      // Action Blockbusters — iconic high-octane spectacles (Dark Knight, Avengers, Mad Max…)
      'hs-action':               [155, 24428, 49026, 299537, 1891, 1893, 1894, 118340, 127380, 102382, 56292, 49047, 76341, 10138, 99861, 284054],

      // Comedy Picks — best comedies across eras (Toy Story, Home Alone, Bridesmaids…)
      'hs-comedy':               [862, 11, 14, 105, 120, 538, 12445, 1091, 2062, 949, 539, 745, 1892, 2109, 2300, 97020],

      // Thriller & Mystery — keep-you-guessing films (Se7en, Prestige, Parasite…)
      'hs-thriller':             [680, 9806, 297761, 315162, 438631, 274, 807, 194, 587, 629, 12160, 22970, 539, 694, 12, 38],

      // Family Favorites — wholesome for all ages (Lion King, Toy Story, Up, Coco…)
      'hs-family':               [8587, 10681, 585, 364, 508442, 12, 920, 597, 10193, 12429, 863, 9806, 268, 9479, 270946, 14836],

      // Animation Collection — Pixar, Ghibli, DreamWorks masterworks
      'hs-animation':            [10681, 808, 862, 14, 9806, 150540, 508442, 12429, 920, 129, 420817, 568124, 10193, 863, 615, 81188],

      // Binge-Worthy TV Shows — series-adjacent epic movies for binge mood
      'hs-binge-tv':             [278, 238, 389, 807, 155, 348, 346, 13, 424, 240, 129, 19404, 274, 769, 637, 680],

      // Recently Added — simulate "just hit platforms" (recent & popular)
      'hs-recently-added':       [634649, 786892, 569094, 615777, 507089, 609681, 848326, 447277, 565770, 933131, 299534, 508442, 440161, 718789, 399566, 460465],

      // Most Rewatched — timeless rewatchables (Star Wars, LOTR, Shawshank…)
      'hs-most-rewatched':       [11, 122, 120, 1891, 278, 238, 862, 13, 550, 10138, 157336, 680, 1892, 1893, 329865, 49047],

      // Editor's Picks — cultural landmarks balancing art + box office (Inception, Parasite…)
      'hs-editors-picks':        [27205, 496243, 157336, 329865, 872585, 466420, 792307, 49047, 155, 122, 24428, 238, 278, 968051, 940721, 915935],

      // Popular on Atlass — trending variety mix (different from top picks & new releases)
      'hs-popular-atlass':       [680, 155, 122, 24428, 299537, 346, 238, 157336, 329865, 49026, 872585, 792307, 466420, 968051, 940721, 915935],
    };

    // Cross-section deduplication for offline: same as live mode logic —
    // IDs seen in earlier sections appear at the END of later ones, not the start.
    const offlineSeen = new Set();
    Object.entries(sets).forEach(([rowId, ids]) => {
      const seen = new Set();
      const fresh = [];
      const repeats = [];
      ids.forEach(id => {
        if (seen.has(id)) return; // intra-row duplicate, skip entirely
        seen.add(id);
        if (offlineSeen.has(id)) {
          repeats.push(id);
        } else {
          offlineSeen.add(id);
          fresh.push(id);
        }
      });
      _fillRowOffline(rowId, [...fresh, ...repeats]);
    });
  }
}

/* ─── INFINITE SCROLL ENGINE ─────────────────────────────────────────────────
   Strategy: pre-fill a large buffer (3 copies each side) so the user never
   reaches the edge during normal scrolling. A scroll listener silently tops
   up clones only when the buffer runs low — the prepend compensation is done
   BEFORE the browser paints by setting scrollLeft synchronously inside the
   same rAF tick that measures the width difference, preventing any visible jump.
──────────────────────────────────────────────────────────────────────────── */

export function makeRowInfinite(el) {
  if (!el || el._infiniteInit) return;

  const snapshot = Array.from(el.children);
  if (snapshot.length < 2) return;

  el._infiniteInit = true;

  function rewireClone(clone, originalIndex) {
    const orig = snapshot[originalIndex % snapshot.length];
    clone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      orig.click();
    });
    const cloneBtns = clone.querySelectorAll('button');
    const origBtns  = orig.querySelectorAll('button');
    cloneBtns.forEach((btn, i) => {
      if (origBtns[i]) btn.addEventListener('click', (e) => {
        e.stopPropagation();
        origBtns[i].click();
      });
    });
    clone.addEventListener('mouseenter', () => {
      const details = orig._popupDetails;
      if (details) schedulePopup(details, clone);
    });
    clone.addEventListener('mouseleave', () => cancelPopup());
  }

  function appendBatch() {
    snapshot.forEach((child, i) => {
      const clone = child.cloneNode(true);
      clone.dataset.cloned = 'true';
      rewireClone(clone, i);
      el.appendChild(clone);
    });
  }

  function prependBatch() {
    [...snapshot].reverse().forEach((child, ri) => {
      const i = snapshot.length - 1 - ri;
      const clone = child.cloneNode(true);
      clone.dataset.cloned = 'true';
      rewireClone(clone, i);
      el.insertBefore(clone, el.firstChild);
    });
  }

  // Pre-fill 3 copies each side — plenty of buffer for any scroll speed
  const BUFFER = 3;
  for (let b = 0; b < BUFFER; b++) prependBatch();
  for (let b = 0; b < BUFFER; b++) appendBatch();

  // Measure one full copy width and jump to the start of the real middle section
  const gap = parseInt(getComputedStyle(el).gap || getComputedStyle(el).columnGap || '0') || 0;
  const batchWidth = snapshot.reduce((sum, c) => sum + c.offsetWidth + gap, 0);
  // Disable smooth scroll temporarily so the jump is instant
  const prevScrollBehavior = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';
  el.scrollLeft = batchWidth * BUFFER;
  el.style.scrollBehavior = prevScrollBehavior;

  let ticking = false;

  el.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const threshold = clientWidth * 2;

      if (scrollLeft + clientWidth >= scrollWidth - threshold) {
        appendBatch();
      }

      if (scrollLeft <= threshold) {
        // Measure added width and compensate synchronously — no visible jump
        const before = el.scrollWidth;
        prependBatch();
        const added = el.scrollWidth - before;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft += added;
        el.style.scrollBehavior = prevScrollBehavior;
      }

      ticking = false;
    });
  }, { passive: true });
}

export function scrollRow(id, dir) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 540, behavior: 'smooth' });
}

export function scrollTrend(dir) {
  const el = document.getElementById('trend-row');
  if (el) el.scrollBy({ left: dir * 580, behavior: 'smooth' });
}

/* ─── PLATFORM BROWSER WIRING ─── */
export function buildPlatforms() {
  const tabsEl   = document.getElementById('plat-tabs');
  const panelsEl = document.getElementById('plat-panels');
  if (!tabsEl || !panelsEl) return;

  tabsEl.innerHTML = '';
  panelsEl.innerHTML = '';

  const platformsList = TMDB_API_KEY ? LIVE_PLATFORMS : PLATFORMS_DATA;

  platformsList.forEach((plat) => {
    const tab = document.createElement('button');
    tab.className = 'plat-tab' + (plat.id === state.activePlatform ? ' active' : '');
    tab.dataset.id = plat.id;
    tab.innerHTML = `<i class="${plat.icon}" style="color:${plat.color}"></i>${plat.name}`;
    tab.onclick = () => { playClick(); switchPlatform(plat.id); };
    tabsEl.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = 'platform-panel' + (plat.id === state.activePlatform ? ' active' : '');
    panel.id = 'panel-' + plat.id;
    panel.innerHTML = `
      <div class="plat-wrap" id="pw-${plat.id}">
        <div class="plat-arr L" onclick="scrollPlat('${plat.id}',-1)"><i class="fa-solid fa-chevron-left"></i></div>
        <div class="plat-row" id="pr-${plat.id}"></div>
        <div class="plat-arr R" onclick="scrollPlat('${plat.id}',1)"><i class="fa-solid fa-chevron-right"></i></div>
      </div>
      <div class="plat-load-more" id="plm-${plat.id}" style="display:none; text-align:center; padding:30px 0;">
        <button class="btn-primary" onclick="loadMorePlatform('${plat.id}')">
          <i class="fa-solid fa-circle-plus"></i> Load More
        </button>
      </div>`;
    panelsEl.appendChild(panel);

    const platWrap = panel.querySelector('.plat-wrap');
    if (platWrap) injectGradualBlurs(platWrap);

    renderPlatCards(plat.id, state.activeType);
  });
}

export function renderPlatCards(platId, type) {
  const row = document.getElementById('pr-' + platId);
  if (!row) return;
  row.innerHTML = '';
  row._infiniteInit = false; // allow re-initialization after content is replaced

  if (TMDB_API_KEY) {
    const plat = LIVE_PLATFORMS.find(p => p.id === platId);
    if (!plat) return;
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    fetch(`https://api.themoviedb.org/3/discover/${tmdbType}?api_key=${TMDB_API_KEY}&with_watch_providers=${plat.providerId}&watch_region=US&sort_by=popularity.desc`)
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          data.results.slice(0, 15).forEach(item => {
            const card = document.createElement('div');
            card.className = 'plat-card';
            card.dataset.id = item.id;
            const cleanTitle = item.title || item.name;
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '7.0';
            const year = item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
            
            card.innerHTML = `
              <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity: 1;"/>
              <div class="plat-card-overlay"></div>
              <div class="plat-card-badge badge-${type}">${type === 'series' ? 'Series' : 'Movie'}</div>
              <div class="plat-card-info">
                <div class="plat-card-title">${cleanTitle}</div>
                <div class="plat-card-meta">${year} · ★ ${rating}</div>
                <div class="plat-card-actions">
                  <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
                  <button class="pca-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
                </div>
              </div>`;
            
            let resolvedDetails = {
              id: item.id,
              type: type === 'series' ? 'series' : 'movie',
              title: cleanTitle,
              year: year,
              match: 90,
              rating: rating,
              runtime: type === 'series' ? 'Series' : 'N/A',
              genre: 'Drama',
              synopsis: item.overview || 'Loading details from TMDb...',
              poster: poster,
              backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : poster,
              platforms: [plat.name],
              reasons: [type === 'series' ? 'Popular Series' : 'Popular Choice'],
              cast: [],
              director: []
            };
            card._popupDetails = resolvedDetails; // expose for clones immediately

            if (type === 'movie') {
              fetchTMDBDetails(item.id).then(details => {
                if(!details) return;
                resolvedDetails = details;
                card._popupDetails = details; // expose for clones
                if (state.currentPopupMovie && state.currentPopupMovie.id === item.id) showPopup(details, card);
              });
            } else {
              fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`)
                .then(res => { if(!res.ok) throw new Error("TMDB network error"); return res.json(); })
                .then(tvData => {
                  if(!tvData.name) return;
                  resolvedDetails = {
                    id: tvData.id, type: 'series', title: tvData.name,
                    year: tvData.first_air_date ? tvData.first_air_date.split('-')[0] : 'N/A',
                    rating: tvData.vote_average ? tvData.vote_average.toFixed(1) : '7.0',
                    genre: tvData.genres && tvData.genres.length > 0 ? tvData.genres.map(g=>g.name).join(' · ') : 'Drama',
                    synopsis: tvData.overview || 'No synopsis available.',
                    poster: tvData.poster_path ? `https://image.tmdb.org/t/p/w500${tvData.poster_path}` : poster,
                    backdrop: tvData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tvData.backdrop_path}` : (item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : poster),
                    platforms: [plat.name], reasons: ['Popular Series'],
                    cast: tvData.credits && tvData.credits.cast ? tvData.credits.cast.slice(0, 5).map(c => ({
                      name: c.name,
                      character: c.character || 'Cast Member',
                      img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
                    })) : [],
                    director: tvData.created_by && tvData.created_by.length > 0 ? tvData.created_by.map(c => ({
                      name: c.name,
                      img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
                    })) : [{ name: "Creator", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }]
                  };
                  card._popupDetails = resolvedDetails; // expose for clones
                  if (state.currentPopupMovie && state.currentPopupMovie.id === item.id) showPopup(resolvedDetails, card);
                })
                .catch(e => console.warn("TV details fetch error:", e));
            }

            const handleOpen = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) openModal(resolvedDetails); };
            const handleAdd = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) toggleWatchlist(resolvedDetails); };

            card.addEventListener('click', () => handleOpen(null));
            card.querySelector('.pca-btn.play').addEventListener('click', e => handleOpen(e));
            card.querySelector('.pca-btn.add').addEventListener('click', handleAdd);
            card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || { id: item.id, title: cleanTitle, poster, match: 90, rating, cert: 'PG-13' }, card));
            card.addEventListener('mouseleave', () => cancelPopup());
            row.appendChild(card);
          });
          // Infinite scroll — seamless loop in both directions
          requestAnimationFrame(() => makeRowInfinite(row));
        }
      });
    return;
  }

  const plat = PLATFORMS_DATA.find(p => p.id === platId);
  if (!plat) return;
  const list = type === 'series' ? plat.series : plat.movies;
  list.forEach(m => {
    const card = document.createElement('div');
    card.className = 'plat-card';
    card.dataset.id = m.id;
    card.innerHTML = `
      <img src="${m.poster}" alt="${m.title}"/>
      <div class="plat-card-overlay"></div>
      <div class="plat-card-badge badge-${type}">${type === 'series' ? 'Series' : 'Movie'}</div>
      <div class="plat-card-info">
        <div class="plat-card-title">${m.title}</div>
        <div class="plat-card-meta">${m.year} · ★ ${m.rating}</div>
        <div class="plat-card-actions">
          <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
          <button class="pca-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
        </div>
      </div>`;

    let resolvedDetails = null;
    const playBtn = card.querySelector('.pca-btn.play');
    const addBtn = card.querySelector('.pca-btn.add');

    const handleOpen = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) openModal(resolvedDetails); };
    const handleAdd = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) toggleWatchlist(resolvedDetails); };

    card.addEventListener('click', () => handleOpen(null));
    playBtn.addEventListener('click', e => handleOpen(e));
    addBtn.addEventListener('click', handleAdd);

    // Attach hover popup immediately with a quick fallback, updated when details resolve
    const quickFallback = { id: m.id, title: m.title, poster: m.poster, match: 85, rating: m.rating, cert: 'PG-13', genre: m.genre || '' };
    card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || quickFallback, card));
    card.addEventListener('mouseleave', () => cancelPopup());

    fetchTMDBDetails(m.id).then(details => {
      if (!details) return;
      resolvedDetails = details;
      card._popupDetails = details; // expose for clones
    });

    row.appendChild(card);
  });
  // Infinite scroll — seamless loop in both directions
  requestAnimationFrame(() => makeRowInfinite(row));
}

window.loadMorePlatform = async function(platId) {
  const row = document.getElementById('pr-' + platId);
  const btn = document.querySelector(`#plm-${platId} button`);
  if (!row || !btn || btn.disabled) return;
  
  let page = parseInt(row.dataset.tmdbPage || '1') + 1;
  const type = state.activeType;
  const tmdbType = type === 'series' ? 'tv' : 'movie';
  const plat = LIVE_PLATFORMS.find(p => p.id === platId);
  
  if (!TMDB_API_KEY || !plat) return;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/discover/${tmdbType}?api_key=${TMDB_API_KEY}&with_watch_providers=${plat.providerId}&watch_region=US&sort_by=popularity.desc&page=${page}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      row.dataset.tmdbPage = page;
      data.results.forEach((item, index) => {
        if (row.querySelector(`.plat-card[data-id="${item.id}"]`)) return;

        const card = document.createElement('div');
        card.className = 'plat-card';
        card.dataset.id = item.id;
        const cleanTitle = item.title || item.name;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : '7.0';
        const year = item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
        
        card.innerHTML = `
          <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity: 1;"/>
          <div class="plat-card-overlay"></div>
          <div class="plat-card-badge badge-${type}">${type === 'series' ? 'Series' : 'Movie'}</div>
          <div class="plat-card-info">
            <div class="plat-card-title">${cleanTitle}</div>
            <div class="plat-card-meta">${year} · ★ ${rating}</div>
            <div class="plat-card-actions">
              <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
              <button class="pca-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
            </div>
          </div>`;
        
        let resolvedDetails = {
          id: item.id, type: type === 'series' ? 'series' : 'movie', title: cleanTitle, year: year, match: 90, rating: rating,
          runtime: type === 'series' ? 'Series' : 'N/A', genre: 'Drama', synopsis: item.overview || 'Loading details...',
          poster: poster, backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : poster,
          platforms: [plat.name], reasons: [type === 'series' ? 'Popular Series' : 'Popular Choice'], cast: [], director: []
        };
        card._popupDetails = resolvedDetails;

        if (type === 'movie') {
          fetchTMDBDetails(item.id).then(details => {
            if(!details) return;
            resolvedDetails = details;
            card._popupDetails = details;
          });
        } else {
          fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`)
            .then(res => { if(!res.ok) throw new Error("TMDB network error"); return res.json(); })
            .then(tvData => {
              if(!tvData.name) return;
              resolvedDetails = {
                id: tvData.id, type: 'series', title: tvData.name,
                year: tvData.first_air_date ? tvData.first_air_date.split('-')[0] : 'N/A',
                rating: tvData.vote_average ? tvData.vote_average.toFixed(1) : '7.0',
                genre: tvData.genres && tvData.genres.length > 0 ? tvData.genres.map(g=>g.name).join(' · ') : 'Drama',
                synopsis: tvData.overview || 'No synopsis available.',
                poster: tvData.poster_path ? `https://image.tmdb.org/t/p/w500${tvData.poster_path}` : poster,
                backdrop: tvData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tvData.backdrop_path}` : (item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : poster),
                platforms: [plat.name], reasons: ['Popular Series'],
                cast: tvData.credits && tvData.credits.cast ? tvData.credits.cast.slice(0, 5).map(c => ({
                  name: c.name, character: c.character || 'Cast',
                  img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
                })) : [],
                director: tvData.created_by && tvData.created_by.length > 0 ? tvData.created_by.map(c => ({
                  name: c.name, img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
                })) : [{ name: "Creator", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }]
              };
              card._popupDetails = resolvedDetails;
            })
            .catch(e => console.warn(e));
        }

        const handleOpen = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) openModal(resolvedDetails); };
        const handleAdd = (e) => { if (e) e.stopPropagation(); if (resolvedDetails) toggleWatchlist(resolvedDetails); };

        card.addEventListener('click', () => handleOpen(null));
        card.querySelector('.pca-btn.play').addEventListener('click', e => handleOpen(e));
        card.querySelector('.pca-btn.add').addEventListener('click', handleAdd);
        card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails, card));
        card.addEventListener('mouseleave', () => cancelPopup());
        
        card.classList.add('entering');
        card.style.animationDelay = `${(index % 16) * 30}ms`;
        
        row.appendChild(card);
      });
      if (data.page >= data.total_pages) {
         btn.parentElement.classList.add('hidden');
      }
    } else {
       btn.parentElement.classList.add('hidden');
    }
  } catch(e) {
    console.error(e);
  }
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More';
};

export function switchPlatform(platId) {
  state.activePlatform = platId;
  buildPlatforms();
}

export function setType(type) {
  state.activeType = type;
  const moviePill = document.getElementById('pill-movies') || document.getElementById('type-movie');
  const seriesPill = document.getElementById('pill-series') || document.getElementById('type-show');
  if (moviePill) moviePill.classList.toggle('active', type === 'movies');
  if (seriesPill) seriesPill.classList.toggle('active', type === 'series');
  buildPlatforms();
}

export function scrollPlat(platId, dir) {
  const el = document.getElementById('pr-' + platId);
  if (el) el.scrollBy({ left: dir * 600, behavior: 'smooth' });
}

/* ─── WATCHLIST LOGIC ─── */
export function toggleWatchlist(movie) {
  const idx = state.watchlist.findIndex(m => String(m.id) === String(movie.id));
  if (idx > -1) {
    state.watchlist.splice(idx, 1);
  } else {
    state.watchlist.push(movie);
  }
  saveWatchlistToStorage();
  updateWatchlistUI();
  updateWLCount();
  syncWatchlistButtons();
  
  if (state.movieLensData.loaded) {
    initializeRecommender();
  }
}

export function addToWatchlist(movie, triggerEl) {
  if (state.watchlist.some(m => String(m.id) === String(movie.id))) return;
  state.watchlist.push(movie);
  saveWatchlistToStorage();
  updateWatchlistUI();
  updateWLCount();
  syncWatchlistButtons();
  
  if (state.movieLensData.loaded) {
    initializeRecommender();
  }

  // Animation effect
  if (triggerEl) {
    triggerEl.style.transform = 'scale(1.4)';
    setTimeout(() => { triggerEl.style.transform = ''; }, 220);
  }
}

export function removeFromWatchlist(id) {
  state.watchlist = state.watchlist.filter(m => String(m.id) !== String(id));
  saveWatchlistToStorage();
  updateWatchlistUI();
  updateWLCount();
  syncWatchlistButtons();
  
  if (state.movieLensData.loaded) {
    initializeRecommender();
  }
}

export function syncWatchlistButtons() {
  // Quick adds
  document.querySelectorAll('.card-quick-add').forEach(btn => {
    const mid = btn.dataset.id;
    const isAdded = state.watchlist.some(m => String(m.id) === String(mid));
    btn.classList.toggle('added', isAdded);
    btn.innerHTML = isAdded ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' : '<i class="fa-solid fa-plus" style="font-size:9px"></i>';
    btn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
  });

  // Trending add buttons
  document.querySelectorAll('.trend-card').forEach(card => {
    const mid = card.dataset.id;
    const btn = card.querySelector('.trend-btn.add');
    if (btn) {
      const isAdded = state.watchlist.some(m => String(m.id) === String(mid));
      btn.classList.toggle('added', isAdded);
      btn.innerHTML = isAdded ? '<i class="fa-solid fa-check" style="font-size:9px"></i> Added' : '<i class="fa-solid fa-plus" style="font-size:9px"></i> Add';
    }
  });

  // Platform add buttons
  document.querySelectorAll('.plat-card').forEach(card => {
    const mid = card.dataset.id;
    const btn = card.querySelector('.pca-btn.add');
    if (btn) {
      const isAdded = state.watchlist.some(m => String(m.id) === String(mid));
      btn.classList.toggle('added', isAdded);
      btn.innerHTML = isAdded ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' : '<i class="fa-solid fa-plus" style="font-size:9px"></i>';
    }
  });

  // Hero watchlist button
  if (state.currentHeroMovie) {
    const wlBtn = document.getElementById('hero-wl-btn');
    if (wlBtn) {
      const isAdded = state.watchlist.some(m => String(m.id) === String(state.currentHeroMovie.id));
      wlBtn.innerHTML = isAdded ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
      wlBtn.title = isAdded ? 'In watchlist' : 'Add to watchlist';
    }
  }

  // Details modal watchlist button
  if (state.currentModalMovie) {
    const wlBtnNew = document.getElementById('m-add-wl-new');
    if (wlBtnNew) {
      const isAdded = state.watchlist.some(m => String(m.id) === String(state.currentModalMovie.id));
      wlBtnNew.classList.toggle('added', isAdded);
      wlBtnNew.textContent = isAdded ? 'In Watchlist' : 'Add to Watchlist';
    }
  }

  // Settings/Roulette prompts
  const count = state.watchlist.length;
  const prompt = document.getElementById('roulette-prompt');
  const countEl = document.getElementById('rp-count');
  if (prompt && countEl) {
    countEl.textContent = count;
    if (count >= 2) {
      prompt.classList.remove('hidden');
      setTimeout(() => prompt.style.opacity = '1', 50);
      setTimeout(() => prompt.style.transform = 'translateY(0)', 50);
    } else {
      prompt.style.opacity = '0';
      prompt.style.transform = 'translateY(14px)';
      setTimeout(() => prompt.classList.add('hidden'), 450);
    }
  }
}

export function updateWLCount() {
  const badge = document.getElementById('wl-count');
  if (badge) {
    badge.textContent = state.watchlist.length;
    badge.classList.toggle('pop', state.watchlist.length > 0);
  }
  
  const ttBadge = document.getElementById('tt-wl-badge');
  if (ttBadge) {
    ttBadge.style.display = state.watchlist.length > 0 ? 'block' : 'none';
  }
}

export function updateWatchlistUI() {
  const container = document.getElementById('wl-strip');
  const empty = document.getElementById('wl-empty');
  if (!container || !empty) return;
  
  // Clear only existing wl-item elements to avoid deleting empty state
  container.querySelectorAll('.movie-card, .wl-item').forEach(el => el.remove());
  
  if (state.watchlist.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    state.watchlist.forEach(movie => {
      const card = buildCard(movie.id, movie);
      container.appendChild(card);
    });
  }
  initPickGallery();
}



export function confettiBurst() {
  const savedVal = localStorage.getItem('confetti_enabled');
  const confettiEnabled = savedVal !== null ? (savedVal === 'true') : true;
  if (!confettiEnabled) return;

  for (let i = 0; i < 75; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    const left = 10 + Math.random() * 80;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    dot.style.cssText = `
      top:-20px; left:${left}%; background:${color};
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1.3+Math.random()*.7}s;
      transform:rotate(${Math.random()*360}deg);
      width:${5+Math.random()*9}px;height:${5+Math.random()*9}px;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 2600);
  }
}

/* ─── PICK A MOVIE GALLERY ─── */
let pickGalleryApp = null;
let pickSpinning = false;

export function initPickGallery() {
  if (window.initPickGalleryTimeout) {
    clearTimeout(window.initPickGalleryTimeout);
  }

  window.initPickGalleryTimeout = setTimeout(() => {
    const container = document.getElementById('pick-gallery-container');
    const emptyMsg = document.getElementById('pick-empty-msg');
    const galleryWrap = document.getElementById('pick-gallery-wrap');
    const rollBtn = document.getElementById('pick-roll-btn');
    const lockMsg = document.getElementById('pick-locked-state');
    const result = document.getElementById('pick-result');
    if (!container) return;

    // Destroy previous instance
    if (pickGalleryApp) {
      pickGalleryApp.destroy();
      pickGalleryApp = null;
    }

    container.innerHTML = '';
    if (result) {
      result.classList.remove('show');
      result.classList.add('hidden');
    }

    const N = state.watchlist.length;

    if (N === 0) {
      if (galleryWrap) galleryWrap.classList.add('hidden');
      if (emptyMsg) emptyMsg.classList.remove('hidden');
      if (rollBtn) rollBtn.classList.add('hidden');
      if (lockMsg) lockMsg.classList.add('hidden');
      return;
    }

    if (N === 1) {
      if (galleryWrap) galleryWrap.classList.add('hidden');
      if (emptyMsg) emptyMsg.classList.add('hidden');
      if (rollBtn) rollBtn.classList.add('hidden');
      if (lockMsg) lockMsg.classList.remove('hidden');
      return;
    }

    // If 2 or more movies, unlock!
    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (lockMsg) lockMsg.classList.add('hidden');
    if (galleryWrap) galleryWrap.classList.remove('hidden');
    if (rollBtn) rollBtn.classList.remove('hidden');

    // Map watchlist to gallery items and wrap with a CORS proxy so WebGL can load textures without CORS blocks
    const items = state.watchlist.map(m => {
      let poster = m.poster || '';
      if (m.poster_path && !poster.startsWith('http')) {
        poster = `https://image.tmdb.org/t/p/w500${m.poster_path}`;
      }
      const proxyPoster = poster ? `https://images.weserv.nl/?url=${encodeURIComponent(poster)}` : '';
      return { image: proxyPoster, text: m.title || 'Untitled' };
    });

    const savedBend = localStorage.getItem('roulette_bend');
    const bendVal = savedBend !== null ? parseFloat(savedBend) : 3.0;

    createCircularGallery(container, {
      items,
      bend: bendVal,
      textColor: '#ffffff',
      borderRadius: 0.05,
      font: 'bold 24px DM Sans',
      scrollSpeed: 2,
      scrollEase: 0.02,
      onCardClick: (index) => {
        const movie = state.watchlist[index];
        if (movie) {
          openModal(movie);
        }
      }
    }).then(app => {
      pickGalleryApp = app;
      if (pickGalleryApp) {
        pickGalleryApp.onResize();
      }
    });
  }, 100);
}

export function rollPickMovie() {
  if (pickSpinning || !pickGalleryApp || state.watchlist.length < 2) return;
  pickSpinning = true;

  const btn = document.getElementById('pick-roll-btn');
  const result = document.getElementById('pick-result');
  if (btn) btn.classList.add('spinning');
  if (result) { result.classList.remove('show'); result.classList.add('hidden'); }

  const app = pickGalleryApp;
  
  // Reset highlights on all media cards
  app.medias.forEach(media => {
    media.uWinningTarget = 0.0;
  });

  // Pick a random winner, ensuring it's not the same as the last pick (if possible)
  let winnerIdx = Math.floor(Math.random() * state.watchlist.length);
  let winner = state.watchlist[winnerIdx];

  if (state.watchlist.length > 1 && window._lastPickWinnerId !== undefined) {
    while (winner.id === window._lastPickWinnerId) {
      winnerIdx = Math.floor(Math.random() * state.watchlist.length);
      winner = state.watchlist[winnerIdx];
    }
  }
  window._lastPickWinnerId = winner.id;

  const w = app.medias[0].width;
  const N = state.watchlist.length;

  // Calculate current index position
  const currentIndex = Math.round(app.scroll.target / w);

  // We want to spin smoothly with 3 rotations for a slower, classier reveal
  const rotations = 3;
  const targetIndex = currentIndex + rotations * N + ((winnerIdx - (currentIndex % N) + N) % N);

  // Set target and start programmatic spin with slower deceleration ease
  app.scroll.target = targetIndex * w;
  app.scroll.ease = 0.011; // Goldilocks ease: slow enough for suspense, but doesn't crawl endlessly at the end
  app.isSpinning = true;

  // Callback when settled
  app.onSpinEnd = () => {
    showPickResult(winner);
    if (btn) btn.classList.remove('spinning');
    pickSpinning = false;
    confettiBurst();

    // Highlight the winning card and all its marquee duplicate instances
    app.medias.forEach(media => {
      if (media.index % N === winnerIdx) {
        media.uWinningTarget = 1.0;
      } else {
        media.uWinningTarget = 0.0;
      }
    });
  };
}

function showPickResult(movie) {
  const result = document.getElementById('pick-result');
  const poster = document.getElementById('pick-result-poster');
  const title = document.getElementById('pick-result-title');
  const meta = document.getElementById('pick-result-meta');
  const watchBtn = document.getElementById('pick-watch-btn');
  if (!result) return;

  let img = movie.poster || '';
  if (movie.poster_path && !img.startsWith('http')) {
    img = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  }
  if (poster) poster.src = img;
  if (title) title.textContent = movie.title || 'Untitled';
  if (meta) meta.textContent = `${movie.year || 'N/A'} · ${movie.genre || ''} · ★ ${movie.rating || '—'}`;
  if (watchBtn) watchBtn.onclick = () => openModal(movie);

  result.classList.remove('hidden');
  // Re-trigger animation
  result.classList.remove('show');
  void result.offsetWidth;
  result.classList.add('show');
}

window.rollPickMovie = rollPickMovie;

/* ─── SURPRISE ME ─── */
let lastSurprise = -1;

export function surpriseMe() {
  const orb = document.getElementById('surprise-btn');
  const result = document.getElementById('surprise-result');
  const section = document.getElementById('surprise-section');
  const icon = orb ? orb.querySelector('i') : null;

  if (orb) {
    orb.classList.add('loading');
    if (icon) {
      icon.className = 'fa-solid fa-circle-notch fa-spin';
    }
  }

  // Fade out and collapse current result card if it's already shown
  if (result && result.style.display !== 'none' && !result.classList.contains('hidden')) {
    gsap.to(result, {
      opacity: 0,
      scale: 0.9,
      y: 15,
      height: 0,
      duration: 0.25,
      ease: 'power2.inOut',
      onComplete: () => {
        result.style.display = 'none';
        result.classList.add('hidden');
      }
    });
  }

  const pickFallback = () => {
    let movieId;
    if (state.movieLensData && state.movieLensData.loaded && state.movieLensData.movies) {
      const movieIds = Object.keys(state.movieLensData.movies);
      let idx;
      do {
        idx = Math.floor(Math.random() * movieIds.length);
        movieId = parseInt(movieIds[idx]);
      } while (movieId === lastSurprise && movieIds.length > 1);
      lastSurprise = movieId;
    } else {
      let idx;
      do { idx = Math.floor(Math.random() * MOVIES.length); } while (idx === lastSurprise && MOVIES.length > 1);
      lastSurprise = idx;
      movieId = MOVIES[idx].id;
    }

    fetchTMDBDetails(movieId).then(movie => {
      if (!movie && typeof MOVIES !== 'undefined' && MOVIES.length > 0) {
        const local = MOVIES.find(m => String(m.id) === String(movieId)) || MOVIES[0];
        movie = local;
      }
      if (!movie) {
        if (orb) {
          orb.classList.remove('loading');
          if (icon) icon.className = 'fa-solid fa-wand-magic-sparkles';
        }
        return;
      }
      state.currentSurpriseMovie = movie;
      revealSurpriseResult(movie);
    });
  };

  if (TMDB_API_KEY) {
    const page = Math.floor(Math.random() * 50) + 1;
    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
          fetchTMDBDetails(randomMovie.id).then(movie => {
            if (!movie) {
              pickFallback();
              return;
            }
            state.currentSurpriseMovie = movie;
            revealSurpriseResult(movie);
          });
        } else {
          pickFallback();
        }
      })
      .catch(() => {
        pickFallback();
      });
    return;
  }

  pickFallback();
}

function revealSurpriseResult(movie) {
  const orb = document.getElementById('surprise-btn');
  const result = document.getElementById('surprise-result');
  const section = document.getElementById('surprise-section');
  const label = section ? section.querySelector('.surprise-label') : null;
  const icon = orb ? orb.querySelector('i') : null;

  if (orb) {
    orb.classList.remove('loading');
    orb.classList.add('has-result');
    if (icon) icon.className = 'fa-solid fa-wand-magic-sparkles';
  }
  if (section) section.classList.add('has-result');

  // Populate data
  const sImg = document.getElementById('s-img');
  if (sImg) sImg.src = movie.poster || movie.backdrop || '';
  const sTitle = document.getElementById('s-title');
  if (sTitle) sTitle.textContent = movie.title || 'Surprise Pick';
  const sSub = document.getElementById('s-sub');
  if (sSub) sSub.textContent = `${movie.year || ''} · ${movie.genre || ''} · ★ ${movie.rating || ''}`;
  const sSynopsis = document.getElementById('s-synopsis');
  if (sSynopsis) sSynopsis.textContent = (movie.synopsis || movie.overview || 'Enjoy this surprise pick!').slice(0, 115) + '…';
  
  const sModalBtn = document.getElementById('s-modal-btn');
  if (sModalBtn) sModalBtn.onclick = () => openModal(movie);
  const sAddBtn = document.getElementById('s-add-btn');
  if (sAddBtn) sAddBtn.onclick = () => addToWatchlist(movie, sAddBtn);
  
  syncWatchlistButtons();

  const timeline = gsap.timeline();

  // Collapse label if visible
  if (label && !label.classList.contains('hidden') && parseFloat(gsap.getProperty(label, 'opacity') ?? 1) > 0) {
    timeline.to(label, {
      opacity: 0,
      height: 0,
      scale: 0.9,
      marginBottom: 0,
      padding: 0,
      duration: 0.35,
      ease: 'power2.inOut',
      onComplete: () => {
        label.classList.add('hidden');
      }
    });
  }

  // Expand and animate card result
  if (result) {
    result.style.display = 'block';
    result.classList.remove('hidden');
    timeline.fromTo(result,
      { opacity: 0, scale: 0.9, y: 15, height: 0 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        height: 'auto',
        duration: 0.5,
        ease: 'back.out(1.15)',
        clearProps: 'height',
        onComplete: () => {
          if (orb) {
            const rect = orb.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            launchSurpriseSparkles(x, y);
          }
        }
      },
      '-=0.15'
    );
  }
}


/* ─── STAR RATING LOGIC ─── */
export function highlightStars(rating) {
  const stars = document.querySelectorAll('#modal-user-stars i');
  stars.forEach((star, idx) => {
    if (idx < rating) {
      star.classList.remove('fa-regular');
      star.classList.add('fa-solid', 'active');
    } else {
      star.classList.remove('fa-solid', 'active');
      star.classList.add('fa-regular');
    }
  });
}

/* ─── MODAL CONTROLS ─── */
function transitionModal(fn) {
  const modal = document.getElementById('modal');
  if (!modal) { fn(); return; }
  // Collapse
  modal.style.transition = 'transform .22s cubic-bezier(.4,0,1,1), opacity .22s ease';
  modal.style.transform = 'scale(.9) translateY(18px)';
  modal.style.opacity = '0.3';
  setTimeout(() => {
    fn();
    modal.scrollTop = 0;
    // Expand back
    modal.style.transition = 'transform .35s cubic-bezier(0.4,0,0.2,1), opacity .3s ease';
    modal.style.transform = 'scale(1) translateY(0)';
    modal.style.opacity = '1';
  }, 220);
}

export function openModal(movie, _fromSimilar = false, skipHashUpdate = false) {
  if (!skipHashUpdate && movie && movie.id) {
    history.pushState(null, '', `#movie-${movie.id}`);
  }
  if (_fromSimilar) {
    transitionModal(() => {
      openModalContent(movie);
    });
  } else {
    openModalContent(movie);
  }
}

function openModalContent(movie) {
  state.currentModalMovie = movie;
  hidePopup();
  
  let directorList = [];
  let castList = [];
  const isSeries = movie.type === 'series';
  const backdropEl = document.getElementById('m-backdrop');
  const posterEl = document.getElementById('m-poster');
  const hasValidBackdrop = movie.backdrop && movie.backdrop !== movie.poster && !movie.backdrop.includes('unsplash.com');
  
  if (hasValidBackdrop) {
    backdropEl.src = movie.backdrop;
    backdropEl.style.filter = 'none';
    backdropEl.style.transform = 'none';
    if (posterEl) posterEl.classList.add('hidden');
  } else {
    backdropEl.src = movie.poster;
    backdropEl.style.filter = 'blur(15px) brightness(0.4)';
    backdropEl.style.transform = 'scale(1.1)';
    if (posterEl) {
      posterEl.src = movie.poster;
      posterEl.classList.remove('hidden');
      posterEl.style.position = 'absolute';
      posterEl.style.top = '20px';
      posterEl.style.right = '40px';
      posterEl.style.height = '270px';
      posterEl.style.width = '180px';
      posterEl.style.objectFit = 'cover';
      posterEl.style.borderRadius = '10px';
      posterEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
      posterEl.style.zIndex = '4';
    }
  }

  // ── Fetch Real Watch Providers from TMDB ──
  const platformsContainer = document.getElementById('m-platforms');
  if (platformsContainer) {
    platformsContainer.innerHTML = `<span class="plat-badge" style="color:var(--t2)">Loading...</span>`;
    let rawTmdbId = movie.tmdbId || movie.id;
    if (typeof rawTmdbId === 'string' && rawTmdbId.includes('tmdb-')) {
      rawTmdbId = rawTmdbId.split('-').pop();
    }
    const numericTmdbId = parseInt(rawTmdbId, 10);
    const tmdbType = isSeries ? 'tv' : 'movie';
    if (TMDB_API_KEY && numericTmdbId && !isNaN(numericTmdbId)) {
      fetch(`https://api.themoviedb.org/3/${tmdbType}/${numericTmdbId}/watch/providers?api_key=${TMDB_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          let providersHtml = '';
          if (data && data.results && data.results.US) {
            const usData = data.results.US;
            let allProviders = usData.flatrate || usData.rent || usData.buy || [];
            
            // Sort by shortest name first to process base names ("Netflix") before variants ("Netflix with Ads")
            allProviders.sort((a, b) => a.provider_name.length - b.provider_name.length);
            
            const uniqueProviders = [];
            for (const p of allProviders) {
              const lowerName = p.provider_name.toLowerCase();
              const isDuplicate = uniqueProviders.some(existing => 
                lowerName.startsWith(existing.provider_name.toLowerCase()) || 
                existing.provider_name.toLowerCase().startsWith(lowerName)
              );
              if (!isDuplicate) {
                let displayName = p.provider_name.replace(/\s*(?:basic|standard|premium)?\s*(?:with ads|ad-supported)/i, '').trim();
                uniqueProviders.push({...p, display_name: displayName});
              }
            }
            
            const topProviders = uniqueProviders.slice(0, 3);
            if (topProviders.length > 0) {
              providersHtml = topProviders.map(p => {
                const logoUrl = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
                return `<span class="plat-badge" style="padding-left:4px"><img src="${logoUrl}" alt="${p.display_name}" class="plat-logo"/>${p.display_name}</span>`;
              }).join('');
            }
          }
          if (providersHtml) {
            platformsContainer.innerHTML = providersHtml;
          } else {
            platformsContainer.innerHTML = `<span class="plat-badge" style="color:var(--t2)">Not available to stream</span>`;
          }
        })
        .catch(() => {
          platformsContainer.innerHTML = `<span class="plat-badge" style="color:var(--t2)">Unavailable</span>`;
        });
    } else {
      platformsContainer.innerHTML = `<span class="plat-badge" style="color:var(--t2)">Unavailable</span>`;
    }
  }

  if (isSeries) {
    document.getElementById('m-chip').innerHTML = `<i class="fa-solid fa-tv" style="font-size:10px"></i> Popular Series`;
    document.getElementById('m-title').textContent = movie.title;
    document.getElementById('m-year').textContent = `${movie.year}`;
    document.getElementById('m-rating').textContent = `★ ${movie.rating}`;
    if (document.getElementById('m-cert')) document.getElementById('m-cert').textContent = movie.cert || "N/A";
    document.getElementById('m-runtime').textContent = "Series";
    document.getElementById('m-genre').textContent = movie.genre;
    const certText = movie.cert ? `[${movie.cert}] ` : '';
    document.getElementById('m-synopsis').textContent = certText + (movie.synopsis || `${movie.title} is a hit series in the ${movie.genre} genre. Watch all seasons now! Rated ${movie.rating}/10.`);
    
    document.getElementById('m-reasons').innerHTML = `<span class="ai-pill"><i class="fa-solid fa-bolt" style="font-size:9px"></i>Trending</span>`;
    
    // Render Director
    directorList = (movie.director && movie.director.length > 0) ? movie.director : [
      { name: "Creator", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }
    ];
    document.getElementById('m-director').innerHTML = directorList.map((d, idx) => `
      <div class="m-director-person" data-director-index="${idx}">
        <img src="${d.img}" alt="${d.name}"/>
        <span>${d.name}</span>
      </div>
    `).join('');

    // Render Cast
    castList = (movie.cast && movie.cast.length > 0) ? movie.cast : [
      { name: "Lead Actor", character: "Main Character", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" },
      { name: "Supporting Cast", character: "Sidekick", img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&q=80" }
    ];
    
    document.getElementById('m-cast').innerHTML = castList.map((c, idx) => `
      <div class="m-cast-person" data-cast-index="${idx}">
        <img src="${c.img}" alt="${c.name}"/>
        <span>${c.name}</span>
      </div>
    `).join('');
    
    // Hide stars rating and trailer
    const ratingBox = document.querySelector('.user-rating-box');
    if (ratingBox) ratingBox.classList.add('hidden');
    
    const videoContainer = document.getElementById('m-video-container');
    if (videoContainer) videoContainer.classList.add('hidden');
    
    const playBtn = document.getElementById('m-play-btn');
    if (playBtn) playBtn.classList.add('hidden');
    
    const mHead = document.querySelector('.m-head');
    if (mHead) mHead.classList.remove('hidden');
    const mFade = document.querySelector('.m-hero-fade');
    if (mFade) mFade.classList.remove('hidden');
    const mSide = document.querySelector('.m-hero-side');
    if (mSide) mSide.classList.remove('hidden');
    
  } else {
    const ratingBox = document.querySelector('.user-rating-box');
    if (ratingBox) ratingBox.classList.remove('hidden');
    
    const mHead = document.querySelector('.m-head');
    if (mHead) mHead.classList.remove('hidden');
    const mFade = document.querySelector('.m-hero-fade');
    if (mFade) mFade.classList.remove('hidden');
    const mSide = document.querySelector('.m-hero-side');
    if (mSide) mSide.classList.remove('hidden');
    
    document.getElementById('m-chip').innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:10px"></i> ${movie.match}% Match`;
    document.getElementById('m-title').textContent = movie.title;
    document.getElementById('m-year').textContent = movie.cert ? `${movie.year} · ${movie.cert} · ${movie.runtime}` : `${movie.year} · ${movie.runtime}`;
    document.getElementById('m-rating').textContent = `★ ${movie.rating}`;
    if (document.getElementById('m-cert')) document.getElementById('m-cert').textContent = movie.cert || "N/A";
    document.getElementById('m-runtime').textContent = movie.runtime;
    document.getElementById('m-genre').textContent = movie.genre;
    const certText = movie.cert ? `[${movie.cert}] ` : '';
    document.getElementById('m-synopsis').textContent = certText + movie.synopsis;


    document.getElementById('m-reasons').innerHTML = movie.reasons.map(r =>
      `<span class="ai-pill"><i class="fa-solid fa-bolt" style="font-size:9px"></i>${r}</span>`
    ).join('');

    // Render Director
    directorList = (movie.director && movie.director.length > 0) ? movie.director : [
      { name: "Director N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }
    ];
    document.getElementById('m-director').innerHTML = directorList.map((d, idx) => `
      <div class="m-director-person" data-director-index="${idx}">
        <img src="${d.img}" alt="${d.name}"/>
        <span>${d.name}</span>
      </div>
    `).join('');

    // Render Cast
    castList = (movie.cast && movie.cast.length > 0) ? movie.cast : [
      { name: "Lead Actor", character: "Protagonist", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" },
      { name: "Supporting Cast", character: "Co-Star", img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&q=80" }
    ];
    
    document.getElementById('m-cast').innerHTML = castList.map((c, idx) => `
      <div class="m-cast-person" data-cast-index="${idx}">
        <img src="${c.img}" alt="${c.name}"/>
        <span>${c.name}</span>
      </div>
    `).join('');

    // Set user stars + sync "Already Watched" pill and Watchlist pill
    const userRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    const myRating = userRatings[movie.id] || 0;
    highlightStars(myRating);

    // Sync pill + rating reveal based on existing rating
    const watchedPill  = document.getElementById('m-watched-pill');
    const urbInner     = watchedPill ? watchedPill.closest('.urb-inner') : null;
    const urbLabel     = watchedPill ? watchedPill.querySelector('.urb-watched-label') : null;
    const isWatched    = myRating > 0;
    
    const watchlistWrap = document.getElementById('m-watchlist-wrap');
    const ratingSide    = document.getElementById('urb-rating-side');

    if (watchedPill) watchedPill.classList.toggle('active', isWatched);
    if (urbInner)    urbInner.classList.toggle('watched', isWatched);
    if (urbLabel)    urbLabel.textContent = isWatched ? 'Already Watched' : 'Watched?';

    // Sync watchlist wrap and rating side — instant on modal open (no animation)
    if (isWatched) {
      if (watchlistWrap) watchlistWrap.classList.add('hidden');
      if (ratingSide)    ratingSide.classList.add('visible');
    } else {
      if (watchlistWrap) watchlistWrap.classList.remove('hidden');
      if (ratingSide)    ratingSide.classList.remove('visible');
      _updateModalWatchlistPill();
    }
    
    const starsContainer = document.getElementById('modal-user-stars');
    if (starsContainer) {
      starsContainer.onmouseleave = () => {
        const currentRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
        highlightStars(currentRatings[movie.id] || 0);
      };
    }
    
    document.querySelectorAll('#modal-user-stars i').forEach(star => {
      star.onmouseenter = () => {
        const val = parseInt(star.dataset.value);
        highlightStars(val);
      };
      star.onclick = () => {
        const val = parseInt(star.dataset.value);
        const currentRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
        const wasWatched = !!currentRatings[movie.id];
        const watchlistWrap = document.getElementById('m-watchlist-wrap');
        
        if (currentRatings[movie.id] === val) {
          delete currentRatings[movie.id];
          // Remove timestamp when un-rating via stars
          const ts = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
          delete ts[movie.id];
          localStorage.setItem('user_watched_timestamps', JSON.stringify(ts));
          
          // Restore watchlist button
          if (watchlistWrap) watchlistWrap.classList.remove('hidden');
          const wasInWatchlistBefore = state.watchlistToRestore.includes(String(movie.id));
          if (wasInWatchlistBefore) {
            addToWatchlist(movie, null);
            state.watchlistToRestore = state.watchlistToRestore.filter(id => String(id) !== String(movie.id));
            saveWatchlistToStorage();
            updateWatchlistUI();
            updateWLCount();
          }
          // Update watchlist pill
          _updateModalWatchlistPill();
        } else {
          currentRatings[movie.id] = val;
          // Record timestamp only on first rating
          const ts = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
          if (!ts[movie.id]) ts[movie.id] = Date.now();
          localStorage.setItem('user_watched_timestamps', JSON.stringify(ts));
          
          // If wasn't watched before and now is watched, handle watchlist
          if (!wasWatched) {
            const movieInWatchlist = state.watchlist.find(x => String(x.id) === String(movie.id));
            if (movieInWatchlist) {
              state.watchlist = state.watchlist.filter(x => String(x.id) !== String(movie.id));
              if (!state.watchlistToRestore.includes(String(movie.id))) {
                state.watchlistToRestore.push(String(movie.id));
              }
              saveWatchlistToStorage();
              updateWatchlistUI();
              updateWLCount();
            }
            if (watchlistWrap) {
              watchlistWrap.classList.add('hidden');
            }
          }
        }
        localStorage.setItem('user_movie_ratings', JSON.stringify(currentRatings));
        highlightStars(currentRatings[movie.id] || 0);
        // Keep pill + rating side in sync when stars are clicked directly
        const _pill  = document.getElementById('m-watched-pill');
        const _inner = _pill ? _pill.closest('.urb-inner') : null;
        const _lbl   = _pill ? _pill.querySelector('.urb-watched-label') : null;
        const _rated = !!currentRatings[movie.id];
        if (_pill)  _pill.classList.toggle('active', _rated);
        if (_inner) _inner.classList.toggle('watched', _rated);
        if (_lbl)   _lbl.textContent = _rated ? 'Already Watched' : 'Watched?';
        // Update pill active state live
        const pill = document.getElementById('m-watched-pill');
        if (pill) pill.classList.toggle('active', !!currentRatings[movie.id]);
        _syncWatchedBadge();
        if (state.movieLensData.loaded) {
          initializeRecommender();
          initHero();
        }
        // Close modal after a brief moment so the rating feels confirmed
        if (currentRatings[movie.id]) {
          setTimeout(() => closeModal(), 300);
        }
      };
    });

    // Play Trailer Config
    const playBtn = document.getElementById('m-play-btn');
    const videoContainer = document.getElementById('m-video-container');
    const videoIframe = document.getElementById('m-video-iframe');
    
    if (videoContainer) videoContainer.classList.add('hidden');
    if (videoIframe) videoIframe.src = '';
    
    if (playBtn) {
      playBtn.classList.remove('hidden');
      playBtn.onclick = () => {
        if (movie.trailerKey) {
          if (videoIframe) videoIframe.src = `https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&start=3&rel=0`;
          if (videoContainer) videoContainer.classList.remove('hidden');
          playBtn.classList.add('hidden');
          const mHead = document.querySelector('.m-head');
          if (mHead) mHead.classList.add('hidden');
          const mFade = document.querySelector('.m-hero-fade');
          if (mFade) mFade.classList.add('hidden');
          const mSide = document.querySelector('.m-hero-side');
          if (mSide) mSide.classList.add('hidden');
        } else {
          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`, '_blank');
        }
      };
    }
  }

  // Attach click listeners to cast and director profiles for searching
  document.querySelectorAll('.m-director-person').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.directorIndex);
      const director = directorList[idx];
      if (director && director.name && director.name !== 'Director N/A' && director.name !== 'Creator') {
        triggerPersonSearch(director.name);
      }
    });
  });

  document.querySelectorAll('.m-cast-person').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.castIndex);
      const actor = castList[idx];
      if (actor && actor.name && actor.name !== 'Lead Actor' && actor.name !== 'Supporting Cast' && actor.name !== 'Cast N/A') {
        triggerPersonSearch(actor.name);
      }
    });
  });
  // Letterboxd Button Config
  const letterboxdBtn = document.getElementById('m-letterboxd-btn');
  if (letterboxdBtn) {
    letterboxdBtn.onclick = () => {
      window.open(`https://letterboxd.com/tmdb/${movie.id}`, '_blank');
    };
  }

  // Populate Similar Movies
  populateSimilar(movie);

  const wlBtnNew = document.getElementById('m-add-wl-new');
  if (wlBtnNew) {
    const alreadyIn = state.watchlist.find(x => String(x.id) === String(movie.id));
    
    const updateWatchlistButton = (inWatchlist) => {
      if (inWatchlist) {
        wlBtnNew.textContent = 'In Watchlist';
        wlBtnNew.classList.add('added');
      } else {
        wlBtnNew.textContent = 'Add to Watchlist';
        wlBtnNew.classList.remove('added');
      }
    };

    updateWatchlistButton(alreadyIn);

    wlBtnNew.onclick = () => {
      if (!state.watchlist.find(x => String(x.id) === String(movie.id))) {
        addToWatchlist(movie, null);
        updateWatchlistButton(true);
      }
    };
  }

  injectOverlayGradualBlur('overlay');
  document.getElementById('overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function populateSimilar(movie) {
  const similarEl = document.getElementById('m-similar');
  if (!similarEl || !movie || !movie.id) return;

  if (TMDB_API_KEY) {
    const tmdbType = movie.type === 'series' ? 'tv' : 'movie';
    similarEl.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:8px 0">Loading…</div>';

    fetch(`https://api.themoviedb.org/3/${tmdbType}/${movie.id}/recommendations?api_key=${TMDB_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        const results = (data.results || []).slice(0, 8);
        if (!results.length) { similarEl.innerHTML = ''; return; }

        similarEl.innerHTML = results.map(m => {
          const poster = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : '';
          const title = m.title || m.name || '';
          return `<div class="mini" data-sim-id="${m.id}" style="cursor:pointer;transition:transform .22s var(--smooth),opacity .22s">
            ${poster
              ? `<img src="${poster}" alt="${title}" loading="lazy" style="width:80px;height:118px;object-fit:cover;border-radius:6px;display:block"/>`
              : `<div style="width:80px;height:118px;background:var(--b3);border-radius:6px"></div>`}
            <div class="mini-title">${title}</div>
          </div>`;
        }).join('');

        results.forEach(m => {
          const el = similarEl.querySelector(`[data-sim-id="${m.id}"]`);
          if (!el) return;
          el.addEventListener('mouseenter', () => { el.style.transform = 'translateY(-3px)'; el.style.opacity = '.85'; });
          el.addEventListener('mouseleave', () => { el.style.transform = ''; el.style.opacity = '1'; });
          el.onclick = () => fetchTMDBDetails(m.id).then(d => { if (d) openModal(d, true); });
        });
      })
      .catch(() => { similarEl.innerHTML = ''; });
    return;
  }

  // Offline similar recommendation mapping
  if (state.movieLensData.loaded) {
    const list = Object.values(state.movieLensData.movies)
      .filter(m => m.movieId !== movie.id && m.genres.split('|').some(g => movie.genre.includes(g)))
      .slice(0, 8);

    similarEl.innerHTML = list.map(m => `
      <div class="mini" data-similar-id="${m.movieId}">
        <img src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=90&q=80" alt="${m.title}" loading="lazy"/>
        <div class="mini-title">${m.title.replace(/\s\(\d{4}\)$/, '')}</div>
      </div>
    `).join('');

    list.forEach(m => {
      fetchTMDBDetails(m.movieId).then(details => {
        if (!details) return;
        const img = document.querySelector(`[data-similar-id="${m.movieId}"] img`);
        if (img) img.src = details.poster;
        const el = document.querySelector(`[data-similar-id="${m.movieId}"]`);
        if (el) el.onclick = () => openModal(details, true);
      });
    });
  } else {
    similarEl.innerHTML = MOVIES
      .filter(m => m.id !== movie.id).slice(0, 8).map(m => `
        <div class="mini" data-movies-similar-id="${m.id}">
          <img src="${m.poster}" alt="${m.title}" loading="lazy"/>
          <div class="mini-title">${m.title}</div>
        </div>
      `).join('');
    
    MOVIES.filter(m => m.id !== movie.id).slice(0, 8).forEach(m => {
      const el = document.querySelector(`[data-movies-similar-id="${m.id}"]`);
      if (el) el.onclick = () => openModal(m, true);
    });
  }
}

export function closeModal(skipHashUpdate = false) {
  document.getElementById('overlay').classList.remove('on');
  const iframe = document.getElementById('m-video-iframe');
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
  state.currentModalMovie = null;
  
  if (!skipHashUpdate) {
    if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
      window.location.hash = '#watchlist-section';
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }
}

export function handleOverlay(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') {
    closeModal();
    if (typeof window.closeSearchPanel === 'function') window.closeSearchPanel();
    if (typeof window.closeSettingsModal === 'function') window.closeSettingsModal();
  }
});

/* ─── TOAST NOTIFICATIONS ─── */
export function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-alert ${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  if (type === 'success') iconClass = 'fa-circle-check';

  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('hide');
    setTimeout(() => {
      toast.remove();
    }, 300);
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }
  }, 5000);
}

/* ─── SETTINGS TABS ─── */
export function switchSettingsTab(tabId) {
  document.querySelectorAll('.settings-tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  document.querySelectorAll('.settings-tab-btn').forEach(el => {
    el.classList.remove('active');
  });
  
  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  const targetBtn = document.querySelector(`.settings-tab-btn[data-tab="${tabId}"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
}

/* ─── API KEY CONNECTION TESTER ─── */
export async function testTMDBConnection() {
  const keyInput = document.getElementById('tmdb-key-input');
  const dot = document.getElementById('connection-status-indicator');
  const text = document.getElementById('connection-status-text');
  const latencyValEl = document.getElementById('tmdb-latency-val');
  
  if (!keyInput || !dot || !text) return;
  
  const key = keyInput.value.trim();
  if (!key) {
    dot.className = 'status-dot';
    text.textContent = 'Please enter an API key to test.';
    text.style.color = 'var(--t3)';
    if (latencyValEl) latencyValEl.textContent = 'N/A';
    return;
  }
  
  dot.className = 'status-dot testing';
  text.textContent = 'Testing connection...';
  text.style.color = '#f59e0b';
  
  try {
    const startTime = performance.now();
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${key}`);
    const endTime = performance.now();
    
    if (res.ok) {
      const latency = Math.round(endTime - startTime);
      dot.className = 'status-dot connected';
      text.textContent = `Connected successfully! Latency: ${latency}ms`;
      text.style.color = '#10b981';
      if (latencyValEl) latencyValEl.textContent = `${latency}ms`;
      
      updateDatabaseStatus('movies', 'Live (TMDB)');
      updateDatabaseStatus('links', 'Live (TMDB)');
      updateDatabaseStatus('ratings', 'Live (TMDB)');
    } else {
      dot.className = 'status-dot failed';
      text.textContent = `Failed! HTTP error ${res.status}. Check key.`;
      text.style.color = '#ef4444';
      if (latencyValEl) latencyValEl.textContent = 'Failed';
    }
  } catch (error) {
    dot.className = 'status-dot failed';
    text.textContent = 'Connection failed! Network error.';
    text.style.color = '#ef4444';
    if (latencyValEl) latencyValEl.textContent = 'Offline';
  }
}

/* ─── PREFERENCES TOGGLERS ─── */
export function toggleGenrePill(event) {
  const pill = event.currentTarget;
  pill.classList.toggle('selected');
}

export function toggleProviderCheckbox(event) {
  const label = event.currentTarget;
  const checkbox = label.querySelector('input');
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
      label.classList.add('selected');
    } else {
      label.classList.remove('selected');
    }
  }
}

/* ─── SETTINGS MODAL OPERATORS ─── */
export function openSettingsModal() {
  switchSettingsTab('user-preferences');
  
  const favGenresStr = localStorage.getItem('fav_genres');
  let favGenres = [];
  if (favGenresStr) {
    try { favGenres = JSON.parse(favGenresStr); } catch(e) {}
  }
  document.querySelectorAll('.genre-pill').forEach(pill => {
    const genreName = pill.dataset.genre;
    if (favGenres.includes(genreName)) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });
  
  const favProvidersStr = localStorage.getItem('fav_providers');
  let favProviders = [];
  if (favProvidersStr) {
    try { favProviders = JSON.parse(favProvidersStr); } catch(e) {}
  }
  document.querySelectorAll('.provider-checkbox-label').forEach(label => {
    const providerId = label.dataset.providerId;
    const checkbox = label.querySelector('input');
    if (favProviders.includes(providerId)) {
      label.classList.add('selected');
      if (checkbox) checkbox.checked = true;
    } else {
      label.classList.remove('selected');
      if (checkbox) checkbox.checked = false;
    }
  });

  const confettiEnabled = localStorage.getItem('confetti_enabled') !== 'false';
  const confettiCheckbox = document.getElementById('confetti-toggle');
  if (confettiCheckbox) {
    confettiCheckbox.checked = confettiEnabled;
  }
  
  const savedBend = localStorage.getItem('roulette_bend');
  const bendVal = savedBend !== null ? parseFloat(savedBend) : 3.0;
  const bendSlider = document.getElementById('bend-intensity-slider');
  const bendValEl = document.getElementById('bend-intensity-val');
  if (bendSlider) {
    bendSlider.value = bendVal;
  }
  if (bendValEl) {
    bendValEl.textContent = bendVal.toFixed(1);
  }

  injectOverlayGradualBlur('settings-overlay');
  document.getElementById('settings-overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

export function closeSettingsModal() {
  document.getElementById('settings-overlay').classList.remove('on');
  if (!document.getElementById('overlay').classList.contains('on')) {
    document.body.style.overflow = '';
  }
}

export function handleSettingsOverlay(e) {
  if (e.target === document.getElementById('settings-overlay')) closeSettingsModal();
}

export function saveSettings() {
  const selectedPills = document.querySelectorAll('.genre-pill.selected');
  const favGenres = Array.from(selectedPills).map(pill => pill.dataset.genre);
  localStorage.setItem('fav_genres', JSON.stringify(favGenres));
  
  const selectedProviderLabels = document.querySelectorAll('.provider-checkbox-label.selected');
  const favProviders = Array.from(selectedProviderLabels).map(lbl => lbl.dataset.providerId);
  localStorage.setItem('fav_providers', JSON.stringify(favProviders));
  
  const confettiCheckbox = document.getElementById('confetti-toggle');
  if (confettiCheckbox) {
    localStorage.setItem('confetti_enabled', confettiCheckbox.checked ? 'true' : 'false');
  }
  
  const bendSlider = document.getElementById('bend-intensity-slider');
  if (bendSlider) {
    const bendVal = parseFloat(bendSlider.value);
    localStorage.setItem('roulette_bend', bendVal.toString());
    
    if (pickGalleryApp && pickGalleryApp.medias) {
      pickGalleryApp.medias.forEach(m => {
        m.bend = bendVal;
      });
    }
  }

  // Clear TMDB cache and force re-rendering rows to recalculate match scores with boosts
  state.tmdbCache = {};
  if (typeof renderRows === 'function') {
    renderRows();
  }

  closeSettingsModal();
  
  if (oldKey !== newKey) {
    window.location.reload();
  } else {
    showToast("Settings Saved", "Your preferences have been updated.", "success");
  }
}

export function resetContentPreferences() {
  // 1. Snapshot current watchlist + watch history into the blob BEFORE touching anything
  if (state.userEmail) {
    saveUserData(state.userEmail);
  }

  // 2. Clear onboarding preference keys from localStorage
  localStorage.removeItem('swipe_onboarding_completed');
  localStorage.removeItem('onboarding_genres');
  localStorage.removeItem('onboarding_languages');
  localStorage.removeItem('onboarding_talents');
  localStorage.removeItem('onboarding_likes');
  localStorage.removeItem('onboarding_dislikes');
  localStorage.removeItem('onboarding_excluded_genres');

  // 3. Zero ONLY the onboarding fields inside the user blob;
  //    watchlist, movieRatings, watchedTimestamps are intentionally preserved
  if (state.userEmail) {
    try {
      const key  = getUserStorageKey(state.userEmail);
      const blob = JSON.parse(localStorage.getItem(key) || '{}');
      blob.onboardingCompleted      = false;
      blob.onboardingGenres         = [];
      blob.onboardingLanguages      = [];
      blob.onboardingTalents        = [];
      blob.onboardingLikes          = [];
      blob.onboardingDislikes       = [];
      blob.onboardingExcludedGenres = [];
      localStorage.setItem(key, JSON.stringify(blob));
    } catch(e) {}
  }

  window.location.reload();
}

export function updateDatabaseStatus(type, status) {
  const el = document.getElementById(`status-${type}`);
  if (!el) return;
  el.textContent = status;
  if (status === 'Loaded') {
    el.style.color = '#10b981';
  } else if (status === 'Loading...') {
    el.style.color = 'var(--y)';
  } else {
    el.style.color = '#ef4444';
  }
}

export function scrollToWatchlist() {
  window.location.hash = '#watchlist-section';
}

/* ─── SCROLLSPY ─── */
export function initScrollspy() {
  const links = document.querySelectorAll('.nav-links a');
  
  // Clear search on nav link click if search is active
  links.forEach(link => {
    link.addEventListener('click', () => {
      if (document.body.classList.contains('search-active')) {
        clearSearch();
      }
    });
  });

  // Clear search on logo click if search is active
  const logoLink = document.querySelector('.logo');
  if (logoLink) {
    logoLink.addEventListener('click', () => {
      if (document.body.classList.contains('search-active')) {
        clearSearch();
      }
    });
  }

  const observerOptions = {
    root: null,
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (document.body.classList.contains('watchlist-active')) return;
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(link => {
          const href = link.getAttribute('href').substring(1);
          link.classList.toggle('active', href === id);
        });
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('section[id], #hero').forEach(sec => observer.observe(sec));
}

/* ─── REALTIME SEARCH ─── */

// Pagination state — shared between handleSearchInput, clearSearch, and load-more helpers
let _searchState = {
  q: '',
  tmdbMoviePage: 0,
  tmdbTvPage: 0,
  tmdbMovieTotalPages: 1,
  tmdbTvTotalPages: 1,
  rendered: new Set(),
  allResults: [],
  offlineOffset: 0,
  loading: false,
};

// Autocomplete cache — when user hits Enter, we reuse these results instead of refetching
let _autocompleteCache = {
  q: '',
  results: [],  // sorted, deduped, ready to render
};

export function clearSearch(skipHashUpdate = false) {
  state.isShowingGenre = false;
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  const suggestionsDiv = document.getElementById('search-suggestions');
  if (suggestionsDiv) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.add('hidden');
  }
  const searchSec = document.getElementById('search-section');
  if (searchSec) {
    searchSec.classList.add('hidden');
    const titleEl = document.getElementById('search-section-title');
    if (titleEl) {
      titleEl.innerHTML = `Search Results <span class="sec-tag tag-violet" id="search-count" style="display:none"></span>`;
    }
    const subEl = document.getElementById('search-sub');
    if (subEl) subEl.textContent = 'Results matching your search query';
  }

  // Reset genre grid ↔ search row toggle
  const gridWrap    = document.getElementById('genre-grid-wrap');
  const rowWrap     = document.getElementById('search-row-wrap');
  const grid        = document.getElementById('genre-results-grid');
  const lmWrap      = document.getElementById('genre-load-more-wrap');
  const srResults   = document.getElementById('search-results');
  const srLmWrap    = document.getElementById('search-load-more-wrap');
  const srLmBtn     = document.getElementById('search-load-more-btn');
  if (gridWrap)   { gridWrap.classList.add('hidden'); }
  if (rowWrap)    { rowWrap.classList.remove('hidden'); }
  if (grid)       { grid.innerHTML = ''; }
  if (lmWrap)     { lmWrap.classList.add('hidden'); }
  if (srResults)  { srResults.innerHTML = ''; }
  if (srLmWrap)   { srLmWrap.classList.add('hidden'); }
  if (srLmBtn)    { srLmBtn.disabled = false; srLmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results'; }

  // Reset search pagination state
  _searchState = { q:'', tmdbMoviePage:0, tmdbTvPage:0, tmdbMovieTotalPages:1, tmdbTvTotalPages:1, rendered:new Set(), allResults:[], offlineOffset:0, loading:false };
  _autocompleteCache = { q: '', results: [] };

  document.body.classList.remove('search-active');
  closeSuggestionsDropdown();
  
  const genreBtn = document.getElementById('dock-genre-btn');
  if (genreBtn) {
    genreBtn.classList.remove('active');
  }
  const currentTab = (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') ? 'watchlist-section' : 'hero';
  document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === currentTab);
  });
  
  if (!skipHashUpdate) {
    if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
      window.location.hash = '#watchlist-section';
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }
}

let searchDebounce;
const SEARCH_INITIAL_SIZE = 72;  // initial render — ~9 rows at 8 columns
const SEARCH_MORE_SIZE    = 48;  // each Load More click — ~6 rows at 8 columns
const SEARCH_PAGE_SIZE = SEARCH_MORE_SIZE;

export function handleSearchInput(e) {
  state.isShowingGenre = false;
  const genreBtn = document.getElementById('dock-genre-btn');
  if (genreBtn) genreBtn.classList.remove('active');

  // Text search always uses the grid, not the genre grid
  const gridWrap = document.getElementById('genre-grid-wrap');
  const rowWrap  = document.getElementById('search-row-wrap');
  if (gridWrap) gridWrap.classList.add('hidden');
  if (rowWrap)  rowWrap.classList.remove('hidden');

  const q = e.target.value.trim().toLowerCase();
  const searchSec     = document.getElementById('search-section');
  const searchResults = document.getElementById('search-results');
  const countEl       = document.getElementById('search-count');
  const quickResults  = document.getElementById('search-quick-results');
  const divider       = document.getElementById('search-results-divider');

  if (!q) {
    if (searchSec)    searchSec.classList.add('hidden');
    if (quickResults) { quickResults.innerHTML = ''; quickResults.classList.add('hidden'); }
    if (divider)      divider.classList.add('hidden');
    document.body.classList.remove('search-active');
    closeSuggestionsDropdown();
    if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
      window.location.hash = '#watchlist-section';
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
    return;
  }

  document.body.classList.add('search-active');
  if (countEl) countEl.style.display = '';

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    if (!searchResults) return;

    // Reset state for new query
    _searchState = {
      q,
      tmdbMoviePage: 0,
      tmdbTvPage: 0,
      tmdbMovieTotalPages: 1,
      tmdbTvTotalPages: 1,
      rendered: new Set(),
      allResults: [],
      offlineOffset: 0,
      loading: false,
    };

    searchResults.innerHTML = '';
    if (quickResults) { quickResults.innerHTML = ''; quickResults.classList.add('hidden'); }
    if (divider)      divider.classList.add('hidden');

    const lmWrap = document.getElementById('search-load-more-wrap');
    const lmBtn  = document.getElementById('search-load-more-btn');
    if (lmWrap) lmWrap.classList.add('hidden');

    if (TMDB_API_KEY) {
      if (countEl) countEl.textContent = 'Searching…';

      let firstBatch;
      let movieTotalPages = 1;
      let tvTotalPages    = 1;
      let totalEstimate   = 0;

      // ── Use the autocomplete cache when the query matches exactly ──────
      // This guarantees the grid shows items in the same order as the dropdown.
      if (_autocompleteCache.q === q && _autocompleteCache.results.length > 0) {
        firstBatch        = _autocompleteCache.results;
        movieTotalPages   = _autocompleteCache.tmdbMovieTotalPages  || 1;
        tvTotalPages      = _autocompleteCache.tmdbTvTotalPages      || 1;
        totalEstimate     = (_autocompleteCache.tmdbMovieTotalResults || 0) +
                            (_autocompleteCache.tmdbTvTotalResults    || 0);
        _searchState.tmdbMoviePage = 1;
        _searchState.tmdbTvPage    = 1;
      } else {
        // Cache miss (user typed then immediately hit Enter before debounce fired)
        // — fetch fresh, same sources as autocomplete
        const [m1, t1, p] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
          fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
          fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[]})),
        ]);

        if (e.target.value.trim().toLowerCase() !== q) return;

        movieTotalPages = m1.total_pages  || 1;
        tvTotalPages    = t1.total_pages  || 1;
        totalEstimate   = (m1.total_results || 0) + (t1.total_results || 0);
        _searchState.tmdbMoviePage = 1;
        _searchState.tmdbTvPage    = 1;

        let personTitles = [];
        if (p.results && p.results.length > 0) {
          const creditsResults = await Promise.all(
            p.results.slice(0, 3).map(person =>
              fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}`)
                .then(r=>r.json()).then(credits=>({person,credits})).catch(()=>null)
            )
          );
          creditsResults.forEach(res => {
            if (!res) return;
            const {person, credits} = res;
            (credits.crew||[]).filter(i=>i.job==='Director').forEach(i =>
              personTitles.push({...i, mediaType:i.media_type||'movie', personReason:{name:person.name,role:'Director'}})
            );
            (credits.cast||[]).forEach(i =>
              personTitles.push({...i, mediaType:i.media_type||'movie', personReason:{name:person.name,role:'Cast'}})
            );
          });
        }

        firstBatch = _mergeAndSort(
          (m1.results||[]).map(i=>({...i,mediaType:'movie'})),
          (t1.results||[]).map(i=>({...i,mediaType:'tv'})),
          personTitles,
          q
        );

        // Populate cache so Load More can continue seamlessly
        _autocompleteCache = {
          q, results: firstBatch,
          tmdbMovieTotalPages: movieTotalPages, tmdbTvTotalPages: tvTotalPages,
          tmdbMovieTotalResults: m1.total_results||0, tmdbTvTotalResults: t1.total_results||0,
        };
      }

      _searchState.tmdbMovieTotalPages = movieTotalPages;
      _searchState.tmdbTvTotalPages    = tvTotalPages;

      // Quick top-5 above the grid
      if (quickResults && firstBatch.length > 0) {
        renderQuickResults(firstBatch.slice(0, 5), quickResults);
        quickResults.classList.remove('hidden');
        if (divider && firstBatch.length > 5) divider.classList.remove('hidden');
      }

      if (firstBatch.length === 0) {
        searchResults.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;">No results found matching that query.</div>';
        if (countEl) countEl.textContent = '0 found';
      } else {
        _appendSearchCards(firstBatch, searchResults);
        // Update count to reflect only cards with posters that were actually rendered
        const actualCount = searchResults.querySelectorAll('.movie-card').length;
        const hasMorePages = _searchState.tmdbMoviePage < _searchState.tmdbMovieTotalPages ||
                             _searchState.tmdbTvPage    < _searchState.tmdbTvTotalPages;
        if (countEl) countEl.textContent = hasMorePages ? `${actualCount}+ results` : `${actualCount} found`;
      }
      if (searchSec) { searchSec.style.removeProperty('display'); searchSec.classList.remove('hidden'); }

      const hasMore = _searchState.tmdbMoviePage < _searchState.tmdbMovieTotalPages ||
                      _searchState.tmdbTvPage    < _searchState.tmdbTvTotalPages;
      if (lmWrap) lmWrap.style.display = hasMore ? 'block' : 'none';
      if (lmBtn) {
        lmBtn.onclick = () => _loadMoreSearchResults(q, searchResults, countEl, lmWrap, lmBtn);
      }

    } else {
      // ── Offline path ────────────────────────────────────────────────────
      let rawMatches = [];
      if (state.movieLensData.loaded) {
        const scored = Object.values(state.movieLensData.movies)
          .filter(m => m.title.toLowerCase().includes(q))
          .map(m => {
            const ratings = state.movieLensData.movieRatings[m.movieId] || {};
            const count = Object.keys(ratings).length;
            const avg = count > 0 ? Object.values(ratings).reduce((a,b)=>a+b,0)/count : 0;
            const score = (count * avg + 5 * 3.5) / (count + 5);
            const title = m.title.toLowerCase().replace(/\s\(\d{4}\)$/,'');
            const exact = title === q ? 2 : title.startsWith(q) ? 1 : 0;
            return { id: m.movieId, score, exact };
          });
        scored.sort((a,b) => b.exact !== a.exact ? b.exact - a.exact : b.score - a.score);
        rawMatches = scored.map(s => s.id);
      } else {
        rawMatches = MOVIES
          .filter(m => m.title.toLowerCase().includes(q))
          .map(m => {
            const title = m.title.toLowerCase();
            const exact = title === q ? 2 : title.startsWith(q) ? 1 : 0;
            return { ...m, _exact: exact };
          })
          .sort((a,b) => b._exact !== a._exact ? b._exact - a._exact : parseFloat(b.rating||0) - parseFloat(a.rating||0));
      }

      _searchState.allResults   = rawMatches;
      _searchState.offlineOffset = 0;

      if (countEl) countEl.textContent = `${rawMatches.length} found`;

      // Quick list (top 5)
      if (quickResults && rawMatches.length > 0) {
        const topFive = rawMatches.slice(0,5).map(item => {
          if (typeof item === 'number') {
            const m = MOVIES.find(mv=>mv.id===item) || {id:item,title:'Movie',year:'',poster:'',rating:'7.0'};
            return {id:m.id,title:m.title,year:m.year||'',poster:m.poster||'',vote_average:parseFloat(m.rating||7),mediaType:'movie'};
          }
          return {id:item.id||item.movieId,title:item.title||'',year:item.year||'',poster:item.poster||'',vote_average:parseFloat(item.rating||7),mediaType:'movie'};
        });
        renderQuickResults(topFive, quickResults);
        quickResults.classList.remove('hidden');
        if (divider && rawMatches.length > 5) divider.classList.remove('hidden');
      }

      if (rawMatches.length === 0) {
        searchResults.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;">No movies found matching that query.</div>';
      } else {
        _appendOfflineCards(rawMatches.slice(0, SEARCH_PAGE_SIZE), searchResults);
        _searchState.offlineOffset = SEARCH_PAGE_SIZE;
      }
      if (searchSec) searchSec.classList.remove('hidden');

      // Load more for offline
      const hasMore = _searchState.offlineOffset < rawMatches.length;
      if (lmWrap) lmWrap.style.display = hasMore ? 'block' : 'none';
      if (lmBtn) {
        lmBtn.onclick = () => _loadMoreOfflineResults(searchResults, lmWrap, lmBtn);
      }
    }
  }, 280);
}

/** Merge movies + TV + person titles, deduplicate, and sort by composite relevance.
 *
 *  Scoring weights (all additive, higher = better rank):
 *
 *  TITLE RELEVANCE  — 0–500 pts  (highest weight — what you typed matters most)
 *    500 : exact match  ("batman" → "Batman")
 *    420 : title starts with query  ("bat" → "Batman Begins")
 *    340 : query is a word inside the title  ("man" → "Batman")
 *    200 : all query words present  ("dark knight" → "The Dark Knight")
 *    100 : most query words present (partial keyword match)
 *      0 : no meaningful match
 *
 *  YEAR (recency)   — 0–180 pts  (high weight — newer = more likely what user wants)
 *    Linearly scaled: 2025 → 180, 2020 → 150, 2010 → 90, 2000 → 30, pre-1995 → 0
 *    This ensures "The Batman (2022)" beats "Batman (1989)" for the query "batman"
 *
 *  RATING           — 0–80 pts   (medium weight)
 *    vote_average (0–10) scaled to 0–80, dampened by vote count trust
 *    (< 300 votes = partial trust so obscure 10/10 films don't cheat)
 *
 *  POPULARITY       — 0–60 pts   (medium-low weight)
 *    log-scale of TMDb popularity score, capped at 60
 *    Reflects current trending/cultural relevance
 *
 *  VOTE COUNT       — 0–20 pts   (low weight, tie-breaker)
 *    log-scale so widely-seen films edge out obscure ones at equal rating
 *
 *  OBSCURITY PENALTY — up to −300 pts
 *    Buries junk entries (< 5 votes, < 2 popularity)
 *
 *  PERSON BOOST     — +40 pts
 *    Items from a person-credit search get a small bump so they surface above
 *    unrelated title matches of the same name
 */
function _mergeAndSort(movies, tvs, personTitles, q) {
  // Deduplicate — also drop items with no poster (grey placeholder cards)
  const seen = new Set();
  const combined = [];
  [...movies, ...tvs, ...personTitles].forEach(item => {
    if (!item.poster_path && !item.poster) return;
    const key = `${item.mediaType}-${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    } else if (item.personReason) {
      const ex = combined.find(x => `${x.mediaType}-${x.id}` === key);
      if (ex && !ex.personReason) ex.personReason = item.personReason;
    }
  });

  const words = q.trim().split(/\s+/).filter(Boolean);
  const qNorm = q.trim().toLowerCase();
  const currentYear = new Date().getFullYear();

  combined.forEach(item => {
    const raw   = (item.title || item.name || '').trim();
    const t     = raw.toLowerCase();

    // ── 1. TITLE RELEVANCE (0–500) ────────────────────────────────────────
    let titleScore = 0;
    if (t === qNorm) {
      titleScore = 500;                                      // exact
    } else if (t.startsWith(qNorm)) {
      titleScore = 420;                                      // starts with
    } else if (t.includes(qNorm)) {
      titleScore = 340;                                      // substring
    } else if (words.length > 1) {
      const matched = words.filter(w => t.includes(w));
      const ratio   = matched.length / words.length;
      titleScore = ratio === 1 ? 200                        // all words
               : ratio >= 0.5 ? Math.round(ratio * 100)    // most words
               : 0;
    } else {
      // Single word query — check if it appears as a standalone word in title
      const wordBoundary = new RegExp(`\\b${qNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      titleScore = wordBoundary.test(raw) ? 180 : 0;
    }

    // ── 2. YEAR / RECENCY (0–180) ─────────────────────────────────────────
    const dateStr = item.release_date || item.first_air_date || '';
    const year    = dateStr ? parseInt(dateStr.split('-')[0], 10) : 0;
    // Linear: 2025 → 180, 1995 → 0, older → 0
    const yearScore = year > 0
      ? Math.max(0, Math.min(180, Math.round(((year - 1995) / (currentYear - 1995)) * 180)))
      : 0;

    // ── 3. RATING (0–80) ──────────────────────────────────────────────────
    const rating     = item.vote_average || 0;
    const votes      = item.vote_count   || 0;
    const voteWeight = Math.min(1, votes / 300);
    const ratingScore = Math.round((rating / 10) * 80 * voteWeight);

    // ── 4. POPULARITY (0–60) ──────────────────────────────────────────────
    const pop      = item.popularity || 0;
    const popScore = pop > 0
      ? Math.min(60, Math.round((Math.log(pop + 1) / Math.log(5001)) * 60))
      : 0;

    // ── 5. VOTE COUNT (0–20, tie-breaker) ────────────────────────────────
    const voteScore = votes > 0
      ? Math.min(20, Math.round((Math.log(votes + 1) / Math.log(100001)) * 20))
      : 0;

    // ── 6. PERSON BOOST ───────────────────────────────────────────────────
    const personBoost = item.personReason ? 40 : 0;

    // ── 7. OBSCURITY PENALTY ──────────────────────────────────────────────
    const obscurityPenalty = (votes < 5  && pop < 2) ? 300
                           : (votes < 20 && pop < 5) ? 150
                           : 0;

    item._relevance = titleScore + yearScore + ratingScore + popScore + voteScore + personBoost - obscurityPenalty;
    item._titleScore = titleScore; // kept for tie-breaking
    item._year       = year;
  });

  // Keep only items with at least some title relevance (or a person reason)
  const relevant = combined.filter(item => {
    if (item.personReason) return true;
    return item._titleScore > 0;
  });
  const list = relevant.length > 0 ? relevant : combined;

  // Primary sort: composite score descending
  // Tie-break: if scores within 5pts, prefer newer release year
  list.sort((a, b) => {
    const diff = b._relevance - a._relevance;
    if (Math.abs(diff) > 5) return diff;
    return (b._year || 0) - (a._year || 0);
  });

  // Assign descending match % (99 → 70)
  const total = list.length;
  list.forEach((item, idx) => {
    item.match = total <= 1 ? 99 : Math.round(99 - (idx / (total - 1)) * 29);
  });

  return list;
}

/** Append a batch of TMDB items to the grid, skipping already-rendered keys */
function _appendSearchCards(items, container) {
  let rendered = 0;
  items.forEach(item => {
    // Skip items with no poster — they show as blank cards
    if (!item.poster_path) return;

    const key = `${item.mediaType}-${item.id}`;
    if (_searchState.rendered.has(key)) return;
    _searchState.rendered.add(key);

    let cardId = `tmdb-${item.mediaType}-${item.id}`;
    if (item.mediaType === 'movie' && state.movieLensData.loaded) {
      const mlMovie = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
      if (mlMovie) cardId = mlMovie.movieId;
    }
    const card = buildCard(cardId, item);
    card.classList.add('entering');
    container.appendChild(card);
    rendered++;
  });
  return rendered;
}

/** Append a batch of offline IDs/objects to the grid */
function _appendOfflineCards(items, container) {
  items.forEach(item => {
    const id = typeof item === 'object' ? (item.id||item.movieId) : item;
    const card = buildCard(id, typeof item === 'object' ? item : null);
    card.classList.add('entering');
    container.appendChild(card);
  });
}

/** Load the next page(s) of TMDB results and append them */
async function _loadMoreSearchResults(q, container, countEl, lmWrap, lmBtn) {
  if (_searchState.loading) return;
  _searchState.loading = true;
  if (lmBtn) { lmBtn.disabled = true; lmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading…'; }

  // Helper: render exactly `target` new cards from a list, with stagger animation
  function _renderItems(items, target) {
    let added = 0;
    for (const item of items) {
      if (added >= target) break;
      const key = `${item.mediaType||'movie'}-${item.id}`;
      if (_searchState.rendered.has(key)) continue;
      _searchState.rendered.add(key);
      let cardId = `tmdb-${item.mediaType||'movie'}-${item.id}`;
      if (item.mediaType === 'movie' && state.movieLensData && state.movieLensData.loaded) {
        const ml = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
        if (ml) cardId = ml.movieId;
      }
      const card = buildCard(cardId, item);
      card.classList.add('entering');
      card.style.animationDelay = `${Math.min(added * 18, 400)}ms`;
      container.appendChild(card);
      added++;
    }
    return added;
  }

  // ── Step 1: try the local buffer first ──────────────────────────────────
  const bufferSlice = _searchState.allResults.slice(_searchState.offlineOffset);
  const fromBuffer  = _renderItems(bufferSlice, SEARCH_MORE_SIZE);
  // Advance offset by how far we actually walked (including skipped dupes)
  // Find new offset: walk again to count consumed positions
  let consumed = 0, counted = 0;
  for (const item of bufferSlice) {
    if (counted >= fromBuffer && !_searchState.rendered.has(`${item.mediaType||'movie'}-${item.id}`)) break;
    consumed++;
    if (counted < fromBuffer) {
      const key = `${item.mediaType||'movie'}-${item.id}`;
      // Already rendered above — just count positions walked
      counted = Math.min(fromBuffer, counted + (_searchState.rendered.has(key) ? 1 : 0));
    }
  }
  _searchState.offlineOffset += consumed || bufferSlice.length;

  // If we already got a full batch, done
  if (fromBuffer >= SEARCH_MORE_SIZE) {
    _searchState.loading = false;
    const hasMoreBuffer = _searchState.offlineOffset < _searchState.allResults.length;
    const hasMorePages  = _searchState.tmdbMoviePage < _searchState.tmdbMovieTotalPages ||
                          _searchState.tmdbTvPage    < _searchState.tmdbTvTotalPages;
    if (lmWrap) lmWrap.style.display = (hasMoreBuffer || hasMorePages) ? 'block' : 'none';
    if (lmBtn) { lmBtn.disabled = false; lmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results'; }
    return;
  }

  // ── Step 2: buffer didn't fill the batch — fetch 3 more TMDb pages ──────
  const still = SEARCH_MORE_SIZE - fromBuffer;
  const fetches = [];

  // Always fetch at least 3 pages (movie + tv) to guarantee enough new cards
  for (let i = 0; i < 3; i++) {
    const mp = _searchState.tmdbMoviePage + 1 + i;
    const tp = _searchState.tmdbTvPage + 1 + i;
    fetches.push(
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=${mp}`)
        .then(r=>r.json())
        .then(d => {
          if (i === 2) _searchState.tmdbMoviePage = mp; // update after last batch
          _searchState.tmdbMovieTotalPages = d.total_pages || _searchState.tmdbMovieTotalPages;
          return (d.results||[]).map(x=>({...x, mediaType:'movie'}));
        })
        .catch(()=>[])
    );
    fetches.push(
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=${tp}`)
        .then(r=>r.json())
        .then(d => {
          if (i === 2) _searchState.tmdbTvPage = tp;
          _searchState.tmdbTvTotalPages = d.total_pages || _searchState.tmdbTvTotalPages;
          return (d.results||[]).map(x=>({...x, mediaType:'tv'}));
        })
        .catch(()=>[])
    );
  }

  const batches = await Promise.all(fetches);
  const allNew  = batches.flat();

  if (allNew.length === 0) {
    _searchState.loading = false;
    if (lmWrap) lmWrap.classList.add('hidden');
    if (lmBtn) { lmBtn.disabled = false; lmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results'; }
    return;
  }

  const sorted = _mergeAndSort(
    allNew.filter(i=>i.mediaType==='movie'),
    allNew.filter(i=>i.mediaType==='tv'),
    [], q
  );

  // Append new items to buffer, then render remainder of the batch
  _searchState.allResults = [..._searchState.allResults, ...sorted];
  _renderItems(sorted, still);
  _searchState.offlineOffset = _searchState.allResults.length; // consumed all new items

  _searchState.loading = false;
  // There are always more pages on TMDb for popular queries
  const hasMorePages = _searchState.tmdbMoviePage < _searchState.tmdbMovieTotalPages ||
                       _searchState.tmdbTvPage    < _searchState.tmdbTvTotalPages;
  if (lmWrap) lmWrap.style.display = hasMorePages ? 'block' : 'none';
  if (lmBtn) { lmBtn.disabled = false; lmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results'; }
}

/** Load the next page of offline results */
function _loadMoreOfflineResults(container, lmWrap, lmBtn) {
  const slice = _searchState.allResults.slice(
    _searchState.offlineOffset,
    _searchState.offlineOffset + SEARCH_PAGE_SIZE
  );
  _appendOfflineCards(slice, container);
  _searchState.offlineOffset += SEARCH_PAGE_SIZE;

  const hasMore = _searchState.offlineOffset < _searchState.allResults.length;
  if (lmWrap) lmWrap.style.display = hasMore ? 'block' : 'none';
}

/**
 * Compact top-match list rendered inside #search-section above the card grid.
 * Clicking a row opens the modal and dismisses the overlay.
 */
function renderQuickResults(items, container) {
  container.innerHTML = '';
  items.forEach(item => {
    const title  = item.title || item.name || '';
    const year   = (item.release_date||item.first_air_date||'').split('-')[0] || item.year || '';
    const rating = item.vote_average ? parseFloat(item.vote_average).toFixed(1) : null;
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
      : (item.poster||'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=80&q=80');
    const isTV   = item.mediaType === 'tv';
    const cardId = item.mediaType
      ? `tmdb-${item.mediaType}-${item.id}`
      : (item.id||item.movieId);
    const match  = item.vote_average ? Math.min(99, Math.round(item.vote_average * 10)) : 85;

    const row = document.createElement('div');
    row.className = 'sq-row';
    row.innerHTML = `
      <img class="sq-thumb" src="${poster}" alt="${title}"
           onerror="this.src='https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=80&q=80'"/>
      <div class="sq-body">
        <div class="sq-title">${title}</div>
        <div class="sq-meta">
          <span class="sq-badge ${isTV?'tv':'movie'}">${isTV?'TV Show':'Movie'}</span>
          ${year?`<span class="sq-dot">·</span><span>${year}</span>`:''}
          ${rating?`<span class="sq-dot">·</span><span class="sq-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ${rating}</span>`:''}
        </div>
      </div>
      <span class="sq-match">${match}% Match</span>`;

    row.addEventListener('click', () => {
      // Commit: close dropdown, open modal
      _searchCommitted = true;
      closeSuggestionsDropdown();
      fetchTMDBDetails(cardId).then(details => { if (details) openModal(details); });
    });
    container.appendChild(row);
  });
}

// Logo click listener — always navigate home regardless of current view
document.querySelectorAll('.logo, .footer-logo').forEach(logo => {
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    activeViewState = 'home';
    showHomePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Clean the URL — show plain / instead of /#home
    history.replaceState(null, '', window.location.pathname);
  });
});

/* ─── SEARCH MODAL LEGACY ALIASES ─── */
// Redirect any legacy calls to the unified panel system
window.openSearchModal = function() {
  window.openSearchPanel();
};
window.closeSearchModal = function() {
  window.closeSearchPanel();
};

/* ─── DYNAMIC HERO SECTION ─── */
export function updateHeroUI(movie) {
  if (!movie) return;
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  // Stop and hide video container if currently playing trailer
  const activeVideoContainer = document.getElementById('hero-video-container');
  const activeVideoIframe = document.getElementById('hero-video-iframe');
  if (activeVideoContainer && !activeVideoContainer.classList.contains('hidden')) {
    if (activeVideoIframe) activeVideoIframe.src = '';
    activeVideoContainer.classList.add('hidden');
    document.body.classList.remove('hero-video-active');
  }

  // Fade out the hero content, swap data, then fade back in
  const heroContent = heroSection.querySelector('.hero-content');
  const heroImg = heroSection.querySelector('.hero-img');

  const doUpdate = () => {
    if (heroImg) {
      heroImg.style.backgroundImage = `url('${movie.backdrop}')`;
    }
  
  const chip = heroSection.querySelector('.match-chip');
  if (chip) {
    const starCount = movie.match >= 90 ? 5 : (movie.match >= 75 ? 4 : (movie.match >= 60 ? 3 : (movie.match >= 40 ? 2 : 1)));
    const starsStr = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
    chip.innerHTML = `<span style="color:#FFD700;margin-right:6px;letter-spacing:-0.5px">${starsStr}</span> ${movie.match}% Match For You`;
  }
  
  const title = heroSection.querySelector('.hero-title');
  if (title) {
    // Render each word on its own line; multi-word tokens (split by space) each get a block span
    if (movie.title.includes(':')) {
      const parts = movie.title.split(':');
      const mainWords = parts[0].trim().split(' ').map(w => `<span class="title-word">${w}</span>`).join('');
      title.innerHTML = `${mainWords}<span class="title-word" style="font-size:0.6em;font-weight:700">${parts.slice(1).join(':').trim()}</span>`;
    } else {
      const words = movie.title.split(' ');
      title.innerHTML = words.map(w => `<span class="title-word">${w}</span>`).join('');
    }
  }
  
  const sub = heroSection.querySelector('.hero-sub');
  if (sub) {
    sub.innerHTML = `${movie.year} &nbsp;·&nbsp; ${movie.runtime} &nbsp;·&nbsp; ${movie.genre}`;
  }
  
  const synopsis = heroSection.querySelector('.hero-synopsis');
  if (synopsis) {
    synopsis.textContent = movie.synopsis;
  }
  
  const whyTag = heroSection.querySelector('.why-tag');
  if (whyTag) {
    const reasons = movie.reasons || ['Highly Recommended', 'Popular Pick', 'Great Storytelling'];
    whyTag.innerHTML = `<i class="fa-solid fa-brain" style="font-size:10px;color:var(--vl)"></i> ${reasons.slice(0, 3).join(' · ')}`;
  }
  
  const playBtn = document.getElementById('hero-play-btn');
  if (playBtn) {
    playBtn.onclick = () => {
      const heroVideoContainer = document.getElementById('hero-video-container');
      const heroVideoIframe = document.getElementById('hero-video-iframe');
      const heroVideoClose = document.getElementById('hero-video-close');
      const heroDots = document.getElementById('hero-dots');

      if (movie.trailerKey && heroVideoContainer && heroVideoIframe) {
        stopHeroRotation();
        document.body.classList.add('hero-video-active');
        heroVideoIframe.src = `https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&start=3&rel=0`;
        heroVideoContainer.classList.remove('hidden');

        const closeTrailer = () => {
          heroVideoIframe.src = '';
          heroVideoContainer.classList.add('hidden');
          document.body.classList.remove('hero-video-active');
          startHeroRotation();
        };

        if (heroVideoClose) {
          heroVideoClose.onclick = closeTrailer;
        }
      } else {
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`, '_blank');
      }
    };
  }
  
  const infoBtn = document.getElementById('hero-info-btn');
  if (infoBtn) {
    infoBtn.onclick = () => openModal(movie);
  }
  
  const wlBtn = document.getElementById('hero-wl-btn');
  if (wlBtn) {
    const updateWLIcon = () => {
      const isAdded = state.watchlist.some(m => String(m.id) === String(movie.id));
      wlBtn.innerHTML = isAdded ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
      wlBtn.title = isAdded ? 'In watchlist' : 'Add to watchlist';
    };
    updateWLIcon();
    wlBtn.onclick = () => {
      if (!state.watchlist.some(m => String(m.id) === String(movie.id))) {
        addToWatchlist(movie, wlBtn);
        updateWLIcon();
      }
    };
  }
  }; // end doUpdate

  // If hero content is already visible, crossfade; otherwise just update directly
  if (heroContent && heroContent.style.opacity !== '0' && state.currentHeroMovie) {
    gsap.to(heroContent, {
      opacity: 0, y: 10, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        doUpdate();
        gsap.fromTo(heroContent,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
      }
    });
  } else {
    doUpdate();
  }
}

export async function initHero() {
  let heroMovie = null;

  if (TMDB_API_KEY && (!state.movieLensData.loaded || Object.keys(state.movieLensData.movies || {}).length === 0)) {
    try {
      // Fetch both now_playing and popular to get a wide, varied pool
      const [npRes, popRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=1`),
        fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=1`)
      ]);
      const [npData, popData] = await Promise.all([npRes.json(), popRes.json()]);

      // Merge, deduplicate, filter to movies with backdrops (hero looks best with one)
      const seen = new Set();
      const pool = [];
      [...(npData.results || []), ...(popData.results || [])].forEach(m => {
        if (!seen.has(m.id) && m.backdrop_path) { seen.add(m.id); pool.push(m); }
      });

      if (pool.length > 0) {
        // Avoid repeating the movie that was last shown
        const lastId = state.currentHeroMovie && state.currentHeroMovie.id;
        const candidates = pool.filter(m => String(m.id) !== String(lastId));
        const pick = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : pool[Math.floor(Math.random() * pool.length)];
        heroMovie = await fetchTMDBDetails(pick.id);
      }
    } catch(e) {
      console.warn("Hero fetch error, using fallback:", e);
    }
  } else if (state.movieLensData.loaded) {
    const myRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    if (Object.keys(myRatings).length > 0 && typeof state.personalizedRecommendations === 'object') {
      const sortedIds = Object.entries(state.personalizedRecommendations)
        .sort((a, b) => b[1] - a[1])
        .map(entry => parseInt(entry[0]));
      if (sortedIds.length > 0) {
        // Use top 10 candidates to get variety
        const lastId = state.currentHeroMovie && state.currentHeroMovie.id;
        const candidates = sortedIds.slice(0, 10).filter(id => String(id) !== String(lastId));
        const randomId = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : sortedIds[0];
        heroMovie = await fetchTMDBDetails(randomId);
      }
    }
  }

  if (!heroMovie) {
    // Fallback pool — avoid repeating the current one
    const lastId = state.currentHeroMovie && state.currentHeroMovie.id;
    const fallbackPool = DEFAULT_RECS.filter(id => String(id) !== String(lastId));
    const randomId = fallbackPool.length > 0
      ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
      : DEFAULT_RECS[Math.floor(Math.random() * DEFAULT_RECS.length)];
    heroMovie = await fetchTMDBDetails(randomId);
  }

  if (heroMovie) {
    state.currentHeroMovie = heroMovie;
    updateHeroUI(heroMovie);
  }
}

/* ─── HERO AUTO-ROTATION ─── */

async function buildRotationPool() {
  const seen = new Set();
  const ids = [];

  if (TMDB_API_KEY) {
    try {
      // Fetch 3 pages each of now_playing and popular for a wide varied pool (~120 candidates)
      const pages = [1, 2, 3];
      const fetches = [
        ...pages.map(p => fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=${p}`)),
        ...pages.map(p => fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${p}`)),
        fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=1`),
      ];
      const responses = await Promise.all(fetches);
      const jsons = await Promise.all(responses.map(r => r.json()));

      jsons.forEach(data => {
        (data.results || []).forEach(m => {
          if (!seen.has(m.id) && m.backdrop_path) {
            seen.add(m.id);
            ids.push(m.id);
          }
        });
      });
    } catch(e) { /* fall through */ }
  }

  // Always pad with DEFAULT_RECS so offline mode has enough variety
  DEFAULT_RECS.forEach(id => {
    if (!seen.has(id)) { seen.add(id); ids.push(id); }
  });

  // Fisher-Yates shuffle for true randomness every visit
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // Pre-fetch details for up to 10 entries so first several transitions are instant
  const details = await Promise.all(ids.slice(0, 10).map(id => fetchTMDBDetails(id)));
  return details.filter(Boolean);
}

function _updateHeroDots(total, active) {
  const dotsEl = document.getElementById('hero-dots');
  if (!dotsEl) return;

  // If count changed, rebuild; otherwise just toggle classes — preserves CSS transitions
  if (dotsEl.children.length !== total) {
    dotsEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === active ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        heroRotationIndex = i;
        _showHeroSlide(i);
        _updateHeroDots(heroRotationPool.length, i);
        _restartProgress();
      });
      dotsEl.appendChild(dot);
    }
  } else {
    // Just swap the active class — no DOM rebuild, so CSS transition fires cleanly
    Array.from(dotsEl.children).forEach((dot, i) => {
      dot.classList.toggle('active', i === active);
    });
  }
}

function _restartProgress() {
  clearInterval(heroRotationInterval);
  // Guard: need at least 2 slides to rotate
  if (heroRotationPool.length < 2) return;
  heroRotationInterval = setInterval(() => {
    if (heroRotationPool.length < 2) return;
    heroRotationIndex = (heroRotationIndex + 1) % heroRotationPool.length;
    _showHeroSlide(heroRotationIndex);
    _updateHeroDots(heroRotationPool.length, heroRotationIndex);
  }, HERO_ROTATION_DURATION);
}

function _showHeroSlide(index) {
  const movie = heroRotationPool[index];
  if (!movie) return;
  state.currentHeroMovie = movie;
  updateHeroUI(movie);
}

export async function startHeroRotation() {
  stopHeroRotation();

  // Always rebuild pool on each home visit for fresh content
  heroRotationPool = await buildRotationPool();
  if (heroRotationPool.length === 0) return;

  // Match pool position to whatever initHero already showed
  const currentId = state.currentHeroMovie && state.currentHeroMovie.id;
  const idx = heroRotationPool.findIndex(m => String(m.id) === String(currentId));
  heroRotationIndex = idx >= 0 ? idx : 0;

  // If the pool's first entry wasn't what initHero showed, update the hero now
  if (idx < 0) _showHeroSlide(0);

  _updateHeroDots(heroRotationPool.length, heroRotationIndex);
  _restartProgress();
}

export function stopHeroRotation() {
  clearInterval(heroRotationInterval);
  heroRotationInterval = null;
  const dotsEl = document.getElementById('hero-dots');
  if (dotsEl) dotsEl.innerHTML = '';
}

// Wire See All buttons grid toggle immediately
export function initSeeAllButtons() {
  document.querySelectorAll('.see-all').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = e.target.closest('section');
      if (section) {
        const isGrid = section.classList.toggle('grid-active');
        if (isGrid) {
          e.target.innerHTML = `Show less <i class="fa-solid fa-chevron-up" style="font-size:10px"></i>`;
        } else {
          const isFullChart = e.target.textContent.trim().toLowerCase().includes('chart') || section.id === 'trending-section';
          e.target.innerHTML = isFullChart 
            ? `Full chart <i class="fa-solid fa-chevron-right" style="font-size:10px"></i>`
            : `See all <i class="fa-solid fa-chevron-right" style="font-size:10px"></i>`;
        }
      }
    });
  });
}

export function initNavbarScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  
  // Update solid/glassmorphic state
  const updateScrolledState = () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  
  // Hide during active scroll, show on stop
  let isScrolling = null;
  const handleScrollBehavior = () => {
    nav.classList.add('nav-hidden');
    clearTimeout(isScrolling);
    isScrolling = setTimeout(() => {
      nav.classList.remove('nav-hidden');
    }, 200); // Wait 200ms of inactivity to slide it back down
  };
  
  window.addEventListener('scroll', () => {
    updateScrolledState();
    handleScrollBehavior();
  }, { passive: true });
  
  // Initial check on page load without triggering hide animation
  updateScrolledState();
}

// Setup intersection observer reveal in modules
export function initScrollReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });
  document.querySelectorAll('.reveal').forEach(el => {
    // Never auto-reveal search-section — it's shown/hidden programmatically
    if (el.id === 'search-section') return;
    io.observe(el);
  });
}

// ── Search input wiring ──────────────────────────────────────────────────────
// Deferred until DOM is ready — the input lives inside #tt-search-panel
// which is injected into the HTML, so we must wait for DOMContentLoaded.

let _searchCommitted = false;

/** Open the search panel centered with overlay */
window.openSearchPanel = function() {
  const panel = document.getElementById('tt-search-panel');
  const overlay = document.getElementById('tt-search-overlay');
  if (!panel) return;
  _searchCommitted = false;
  if (overlay) overlay.classList.remove('hidden');
  panel.classList.remove('hidden');
  // Mark Search tab active in tiktok-nav
  document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => el.classList.remove('active'));
  const searchTabEl = document.querySelector('.tiktok-nav .tt-item[onclick*="openSearchTab"]');
  if (searchTabEl) searchTabEl.classList.add('active');
  // Focus the input after the panel animates in
  const si = document.getElementById('search-input');
  if (si) requestAnimationFrame(() => { requestAnimationFrame(() => si.focus()); });
};

/** Close the search panel (keeps results visible in main) */
window.closeSearchPanel = function() {
  const panel = document.getElementById('tt-search-panel');
  const overlay = document.getElementById('tt-search-overlay');
  if (panel) panel.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
  closeSuggestionsDropdown();
};

/** Clear the search input inside the panel */
window.clearSearchPanel = function() {
  const si = document.getElementById('search-input');
  if (!si) return;
  si.value = '';
  si.dispatchEvent(new Event('input'));
  si.focus();
};

/** Close the autocomplete dropdown only — never touches the results grid */
function closeSuggestionsDropdown() {
  const sd = document.getElementById('search-suggestions');
  if (sd) { sd.classList.add('hidden'); sd.innerHTML = ''; }
  if (typeof suggestionsDebounce !== 'undefined') clearTimeout(suggestionsDebounce);
}

/** Called by the inline onkeydown="commitSearch()" on the input */
window.commitSearch = function() {
  _searchCommitted = true;
  closeSuggestionsDropdown();
  window.closeSearchPanel();

  const si = document.getElementById('search-input');
  const q  = si ? si.value.trim().toLowerCase() : '';
  if (!q) return;

  const searchResults = document.getElementById('search-results');
  const searchSec     = document.getElementById('search-section');
  const countEl       = document.getElementById('search-count');
  const lmWrap        = document.getElementById('search-load-more-wrap');
  const lmBtn         = document.getElementById('search-load-more-btn');
  if (!searchResults || !searchSec) return;

  // Switch to list/search mode (not genre-grid mode)
  state.isShowingGenre = false;
  const gridWrap = document.getElementById('genre-grid-wrap');
  const rowWrap  = document.getElementById('search-row-wrap');
  if (gridWrap) gridWrap.classList.add('hidden');
  if (rowWrap)  rowWrap.classList.remove('hidden');

  clearTimeout(searchDebounce);

  function _renderResults(results) {
    searchResults.innerHTML = '';
    _searchState = {
      q,
      tmdbMoviePage: 3,  // pages 1-3 already fetched upfront
      tmdbTvPage: 2,     // pages 1-2 already fetched upfront
      tmdbMovieTotalPages: _autocompleteCache.tmdbMovieTotalPages  || 1,
      tmdbTvTotalPages:    _autocompleteCache.tmdbTvTotalPages     || 1,
      rendered: new Set(),
      allResults: results, // full sorted list — Load More slices through this
      offlineOffset: 0,
      loading: false,
    };
    document.body.classList.add('search-active');
    // Remove any !important display:none set by showHomePage before revealing
    searchSec.style.removeProperty('display');
    searchSec.classList.remove('hidden');
    if (countEl) {
      countEl.style.display = '';
      countEl.textContent = `${results.length} Results`;
    }
    if (lmWrap) lmWrap.classList.add('hidden');

    // Render all search results at once
    results.forEach((item, idx) => {
      const key = `${item.mediaType||'movie'}-${item.id}`;
      if (_searchState.rendered.has(key)) return;
      _searchState.rendered.add(key);
      let cardId = `tmdb-${item.mediaType||'movie'}-${item.id}`;
      if (item.mediaType === 'movie' && state.movieLensData && state.movieLensData.loaded) {
        const ml = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
        if (ml) cardId = ml.movieId;
      }
      const card = buildCard(cardId, item);
      if (item.match) card.dataset.searchMatch = item.match;
      card.classList.add('entering');
      card.style.animationDelay = `${Math.min(idx * 18, 400)}ms`;
      searchResults.appendChild(card);
    });
    _searchState.offlineOffset = results.length; // all rendered

    // Show Load More if buffer has more OR TMDb has more pages
    const hasMoreBuffer = _searchState.offlineOffset < results.length;
    const hasMorePages  = _searchState.tmdbMoviePage < _searchState.tmdbMovieTotalPages ||
                          _searchState.tmdbTvPage    < _searchState.tmdbTvTotalPages;
    if (lmWrap) lmWrap.style.display = (hasMoreBuffer || hasMorePages) ? 'block' : 'none';
    if (lmBtn) {
      lmBtn.disabled = false;
      lmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results';
      lmBtn.onclick = () => _loadMoreSearchResults(q, searchResults, countEl, lmWrap, lmBtn);
    }
    setTimeout(() => {
      searchSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  }

  // If cache already has results for this exact query, render immediately
  if (_autocompleteCache.q === q && _autocompleteCache.results && _autocompleteCache.results.length > 0) {
    _renderResults(_autocompleteCache.results);
    return;
  }

  // Cache not ready yet — fetch fresh with same logic as autocomplete
  if (countEl) { countEl.style.display = ''; countEl.textContent = 'Searching…'; }
  document.body.classList.add('search-active');
  searchSec.style.removeProperty('display');
  searchSec.classList.remove('hidden');
  searchResults.innerHTML = '';

  if (TMDB_API_KEY) {
    Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=2`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=3`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=2`).then(r=>r.json()).catch(()=>({results:[],total_pages:1,total_results:0})),
      fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r=>r.json()).catch(()=>({results:[]})),
    ]).then(async ([m1, m2, m3, tv1, tv2, p]) => {
      const movieSeen = new Set();
      const allMovies = [];
      [m1, m2, m3].forEach(page => {
        (page.results||[]).forEach(i => { if (!movieSeen.has(i.id)) { movieSeen.add(i.id); allMovies.push({...i,mediaType:'movie'}); } });
      });
      const tvSeen = new Set();
      const allTv = [];
      [tv1, tv2].forEach(page => {
        (page.results||[]).forEach(i => { if (!tvSeen.has(i.id)) { tvSeen.add(i.id); allTv.push({...i,mediaType:'tv'}); } });
      });

      // Fetch full combined_credits for top matched people (not just known_for which is capped at 3)
      let personTitles = [];
      const topPersons = (p.results||[]).slice(0, 2);
      if (topPersons.length > 0) {
        const creditsFetches = await Promise.all(
          topPersons.map(person =>
            fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}`)
              .then(r => r.json())
              .then(credits => ({ person, credits }))
              .catch(() => null)
          )
        );
        const personSeen = new Set();
        creditsFetches.forEach(res => {
          if (!res) return;
          const { person, credits } = res;
          (credits.crew||[]).filter(i => i.job === 'Director').forEach(i => {
            const key = `${i.media_type||'movie'}-${i.id}`;
            if (!personSeen.has(key)) {
              personSeen.add(key);
              personTitles.push({...i, mediaType: i.media_type||'movie', personReason:{name:person.name, role:'Director'}});
            }
          });
          (credits.cast||[]).forEach(i => {
            const key = `${i.media_type||'movie'}-${i.id}`;
            if (!personSeen.has(key)) {
              personSeen.add(key);
              personTitles.push({...i, mediaType: i.media_type||'movie', personReason:{name:person.name, role:'Cast'}});
            }
          });
        });
        // Sort person titles by popularity so best work shows first
        personTitles.sort((a, b) => (b.popularity||0) - (a.popularity||0));
      }

      const sorted = _mergeAndSort(allMovies, allTv, personTitles, q);
      _autocompleteCache = {
        q, results: sorted,
        tmdbMovieTotalPages: m1.total_pages||1,   tmdbTvTotalPages: tv1.total_pages||1,
        tmdbMovieTotalResults: m1.total_results||0, tmdbTvTotalResults: tv1.total_results||0,
      };
      _renderResults(sorted);
    });
  } else {
    // Offline
    const allMovies = state.movieLensData && state.movieLensData.loaded
      ? Object.values(state.movieLensData.movies)
          .filter(m => m.title.toLowerCase().includes(q))
          .map(m => ({id: m.movieId, title: m.title.replace(/\s\(\d{4}\)$/,''), mediaType:'movie',
                      vote_average: null, popularity: 0}))
      : MOVIES.filter(m => m.title.toLowerCase().includes(q))
              .map(m => ({...m, mediaType:'movie'}));
    const sorted = _mergeAndSort(allMovies, [], [], q);
    _autocompleteCache = { q, results: sorted };
    _renderResults(sorted);
  }
};

// Wire listeners once DOM is ready
function initSearchListeners() {
  // Inject Gradual Blurs into static scroll containers
  document.querySelectorAll('.row-wrap, .trend-scroll-wrap').forEach(wrap => {
    injectGradualBlurs(wrap);
  });

  const si = document.getElementById('search-input');
  if (!si) return;

  // Show/hide clear button
  si.addEventListener('input', () => {
    const clearBtn = document.getElementById('tt-search-clear');
    if (clearBtn) clearBtn.style.display = si.value.trim() ? 'block' : 'none';
  });

  // Every keystroke: show suggestions + render full results
  si.addEventListener('input', (e) => {
    _searchCommitted = false;
    const q = e.target.value.trim();
    if (q) {
      updateSearchSuggestions(q.toLowerCase());
    } else {
      closeSuggestionsDropdown();
      // Clear the results grid when input is emptied
      clearSearch(true);
    }
  });

  // Focus: reopen suggestions unless just committed
  si.addEventListener('focus', () => {
    if (_searchCommitted) return;
    const q = si.value.trim();
    if (q) updateSearchSuggestions(q.toLowerCase());
  });

  // Keyboard: Enter → commitSearch, Escape → close panel
  si.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.commitSearch();
    }
    if (e.key === 'Escape') {
      closeSuggestionsDropdown();
      si.blur();
      window.closeSearchPanel();
    }
  });

  // Click anywhere outside the panel → close the whole search panel
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#tt-search-panel') && !e.target.closest('.tiktok-nav .tt-item[onclick*="openSearchTab"]')) {
      window.closeSearchPanel();
    }
  });
  
  // Click on search overlay to close
  const searchOverlay = document.getElementById('tt-search-overlay');
  if (searchOverlay) {
    searchOverlay.addEventListener('click', () => {
      window.closeSearchPanel();
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initSearchListeners);
} else {
  initSearchListeners();
}

// Expose scrollRow, scrollPlat, and modal utilities to window for legacy inline HTML attributes compatibility
window.clearSearch = clearSearch;
window.scrollRow = scrollRow;
window.scrollPlat = scrollPlat;
window.scrollToWatchlist = scrollToWatchlist;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.handleSettingsOverlay = handleSettingsOverlay;
window.saveSettings = saveSettings;
window.switchSettingsTab = switchSettingsTab;
window.resetContentPreferences = resetContentPreferences;
window.testTMDBConnection = testTMDBConnection;
window.toggleGenrePill = toggleGenrePill;
window.toggleProviderCheckbox = toggleProviderCheckbox;
window.showToast = showToast;
window.scrollTrend = scrollTrend;
window.handleOverlay = handleOverlay;
window.closeModal = closeModal;
window.openModal = openModal;
window.surpriseMe = surpriseMe;
window.setType = setType;
window.initHashRouting = initHashRouting;

// Keyboard horizontal grid navigation for hovered rows
let hoveredScrollContainer = null;

document.addEventListener('mouseover', (e) => {
  let container = e.target.closest('.row-scroll, #trend-row, .plat-row, .mini-row');
  if (!container) {
    // If hovering over wrapper or buttons, fall back to finding the inner scroll container
    const wrap = e.target.closest('.row-wrap, .trend-scroll-wrap, .plat-wrap');
    if (wrap) {
      container = wrap.querySelector('.row-scroll, #trend-row, .plat-row');
    }
  }
  if (container !== hoveredScrollContainer) {
    // Clean up selected card and its hover state when switching rows
    if (hoveredScrollContainer) {
      hoveredScrollContainer.querySelectorAll('.selected-card').forEach(c => {
        c.classList.remove('selected-card');
        c.dispatchEvent(new MouseEvent('mouseleave'));
      });
    }
    hoveredScrollContainer = container;
  }
});

document.addEventListener('mouseleave', () => {
  if (hoveredScrollContainer) {
    hoveredScrollContainer.querySelectorAll('.selected-card').forEach(c => {
      c.classList.remove('selected-card');
      c.dispatchEvent(new MouseEvent('mouseleave'));
    });
  }
  hoveredScrollContainer = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (hoveredScrollContainer) {
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.isContentEditable
      )) {
        return;
      }
      e.preventDefault();

      const cards = Array.from(hoveredScrollContainer.querySelectorAll('.movie-card, .trend-card, .plat-card, .mini'));
      if (cards.length === 0) return;

      // Find currently selected card
      let currentIndex = cards.findIndex(card => card.classList.contains('selected-card'));
      if (currentIndex === -1) {
        // Fallback to currently hovered card
        currentIndex = cards.findIndex(card => card.matches(':hover'));
      }
      if (currentIndex === -1) {
        // Fallback to first card scrolled visible from the left
        const scrollLeft = hoveredScrollContainer.scrollLeft;
        currentIndex = cards.findIndex(card => card.offsetLeft >= scrollLeft);
      }
      if (currentIndex === -1) {
        currentIndex = 0;
      }

      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = currentIndex + dir;

      if (nextIndex >= 0 && nextIndex < cards.length) {
        // Deselect current card
        if (currentIndex !== -1) {
          cards[currentIndex].classList.remove('selected-card');
          cards[currentIndex].dispatchEvent(new MouseEvent('mouseleave'));
        }

        // Select next card
        const nextCard = cards[nextIndex];
        nextCard.classList.add('selected-card');
        nextCard.dispatchEvent(new MouseEvent('mouseenter'));

        // Center the newly selected card in the viewport of the scroll row
        const containerWidth = hoveredScrollContainer.clientWidth;
        const cardWidth = nextCard.offsetWidth;
        const cardLeft = nextCard.offsetLeft;
        const targetScrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);

        hoveredScrollContainer.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      }
    }
  } else if (e.key === 'Enter') {
    if (hoveredScrollContainer) {
      const selected = hoveredScrollContainer.querySelector('.selected-card');
      if (selected) {
        e.preventDefault();
        selected.click();
      }
    }
  } else if (e.key.toLowerCase() === 's') {
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA' || 
      document.activeElement.isContentEditable
    )) {
      return;
    }
    e.preventDefault();
    if (typeof window.openSearchPanel === 'function') {
      window.openSearchPanel();
    }
  } else if (e.key.toLowerCase() === 'r') {
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA' || 
      document.activeElement.isContentEditable
    )) {
      return;
    }
    e.preventDefault();
    if (state.watchlist.length >= 2 && !pickSpinning) {
      // Switch to watchlist tab if not already there, then spin
      if (activeViewState !== 'watchlist') {
        window.location.hash = '#watchlist-section';
        // Wait briefly for page switch to render and gallery to initialize before spinning
        setTimeout(() => {
          rollPickMovie();
        }, 150);
      } else {
        rollPickMovie();
      }
    }
  }
});

/* ─── BROWSER HASH ROUTING ─── */
export let activeViewState = 'home'; // Tracks active base view: 'home' or 'watchlist'

export function initHashRouting() {
  window.addEventListener('hashchange', handleHashChange);
  // Run on initial load to handle deep links
  handleHashChange();
}

export function handleHashChange() {
  const hash = window.location.hash || '';
  
  if (!state.isLoggedIn) {
    showLandingPage();
    return;
  }
  
  if (state.isLoggedIn && localStorage.getItem('swipe_onboarding_completed') !== 'true') {
    if (window.checkOnboardingState) window.checkOnboardingState();
    return;
  }
  
  // If already logged in and on landing page, redirect to home
  if (state.isLoggedIn && (hash === '#landing-page' || hash === '#landing' || hash === '' || hash === '#')) {
    activeViewState = 'home';
    showHomePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', window.location.pathname);
    return;
  }
  
  // 1. Landing page routing
  if (hash === '#landing-page' || hash === '#landing') {
    showLandingPage();
    return;
  }
  
  // 2. Movie details modal routing
  if (hash.startsWith('#movie-')) {
    const movieIdStr = hash.replace('#movie-', '');
    const movieId = isNaN(movieIdStr) ? movieIdStr : Number(movieIdStr);
    
    // If the details modal is already open for this movie, avoid re-triggering
    if (state.currentModalMovie && String(state.currentModalMovie.id) === String(movieId)) {
      return;
    }
    
    fetchTMDBDetails(movieId).then(details => {
      if (details) {
        openModal(details, false, true);
      } else {
        const localMovie = MOVIES.find(m => String(m.id) === String(movieId));
        if (localMovie) {
          openModal(localMovie, false, true);
        }
      }
    });
    return;
  }
  
  // Close details modal if open but hash does not point to a movie anymore
  if (state.currentModalMovie && !hash.startsWith('#movie-')) {
    closeModal(true);
  }

  // 3. Watchlist routing
  if (hash === '#watchlist-section' || hash === '#watchlist') {
    activeViewState = 'watchlist';
    showWatchlistPage();
    return;
  }
  
  // 4. Search routing - open the unified search panel
  if (hash === '#search') {
    window.location.hash = (activeViewState === 'watchlist') ? '#watchlist-section' : '';
    history.replaceState(null, '', window.location.pathname);
    if (typeof window.openSearchPanel === 'function') {
      window.openSearchPanel();
    }
    return;
  }

  // 5. Section routing (Trending, Platforms, Surprise Me)
  if (hash === '#trending-section' || hash === '#platforms-section' || hash === '#surprise-section') {
    activeViewState = 'home';
    showHomePage();
    
    const target = document.getElementById(hash.substring(1));
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
    return;
  }
  
  // 6. Default - if not logged in, show landing page; otherwise show home page
  if (hash === '' || hash === '#' || hash === '#home' || hash === '#hero') {
    if (!state.isLoggedIn) {
      // If not logged in and at root, redirect to landing page
      window.location.hash = '#landing-page';
      return;
    }
    activeViewState = 'home';
    showHomePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Clean the URL — show plain / instead of /#home or /#hero
    history.replaceState(null, '', window.location.pathname);
    return;
  }
}

export function showLandingPage() {
  clearSearch(true);
  stopHeroRotation();
  closeModal(true);
  
  // Show the landing page by adding a class to body
  document.body.classList.add('show-landing-page');
}



export function showWatchlistPage() {
  // Hide the landing page
  document.body.classList.remove('show-landing-page');
  if (typeof window.closeSearchPanel === 'function') window.closeSearchPanel();
  
  clearSearch(true);
  stopHeroRotation();
  updateNavbarActiveLink('watchlist-section');
  closeModal(true);

  const homeElements = [
    document.getElementById('hero'),
    // homepage-search-container removed — search is now in tiktok-nav panel
    ...Array.from(document.querySelectorAll('main > section:not(#watchlist-section):not(#watched-section):not(#search-section)'))
  ].filter(Boolean);

  const watchlistSection = document.getElementById('watchlist-section');
  if (!watchlistSection) return;

  // Hide watched section too
  const watchedSection2 = document.getElementById('watched-section');
  if (watchedSection2) watchedSection2.style.setProperty('display', 'none', 'important');

  document.body.classList.add('watchlist-active');

  // GSAP cross-fade transition
  gsap.killTweensOf(homeElements);
  gsap.killTweensOf(watchlistSection);

  const isHomeVisible = homeElements.some(el => !el.classList.contains('hidden') && parseFloat(el.style.opacity || "1") > 0);
  
  if (isHomeVisible) {
    gsap.to(homeElements, {
      opacity: 0,
      y: -15,
      scale: 0.98,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete: () => {
        homeElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        
        watchlistSection.style.setProperty('display', 'block', 'important');
        updateWatchlistUI();
        
        gsap.fromTo(watchlistSection, 
          { opacity: 0, y: 15, scale: 0.98 },
          { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            duration: 0.4, 
            ease: 'power2.out',
            onComplete: () => {
              if (pickGalleryApp) {
                pickGalleryApp.onResize();
              }
            }
          }
        );
        window.scrollTo(0, 0);
      }
    });
  } else {
    homeElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
    watchlistSection.style.setProperty('display', 'block', 'important');
    updateWatchlistUI();
    
    gsap.fromTo(watchlistSection, 
      { opacity: 0, y: 15, scale: 0.98 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.4, 
        ease: 'power2.out',
        onComplete: () => {
          if (pickGalleryApp) {
            pickGalleryApp.onResize();
          }
        }
      }
    );
    window.scrollTo(0, 0);
  }
}

/* ─── ALREADY WATCHED PAGE ─────────────────────────────────────────────────
   Shows every movie the user has rated (via the in-modal star widget).
   Each card gets a user-rating badge overlay instead of the match % badge.
   Sorted by user rating desc by default; user can change via the dropdown.
──────────────────────────────────────────────────────────────────────────── */

export function showAlreadyWatched() {
  clearSearch(true);
  stopHeroRotation();
  updateNavbarActiveLink('watched-section');

  const watchedSection  = document.getElementById('watched-section');
  const watchedGrid     = document.getElementById('watched-grid');
  const emptyMsg        = document.getElementById('watched-empty');
  const countBadge      = document.getElementById('watched-nav-badge');
  const sectionBadge    = document.getElementById('watched-count-badge');
  const subEl           = document.getElementById('watched-sub');
  if (!watchedSection || !watchedGrid) return;

  // Hide home + search views
  const homeElements = [
    document.getElementById('hero'),
    ...Array.from(document.querySelectorAll('main > section:not(#watched-section):not(#watchlist-section):not(#search-section)'))
  ].filter(Boolean);

  const watchlistSection = document.getElementById('watchlist-section');

  closeModal(true);

  gsap.killTweensOf(homeElements);
  gsap.to(homeElements, {
    opacity: 0, y: -12, scale: 0.98, duration: 0.28, ease: 'power2.inOut',
    onComplete: () => {
      homeElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
      if (watchlistSection) watchlistSection.style.setProperty('display', 'none', 'important');

      watchedSection.style.setProperty('display', 'block', 'important');
      _renderWatchedGrid('recent');

      gsap.fromTo(watchedSection,
        { opacity: 0, y: 14, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out' }
      );
      window.scrollTo(0, 0);
    }
  });
}

function _renderWatchedGrid(sortMode = 'recent') {
  const watchedGrid  = document.getElementById('watched-grid');
  const emptyMsg     = document.getElementById('watched-empty');
  const sectionBadge = document.getElementById('watched-count-badge');
  const subEl        = document.getElementById('watched-sub');
  if (!watchedGrid) return;

  const userRatings  = JSON.parse(localStorage.getItem('user_movie_ratings')      || '{}');
  const timestamps   = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
  const entries = Object.entries(userRatings); // [ [movieId, starValue], … ]

  // Update nav badge
  const navBadge = document.getElementById('watched-nav-badge');
  if (navBadge) {
    navBadge.textContent = entries.length;
    navBadge.style.display = entries.length > 0 ? 'flex' : 'none';
  }

  if (entries.length === 0) {
    watchedGrid.innerHTML = '';
    if (emptyMsg)     emptyMsg.classList.remove('hidden');
    if (sectionBadge) sectionBadge.classList.add('hidden');
    if (subEl)        subEl.textContent = 'No rated movies yet — open any movie and give it stars';
    return;
  }

  if (emptyMsg)     emptyMsg.classList.add('hidden');
  if (sectionBadge) { sectionBadge.textContent = `${entries.length} rated`; sectionBadge.style.display = ''; }
  if (subEl)        subEl.textContent = `${entries.length} movie${entries.length !== 1 ? 's' : ''} you've rated — your personal scores`;

  // Sort using real timestamps for "recent"; ratings for the other modes
  let sorted = [...entries];
  if (sortMode === 'recent') {
    // Latest watched first — fall back to movieId order for entries without a timestamp
    sorted.sort((a, b) => {
      const ta = timestamps[a[0]] || 0;
      const tb = timestamps[b[0]] || 0;
      return tb - ta; // descending: newest first
    });
  } else if (sortMode === 'rating-desc') {
    sorted.sort((a, b) => b[1] - a[1] || (timestamps[b[0]] || 0) - (timestamps[a[0]] || 0));
  } else if (sortMode === 'rating-asc') {
    sorted.sort((a, b) => a[1] - b[1] || (timestamps[a[0]] || 0) - (timestamps[b[0]] || 0));
  }

  watchedGrid.innerHTML = '';

  sorted.forEach(([movieId, starVal], idx) => {
    const numId = isNaN(Number(movieId)) ? movieId : Number(movieId);

    // Build a standard card then overlay it with the user rating badge
    const card = buildCard(numId);
    card.classList.add('watched-card', 'entering');
    card.style.animationDelay = `${Math.min(idx, 20) * 28}ms`;

    // Replace the match badge with the user's own star rating
    const matchBadge = card.querySelector('.m-badge');
    if (matchBadge) {
      const starsHtml = '★'.repeat(starVal) + '<span style="opacity:.3">' + '★'.repeat(5 - starVal) + '</span>';
      matchBadge.innerHTML = `<span class="watched-star-badge">${starsHtml} <em>${starVal}/5</em></span>`;
      matchBadge.className = 'watched-user-rating-badge';
    }

    watchedGrid.appendChild(card);
  });
}

// Expose to window so the HTML sort dropdown and nav button can call it
window.showAlreadyWatched = showAlreadyWatched;
window.sortWatchedGrid = function(mode) { _renderWatchedGrid(mode); };

/* ─── Keep the watched nav badge in sync whenever a rating changes ── */
function _syncWatchedBadge() {
  const userRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
  const count = Object.keys(userRatings).length;
  const badge = document.getElementById('watched-nav-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

/* ─── Helper: show/hide rating side and watchlist wrap smoothly ─────────── */
function _setWatchedState(isWatched) {
  const pill          = document.getElementById('m-watched-pill');
  const inner         = pill ? pill.closest('.urb-inner') : null;
  const label         = pill ? pill.querySelector('.urb-watched-label') : null;
  const watchlistWrap = document.getElementById('m-watchlist-wrap');
  const ratingSide    = document.getElementById('urb-rating-side');

  if (isWatched) {
    if (pill)          pill.classList.add('active');
    if (inner)         inner.classList.add('watched');
    if (label)         label.textContent = 'Already Watched';
    if (watchlistWrap) watchlistWrap.classList.add('hidden');
    if (ratingSide)    ratingSide.classList.add('visible');
  } else {
    if (pill)          pill.classList.remove('active');
    if (inner)         inner.classList.remove('watched');
    if (label)         label.textContent = 'Watched?';
    if (ratingSide)    ratingSide.classList.remove('visible');
    if (watchlistWrap) watchlistWrap.classList.remove('hidden');
  }
}

/* ─── "Already Watched" pill toggle in modal ──────────────────────────────
   Initial state: pill centred, label "Watched?", question-mark icon, rating hidden.
   After click:   pill slides left, label → "Already Watched", eye icon, rating revealed.
   Click again:   reverts to initial state, clears rating.
──────────────────────────────────────────────────────────────────────────── */
window._toggleModalWatched = function() {
  const movie = state.currentModalMovie;
  if (!movie) return;

  const ratings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
  const hasRating = ratings[movie.id] > 0;

  if (hasRating) {
    // ── Un-watch: revert to initial state ──
    delete ratings[movie.id];
    localStorage.setItem('user_movie_ratings', JSON.stringify(ratings));
    const ts = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
    delete ts[movie.id];
    localStorage.setItem('user_watched_timestamps', JSON.stringify(ts));
    highlightStars(0);

    _setWatchedState(false);

    // Restore the movie to watchlist if it was there before
    const wasInWatchlistBefore = state.watchlistToRestore.includes(String(movie.id));
    if (wasInWatchlistBefore) {
      addToWatchlist(movie, null);
      state.watchlistToRestore = state.watchlistToRestore.filter(id => String(id) !== String(movie.id));
      saveWatchlistToStorage();
    }
    _updateModalWatchlistPill();
    _syncWatchedBadge();

    // If the Already Watched page is open, remove this card immediately
    const watchedSection = document.getElementById('watched-section');
    if (watchedSection && !watchedSection.classList.contains('hidden') && !watchedSection.style.getPropertyValue('display').includes('none')) {
      const card = watchedSection.querySelector(`.movie-card[data-id="${movie.id}"]`);
      if (card) {
        card.style.transition = 'opacity .15s ease, transform .15s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.92)';
        setTimeout(() => { if (card.parentNode) card.parentNode.removeChild(card); _renderWatchedGrid(); }, 320);
      }
    }
  } else {
    // ── Mark as watched: slide pill left, reveal rating ──
    ratings[movie.id] = 3;
    localStorage.setItem('user_movie_ratings', JSON.stringify(ratings));
    const ts = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
    if (!ts[movie.id]) ts[movie.id] = Date.now();
    localStorage.setItem('user_watched_timestamps', JSON.stringify(ts));
    highlightStars(3);

    // Remove from watchlist if present, remember to restore later
    const movieInWatchlist = state.watchlist.find(x => String(x.id) === String(movie.id));
    if (movieInWatchlist) {
      state.watchlist = state.watchlist.filter(x => String(x.id) !== String(movie.id));
      if (!state.watchlistToRestore.includes(String(movie.id))) {
        state.watchlistToRestore.push(String(movie.id));
      }
      saveWatchlistToStorage();
      updateWatchlistUI();
      updateWLCount();
    }

    _setWatchedState(true);
  }

  _syncWatchedBadge();
  if (state.movieLensData.loaded) {
    initializeRecommender();
  }
};

window.markMovieAsWatched = function(movie) {
  if (!movie) return;
  const ratings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
  ratings[movie.id] = 3;
  localStorage.setItem('user_movie_ratings', JSON.stringify(ratings));

  const ts = JSON.parse(localStorage.getItem('user_watched_timestamps') || '{}');
  if (!ts[movie.id]) ts[movie.id] = Date.now();
  localStorage.setItem('user_watched_timestamps', JSON.stringify(ts));

  // Remove from watchlist if present
  state.watchlist = state.watchlist.filter(x => String(x.id) !== String(movie.id));
  saveWatchlistToStorage();
  updateWatchlistUI();
  updateWLCount();
  
  _syncWatchedBadge();
  if (state.movieLensData.loaded) {
    initializeRecommender();
  }
};

/* ─── "Watchlist" pill toggle in modal ──────────────────────────────────── */
window._toggleModalWatchlist = function() {
  const movie = state.currentModalMovie;
  if (!movie) return;
  
  const alreadyIn = state.watchlist.find(x => String(x.id) === String(movie.id));
  if (alreadyIn) {
    // Remove from watchlist
    state.watchlist = state.watchlist.filter(x => String(x.id) !== String(movie.id));
  } else {
    // Add to watchlist
    addToWatchlist(movie, null);
  }
  saveWatchlistToStorage();
  updateWatchlistUI();
  updateWLCount();
  _updateModalWatchlistPill();
};

/* ─── Helper: sync watchlist pill in modal ───────────────────────────────── */
function _updateModalWatchlistPill() {
  const movie = state.currentModalMovie;
  const watchlistPill = document.getElementById('m-watchlist-pill');
  const watchlistLabel = watchlistPill ? watchlistPill.querySelector('.urb-watchlist-label') : null;
  
  if (!watchlistPill || !movie) return;
  
  const inWatchlist = state.watchlist.find(x => String(x.id) === String(movie.id));
  if (inWatchlist) {
    watchlistPill.classList.add('added');
    if (watchlistLabel) watchlistLabel.textContent = 'In Watchlist';
  } else {
    watchlistPill.classList.remove('added');
    if (watchlistLabel) watchlistLabel.textContent = 'Add to Watchlist';
  }
}

export function showHomePage() {
  // Hide the landing page
  document.body.classList.remove('show-landing-page');
  if (typeof window.closeSearchPanel === 'function') window.closeSearchPanel();
  
  clearSearch(true);
  stopHeroRotation();
  updateNavbarActiveLink('hero');
  closeModal(true);
  // Refresh the hero banner every time we navigate home
  initHero().then(() => startHeroRotation());
  
  const homeElements = [
    document.getElementById('hero'),
    // homepage-search-container removed — search is now in tiktok-nav panel
    // Exclude #search-section — it is controlled solely by search/genre logic
    ...Array.from(document.querySelectorAll('main > section:not(#watchlist-section):not(#search-section):not(#watched-section)'))
  ].filter(Boolean);

  // Always keep search-section hidden when showing home
  const searchSec = document.getElementById('search-section');
  if (searchSec) searchSec.style.removeProperty('display');

  // Hide the watched section when going home
  const watchedSection = document.getElementById('watched-section');
  if (watchedSection) watchedSection.style.setProperty('display', 'none', 'important');

  const watchlistSection = document.getElementById('watchlist-section');
  if (!watchlistSection) return;

  document.body.classList.remove('watchlist-active');

  gsap.killTweensOf(homeElements);
  gsap.killTweensOf(watchlistSection);

  const isWatchlistVisible = !watchlistSection.classList.contains('hidden') && parseFloat(gsap.getProperty(watchlistSection, "opacity")) > 0;

  if (isWatchlistVisible) {
    gsap.to(watchlistSection, {
      opacity: 0,
      y: 15,
      scale: 0.98,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete: () => {
        watchlistSection.style.setProperty('display', 'none', 'important');
        
        homeElements.forEach(el => {
          el.style.removeProperty('display');
          el.style.opacity = 0;
        });
        
        gsap.fromTo(homeElements,
          { opacity: 0, y: -15, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
        );
      }
    });
  } else {
    watchlistSection.style.setProperty('display', 'none', 'important');
    homeElements.forEach(el => el.style.removeProperty('display'));
    gsap.fromTo(homeElements,
      { opacity: 0, y: -15, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  }
}

export function updateNavbarActiveLink(activeId) {
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href').substring(1);
    link.classList.toggle('active', href === activeId);
  });
}

/* ─── LANDING PAGE: AUTHENTICATION & PROFILE ─── */

import { saveAuthState } from './state.js?v=33';

// Helper function to hash password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper function to get users from localStorage
function getUsers() {
  const usersStr = localStorage.getItem('atlass_users');
  return usersStr ? JSON.parse(usersStr) : {};
}

// Helper function to get usernames mapping from localStorage
function getUsernames() {
  const usernamesStr = localStorage.getItem('atlass_usernames');
  return usernamesStr ? JSON.parse(usernamesStr) : {};
}

// Helper function to show/hide errors
function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function clearAuthError() {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.classList.add('hidden');
  }
}

window.switchLoginTab = function(tab) {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const submitBtn = document.getElementById('auth-submit-btn');
  const emailLabel = document.getElementById('auth-email-label');
  const emailInput = document.getElementById('auth-email');
  const usernameGroup = document.getElementById('auth-username-group');
  const usernameInput = document.getElementById('auth-username');
  clearAuthError();

  const formEl = document.getElementById('login-form');
  if (formEl) {
    formEl.classList.remove('auth-slide-left', 'auth-slide-right');
    void formEl.offsetWidth; // Trigger DOM reflow to restart animation
    if (tab === 'login') {
      formEl.classList.add('auth-slide-right');
    } else {
      formEl.classList.add('auth-slide-left');
    }
  }

  if (tab === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    submitBtn.textContent = 'Log In';
    emailLabel.textContent = 'Email or Username';
    emailInput.placeholder = 'name@example.com or username';
    emailInput.type = 'text';
    usernameGroup.classList.add('hidden');
    usernameInput.removeAttribute('required');
    emailInput.value = '';
    usernameInput.value = '';
    document.getElementById('auth-password').value = '';
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    submitBtn.textContent = 'Sign Up';
    emailLabel.textContent = 'Email';
    emailInput.placeholder = 'name@example.com';
    emailInput.type = 'email';
    usernameGroup.classList.remove('hidden');
    usernameInput.setAttribute('required', 'required');
    emailInput.value = '';
    usernameInput.value = '';
    document.getElementById('auth-password').value = '';
  }
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  clearAuthError();
  
  const emailOrUsernameInput = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const isLogin = document.getElementById('tab-login').classList.contains('active');
  
  const users = getUsers();
  const usernames = getUsernames();
  const hashedPassword = await hashPassword(password);
  
  if (isLogin) {
    // Log In flow
    let email;
    
    // Detect if input is email or username
    if (emailOrUsernameInput.includes('@')) {
      email = emailOrUsernameInput;
    } else {
      // Look up email from username
      email = usernames[emailOrUsernameInput];
      if (!email) {
        showAuthError('No account found. Please sign up.');
        return;
      }
    }
    
    if (!users[email]) {
      showAuthError('No account found. Please sign up.');
      return;
    }
    
    if (users[email].password !== hashedPassword) {
      showAuthError('Incorrect password.');
      return;
    }
    
    // Success - log in
    state.isLoggedIn = true;
    state.userEmail  = email;
    state.user = { name: users[email].name, role: 'Member' };
    loadUserData(email);   // restore this user's watchlist, watch history, and onboarding state
  } else {
    // Sign Up flow
    const email = emailOrUsernameInput;
    const username = document.getElementById('auth-username').value.trim();

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      showAuthError('Please enter a valid email address.');
      return;
    }

    // Enforce minimum password length on signup
    if (password.length < 8) {
      showAuthError('Password must be at least 8 characters.');
      return;
    }
    
    if (!username) {
      showAuthError('Username is required.');
      return;
    }
    
    if (users[email]) {
      showAuthError('Account already exists. Please log in.');
      return;
    }
    
    if (usernames[username]) {
      showAuthError('Username already taken.');
      return;
    }
    
    // Create new user
    users[email] = { name: username, email, password: hashedPassword };
    usernames[username] = email;
    
    localStorage.setItem('atlass_users', JSON.stringify(users));
    localStorage.setItem('atlass_usernames', JSON.stringify(usernames));
    
    // Log them in immediately
    state.isLoggedIn = true;
    state.userEmail  = email;
    state.user = { name: username, role: 'Member' };
    // no loadUserData — brand-new account, nothing stored yet
  }
  
  // Common login steps
  saveAuthState();
  document.body.classList.remove('not-logged-in');
  updateProfileUI();
  updateWatchlistUI();
  // Redirect to home page after login
  window.location.hash = '#home';
};

window.continueAsGuest = function() {
  state.isLoggedIn = true;
  state.user = { name: 'Guest', role: 'Limited Access' };
  saveAuthState();
  document.body.classList.remove('not-logged-in');
  updateProfileUI();
  updateWatchlistUI();
  // Redirect to home page after guest login
  window.location.hash = '#home';
};

window.logout = function() {
  // 1. Archive everything into the user's blob BEFORE clearing
  if (state.userEmail) {
    saveUserData(state.userEmail);
  }

  // 2. Clear in-memory state
  state.isLoggedIn         = false;
  state.user               = null;
  state.userEmail          = null;
  state.watchlist          = [];
  state.watchlistToRestore = [];
  saveAuthState();

  // 3. Clear global runtime keys so they don't bleed into the next account
  //    (the data is safe inside the user's blob saved in step 1)
  localStorage.removeItem('swipe_onboarding_completed');
  localStorage.removeItem('onboarding_genres');
  localStorage.removeItem('onboarding_languages');
  localStorage.removeItem('onboarding_talents');
  localStorage.removeItem('onboarding_likes');
  localStorage.removeItem('onboarding_dislikes');
  localStorage.removeItem('onboarding_excluded_genres');
  localStorage.removeItem('user_watchlist');
  localStorage.removeItem('user_watchlist_to_restore');
  localStorage.removeItem('user_movie_ratings');
  localStorage.removeItem('user_watched_timestamps');

  document.body.classList.add('not-logged-in');
  document.getElementById('profile-dropdown').classList.remove('show');
  showLandingPage();
};

export function initProfileDropdown() {
  const avatarBtn = document.getElementById('avatar-btn');
  const dropdown = document.getElementById('profile-dropdown');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
        dropdown.classList.remove('show');
      }
    });
  }

  updateProfileUI();
}

function updateProfileUI() {
  const nameEl = document.getElementById('pd-display-name');
  const roleEl = document.getElementById('pd-display-role');
  if (nameEl && roleEl && state.user) {
    nameEl.textContent = state.user.name;
    roleEl.textContent = state.user.role;
  }
}

/* ─── GRID MOTION FOR LANDING BACKGROUND ─── */

export async function initGridMotion() {
  const bgContainer = document.getElementById('grid-motion-bg');
  if (!bgContainer) return;

  // Clear existing
  bgContainer.innerHTML = '';
  bgContainer.className = 'intro';

  let topItems = [];

  // Try to fetch from TMDB first
  if (TMDB_API_KEY) {
    try {
      const [resMovies, resSeries] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${TMDB_API_KEY}`)
      ]);
      const dataMovies = await resMovies.json();
      const dataSeries = await resSeries.json();
      
      const movies = (dataMovies.results || []).map(m => ({ poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null }));
      const series = (dataSeries.results || []).map(s => ({ poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null }));
      
      topItems = [...movies.slice(0, 14), ...series.slice(0, 14)];
    } catch(e) {
      console.warn("Failed to fetch TMDB for landing grid, falling back to local data.", e);
    }
  }

  // Fallback if TMDB failed or no key
  if (topItems.length === 0) {
    const allSeries = PLATFORMS_DATA.flatMap(p => p.series || []);
    const sortedMovies = [...MOVIES].sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
    const sortedSeries = [...allSeries].sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
    topItems = [...sortedMovies.slice(0, 14), ...sortedSeries.slice(0, 14)];
  }

  // Shuffle them randomly for the grid
  topItems.sort(() => Math.random() - 0.5);
  
  const posters = topItems.map(item => item.poster).filter(p => !!p);
  
  // Fill any gaps if we have fewer than 28 posters
  while(posters.length > 0 && posters.length < 28) {
    posters.push(...topItems.map(item => item.poster).slice(0, 28 - posters.length));
  }

  const items = posters.slice(0, 28);
  if (items.length < 28) return; // safeguard
  
  // Create 4 rows
  const gridInner = document.createElement('div');
  gridInner.className = 'gridMotion-container';
  gridInner.style.zIndex = '1';

  let posterIdx = 0;
  for (let r = 0; r < 4; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    // Make the row hold 14 items instead of 7
    row.style.gridTemplateColumns = 'repeat(14, 1fr)';
    // Double the width to fit the duplicated items
    row.style.width = '200%';
    
    // Create the first 7 items
    const rowItems = [];
    for (let c = 0; c < 7; c++) {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'row__item';
      
      const itemInner = document.createElement('div');
      itemInner.className = 'row__item-inner';
      
      const img = document.createElement('div');
      img.className = 'row__item-img';
      img.style.backgroundImage = `url(${items[posterIdx % items.length]})`;
      
      itemInner.appendChild(img);
      itemWrapper.appendChild(itemInner);
      rowItems.push(itemWrapper);
      posterIdx++;
    }
    
    // Append the 7 items, then clone them to create a seamless duplicate for infinite scrolling
    rowItems.forEach(item => row.appendChild(item));
    rowItems.forEach(item => row.appendChild(item.cloneNode(true)));

    gridInner.appendChild(row);
  }

  bgContainer.appendChild(gridInner);

  // Smooth, continuous, one-direction animation (infinite marquee)
  const rows = gridInner.querySelectorAll('.row');
  rows.forEach((row, i) => {
    // Noticeable speed variations for a strong parallax effect
    const duration = 25 + i * 12; 
    gsap.to(row, {
      xPercent: -50,
      duration: duration,
      ease: "none",
      repeat: -1
    });
  });
}

/* ─── GENRE POPOVER CONTROLLER & FETCHING ─── */
const GENRES = [
  { id: 28, name: "Action", icon: "fa-solid fa-gun" },
  { id: 35, name: "Comedy", icon: "fa-solid fa-face-laugh-beam" },
  { id: 878, name: "Sci-Fi", icon: "fa-solid fa-user-astronaut" },
  { id: 27, name: "Horror", icon: "fa-solid fa-ghost" },
  { id: 18, name: "Drama", icon: "fa-solid fa-masks-theater" },
  { id: 53, name: "Thriller", icon: "fa-solid fa-skull-crossbones" },
  { id: 10749, name: "Romance", icon: "fa-solid fa-heart" },
  { id: 9648, name: "Mystery", icon: "fa-solid fa-user-secret" },
  { id: 12, name: "Adventure", icon: "fa-solid fa-compass" },
  { id: 14, name: "Fantasy", icon: "fa-solid fa-wand-magic-sparkles" },
  { id: 16, name: "Animation", icon: "fa-solid fa-cat" },
  { id: 80, name: "Crime", icon: "fa-solid fa-handcuffs" }
];

export function toggleGenrePopover() {
  const popover = document.getElementById('genre-popover');
  if (!popover) return;
  if (popover.classList.contains('on')) {
    closeGenrePopover();
  } else {
    openGenrePopover();
  }
}

export function openGenrePopover() {
  const popover = document.getElementById('genre-popover');
  if (!popover) return;
  popover.classList.add('on');
  
  // Highlight dock Genre button as active and remove other active links
  document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => el.classList.remove('active'));
  const dockBtn = document.getElementById('dock-genre-btn');
  if (dockBtn) {
    dockBtn.classList.add('active');
  }
}

export function closeGenrePopover() {
  const popover = document.getElementById('genre-popover');
  if (!popover) return;
  popover.classList.remove('on');
  
  const genreBtn = document.getElementById('dock-genre-btn');
  
  if (state.isShowingGenre) {
    document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => el.classList.remove('active'));
    if (genreBtn) {
      genreBtn.classList.add('active');
    }
  } else {
    if (genreBtn) {
      genreBtn.classList.remove('active');
    }
    const currentTab = (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') ? 'watchlist-section' : 'hero';
    const activeEl = document.querySelector(`.tiktok-nav .tt-item[data-tab="${currentTab}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
    }
  }
}

export function showGenreMovies(genreId, genreName) {
  closeGenrePopover();

  // If currently on watchlist page, redirect to home page first, then show genre movies
  if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
    window.location.hash = '';
    setTimeout(() => {
      showGenreMovies(genreId, genreName);
    }, 350);
    return;
  }

  const searchSec   = document.getElementById('search-section');
  const gridWrap    = document.getElementById('genre-grid-wrap');
  const rowWrap     = document.getElementById('search-row-wrap');
  const grid        = document.getElementById('genre-results-grid');
  const lmWrap      = document.getElementById('genre-load-more-wrap');
  const lmBtn       = document.getElementById('genre-load-more-btn');
  const countEl     = document.getElementById('search-count');
  const titleEl     = searchSec ? searchSec.querySelector('#search-section-title') : null;
  const subEl       = document.getElementById('search-sub');

  if (!searchSec || !grid) return;

  state.isShowingGenre = true;
  document.body.classList.add('search-active');

  // Switch to grid mode
  if (gridWrap) gridWrap.classList.remove('hidden');
  if (rowWrap)  rowWrap.classList.add('hidden');

  // Highlight dock Genre button
  const genreBtn = document.getElementById('dock-genre-btn');
  if (genreBtn) {
    document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => el.classList.remove('active'));
    genreBtn.classList.add('active');
  }

  // Update header
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-tags" style="color:var(--y);font-size:15px"></i> ${genreName} <span class="sec-tag tag-violet" id="search-count">Loading...</span>`;
  }
  if (subEl) subEl.textContent = `Top rated and popular titles in ${genreName}`;

  grid.innerHTML = '';
  if (lmWrap) lmWrap.classList.add('hidden');
  searchSec.style.removeProperty('display');
  searchSec.classList.remove('hidden');

  // Show loading skeletons immediately so there's no black screen while TMDB fetches
  const SKELETON_COUNT = 20;
  for (let s = 0; s < SKELETON_COUNT; s++) {
    const sk = document.createElement('div');
    sk.className = 'movie-card genre-skeleton';
    sk.innerHTML = `<div class="card-thumb genre-skeleton-thumb"></div>`;
    grid.appendChild(sk);
  }

  // ── Pagination state ──────────────────────────────────────────────────────
  const GENRE_INITIAL_SIZE = 72; // first load  — ~9 rows at 8 columns (matches search)
  const GENRE_MORE_SIZE    = 48; // each Load More — ~6 rows at 8 columns (matches search)
  let allItems    = [];     // full deduplicated pool (by TMDb id / MovieLens id)
  let rendered    = 0;      // cursor into allItems — how far we've sliced
  let tmdbPage    = 1;      // next TMDb page to fetch (online mode)
  let fetching    = false;
  const renderedIds = new Set(); // absolute guard: tracks every card id put into the DOM

  /**
   * Append exactly `count` cards from the allItems buffer.
   * Matches the flat-count approach used by the search section.
   * @param {number} count  Number of cards to add.
   */
  function renderBatch(count) {
    let added = 0;
    while (added < count && rendered < allItems.length) {
      const item   = allItems[rendered];
      rendered++;
      const cardId = typeof item === 'number' ? String(item) : String(item.id);
      // Skip duplicates but do NOT count them against the batch — keep looping
      if (renderedIds.has(cardId)) continue;
      renderedIds.add(cardId);

      const card = buildCard(
        typeof item === 'number' ? item : item.id,
        typeof item === 'object' ? item : null
      );
      card.classList.add('entering');
      card.style.animationDelay = `${(added % 16) * 30}ms`;
      grid.appendChild(card);
      added++; // only incremented for real, newly-added cards
    }

    updateLoadMore();
  }

  function updateLoadMore() {
    const countTag = document.getElementById('search-count');
    if (countTag) countTag.textContent = `${rendered} of ${allItems.length}+`;
    if (!lmWrap || !lmBtn) return;
    // Show Load More if there are more items buffered OR more TMDb pages
    const hasMore = (allItems.length > rendered) || (TMDB_API_KEY && typeof tmdbPage !== 'undefined' && tmdbPage <= 500);
    if (hasMore) {
      lmWrap.classList.remove('hidden');
      lmWrap.style.display = 'block';
    } else {
      lmWrap.classList.add('hidden');
      lmWrap.style.display = 'none';
    }
    lmBtn.disabled = fetching;
    lmBtn.innerHTML = fetching
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Loading…'
      : '<i class="fa-solid fa-circle-plus"></i> Load More';
  }

  // ── Online (TMDb) path ────────────────────────────────────────────────────
  if (TMDB_API_KEY) {
    const seen = new Set();

    async function fetchTMDBPage(page) {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`
      );
      const data = await res.json();
      return data.results || [];
    }

    async function loadMoreTMDB(renderAfter = true) {
      if (fetching) return;
      fetching = true;
      updateLoadMore();
      try {
        // Fetch 3 pages at a time to ensure a full Load More batch is always available
        const [r1, r2, r3] = await Promise.all([
          fetchTMDBPage(tmdbPage),
          fetchTMDBPage(tmdbPage + 1),
          fetchTMDBPage(tmdbPage + 2)
        ]);
        tmdbPage += 3;
        const combined = [...r1, ...r2, ...r3];
        combined.forEach(item => {
          if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
        });
      } catch (e) {
        console.warn('TMDb genre fetch error', e);
      }
      fetching = false;
      if (renderAfter) {
        renderBatch(rendered === 0 ? GENRE_INITIAL_SIZE : GENRE_MORE_SIZE);
      } else {
        updateLoadMore(); // just refresh button state after silent pre-fetch
      }
    }

    // Wire Load More button — fetch more if buffer is thin, then render a full batch
    if (lmBtn) {
      lmBtn.onclick = () => {
        const remaining = allItems.length - rendered;
        if (remaining >= GENRE_MORE_SIZE) {
          // Buffer has a full batch ready — render immediately
          renderBatch(GENRE_MORE_SIZE);
          // If buffer is getting thin after rendering, pre-fetch silently in background
          if (allItems.length - rendered < GENRE_MORE_SIZE * 2) loadMoreTMDB(false);
        } else {
          // Buffer is thin — fetch more first, then render a full batch
          loadMoreTMDB(true);
        }
      };
    }

    // Initial load — fetch pages 1–6 upfront so the buffer stays healthy after first render
    (async () => {
      fetching = true;
      try {
        const pages = await Promise.all([1,2,3,4,5,6].map(p => fetchTMDBPage(p)));
        tmdbPage = 7;
        pages.flat().forEach(item => {
          if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
        });
      } catch(e) { console.warn('TMDb initial genre fetch error', e); }
      fetching = false;
      // Clear skeletons before rendering real cards
      grid.querySelectorAll('.genre-skeleton').forEach(el => el.remove());
      renderBatch(GENRE_INITIAL_SIZE);
    })();

  } else {
    // ── Offline (MovieLens / fallback) path ──────────────────────────────────
    buildGenrePoolOffline(genreName, (pool) => {
      allItems = pool;
      const countTag = document.getElementById('search-count');
      if (countTag) countTag.textContent = `${pool.length} found`;

      // Clear skeletons before rendering real cards
      grid.querySelectorAll('.genre-skeleton').forEach(el => el.remove());

      if (pool.length === 0) {
        grid.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;">No movies found in this genre.</div>';
        if (lmWrap) lmWrap.classList.add('hidden');
        return;
      }

      renderBatch(GENRE_INITIAL_SIZE);

      if (lmBtn) {
        lmBtn.onclick = () => renderBatch(GENRE_MORE_SIZE);
      }
    });
  }

  // Scroll to search section
  setTimeout(() => searchSec.scrollIntoView({ behavior: 'smooth' }), 100);
}

function buildGenrePoolOffline(genreName, callback) {
  const seenIds = new Set(); // deduplicate pool before handing it back

  if (state.movieLensData.loaded) {
    const matched = Object.values(state.movieLensData.movies).filter(m =>
      m.genres && m.genres.toLowerCase().includes(genreName.toLowerCase())
    );
    const scored = matched.map(m => {
      const ratings = state.movieLensData.movieRatings[m.movieId] || {};
      const count = Object.keys(ratings).length;
      const avg = count > 0
        ? Object.values(ratings).reduce((a, b) => a + b, 0) / count
        : 0;
      const score = (count * avg + 5 * 3.5) / (count + 5);
      return { id: m.movieId, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const pool = [];
    scored.forEach(s => {
      if (!seenIds.has(s.id)) { seenIds.add(s.id); pool.push(s.id); }
    });
    callback(pool);
  } else {
    const matched = MOVIES.filter(m =>
      m.genre && m.genre.toLowerCase().includes(genreName.toLowerCase())
    );
    matched.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    const pool = [];
    matched.forEach(m => {
      if (!seenIds.has(m.id)) { seenIds.add(m.id); pool.push(m.id); }
    });
    callback(pool);
  }
}

export function initGenrePopover() {
  // Sync the "Watched" nav badge count on startup
  _syncWatchedBadge();

  const container = document.getElementById('gp-pills-container');
  if (container) {
    container.innerHTML = GENRES.map(g => `
      <button class="gp-pill" data-id="${g.id}" data-name="${g.name}">
        <i class="${g.icon}"></i>
        <span>${g.name}</span>
      </button>
    `).join('');

    // Bind click events on pills
    container.querySelectorAll('.gp-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const id = pill.dataset.id;
        const name = pill.dataset.name;
        showGenreMovies(id, name);
      });
    });
  }

  // Bind click on bottom nav Genre button
  const dockBtn = document.getElementById('dock-genre-btn');
  if (dockBtn) {
    dockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleGenrePopover();
    });
  }

  // Bind click on close button
  const closeBtn = document.getElementById('gp-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      closeGenrePopover();
    });
  }

  // Bind outside click to close popover
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('genre-popover');
    if (popover && popover.classList.contains('on')) {
      const isClickInside = popover.contains(e.target);
      const isClickDockBtn = document.getElementById('dock-genre-btn')?.contains(e.target);
      if (!isClickInside && !isClickDockBtn) {
        closeGenrePopover();
      }
    }
  });

  // Stop propagation on popover click removed
  const popover = document.getElementById('genre-popover');
  if (popover) {
    popover.addEventListener('click', (e) => {
      // Allow bubbling so global handlers (like closeSearchPanel) can fire
    });
  }

  // Bind escape key to close popover
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeGenrePopover();
    }
  });
}

// Bind to window for compatibility
window.initGenrePopover = initGenrePopover;
window.toggleGenrePopover = toggleGenrePopover;
window.closeGenrePopover = closeGenrePopover;
window.openGenrePopover = openGenrePopover;
window.showGenreMovies = showGenreMovies;

/* ─── DYNAMIC ACCENT POSTER GLOWS ─── */
export function getGlowColor(genreString) {
  const g = (genreString || "").toLowerCase();
  
  if (g.includes('sci-fi') || g.includes('science fiction') || g.includes('fantasy')) {
    return {
      color: 'rgba(139, 92, 246, 0.45)', // Violet
      border: 'rgba(139, 92, 246, 0.65)'
    };
  }
  if (g.includes('action') || g.includes('adventure') || g.includes('thriller')) {
    return {
      color: 'rgba(6, 182, 212, 0.45)', // Cyan / Teal
      border: 'rgba(6, 182, 212, 0.65)'
    };
  }
  if (g.includes('romance') || g.includes('musical') || g.includes('family')) {
    return {
      color: 'rgba(244, 63, 94, 0.45)', // Rose / Hot Pink
      border: 'rgba(244, 63, 94, 0.65)'
    };
  }
  if (g.includes('comedy') || g.includes('animation') || g.includes('music')) {
    return {
      color: 'rgba(16, 185, 129, 0.45)', // Emerald Green
      border: 'rgba(16, 185, 129, 0.65)'
    };
  }
  if (g.includes('horror') || g.includes('mystery') || g.includes('crime')) {
    return {
      color: 'rgba(239, 68, 68, 0.45)', // Crimson Red
      border: 'rgba(239, 68, 68, 0.65)'
    };
  }
  if (g.includes('drama') || g.includes('history') || g.includes('war') || g.includes('western')) {
    return {
      color: 'rgba(245, 158, 11, 0.45)', // Golden Amber
      border: 'rgba(245, 158, 11, 0.65)'
    };
  }
  
  // Default/Fallback
  return {
    color: 'rgba(124, 58, 237, 0.35)', // Classic Violet
    border: 'rgba(124, 58, 237, 0.5)'
  };
}

/* ─── INSTANT SEARCH SUGGESTIONS ─── */
let suggestionsDebounce;
export function updateSearchSuggestions(q) {
  const suggestionsDiv = document.getElementById('search-suggestions');
  if (!suggestionsDiv) return;

  if (!q) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.add('hidden');
    return;
  }

  clearTimeout(suggestionsDebounce);
  suggestionsDebounce = setTimeout(() => {
    if (TMDB_API_KEY) {
      // Fetch pages 1–5 of movies and 1-4 of TV concurrently so all keyword matches are found
      const movieFetches = [1, 2, 3, 4, 5].map(p =>
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=${p}`)
          .then(r => r.json()).catch(() => ({ results: [], total_pages: 1, total_results: 0 }))
      );
      const tvFetches = [1, 2, 3, 4].map(p =>
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=${p}`)
          .then(r => r.json()).catch(() => ({ results: [], total_pages: 1, total_results: 0 }))
      );
      const personP = fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`)
        .then(r => r.json()).catch(() => ({ results: [] }));

      Promise.all([...movieFetches, ...tvFetches, personP]).then(async (allData) => {
        const moviePages  = allData.slice(0, 5);
        const tvPages     = allData.slice(5, 9);
        const personData  = allData[9];

        // Deduplicate and merge all movie and TV results
        const movieSeen = new Set();
        const movieResults = [];
        moviePages.forEach(page => {
          (page.results || []).forEach(i => {
            if (!movieSeen.has(i.id)) { movieSeen.add(i.id); movieResults.push({ ...i, mediaType: 'movie' }); }
          });
        });

        const tvSeen = new Set();
        const tvResults = [];
        tvPages.forEach(page => {
          (page.results || []).forEach(i => {
            if (!tvSeen.has(i.id)) { tvSeen.add(i.id); tvResults.push({ ...i, mediaType: 'tv' }); }
          });
        });

        let personResults = [];
        if (personData.results && personData.results.length > 0) {
          // Fetch full credits for top 2 people — same as main search, not just known_for
          const creditsFetches = await Promise.all(
            personData.results.slice(0, 2).map(person =>
              fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}`)
                .then(r => r.json())
                .then(credits => ({ person, credits }))
                .catch(() => null)
            )
          );
          const personSeen = new Set();
          creditsFetches.forEach(res => {
            if (!res) return;
            const { person, credits } = res;
            (credits.crew || []).filter(i => i.job === 'Director' && i.poster_path).forEach(i => {
              const key = `${i.media_type||'movie'}-${i.id}`;
              if (!personSeen.has(key)) {
                personSeen.add(key);
                personResults.push({ ...i, mediaType: i.media_type||'movie', personReason: { name: person.name, role: 'Director' } });
              }
            });
            (credits.cast || []).filter(i => i.poster_path).forEach(i => {
              const key = `${i.media_type||'movie'}-${i.id}`;
              if (!personSeen.has(key)) {
                personSeen.add(key);
                personResults.push({ ...i, mediaType: i.media_type||'movie', personReason: { name: person.name, role: 'Cast' } });
              }
            });
          });
        }

        // Use the same composite ranking as the full search grid
        const sorted = _mergeAndSort(movieResults, tvResults, personResults, q);

        // Cache the full sorted result set + pagination info so Enter reuses it
        _autocompleteCache = {
          q,
          results: sorted,
          tmdbMovieTotalPages:   moviePages[0].total_pages  || 1,
          tmdbTvTotalPages:      tvPages[0].total_pages     || 1,
          tmdbMovieTotalResults: moviePages[0].total_results || 0,
          tmdbTvTotalResults:    tvPages[0].total_results    || 0,
        };

        // Show top 5 in dropdown
        renderSuggestionsList(sorted.slice(0, 5), suggestionsDiv);
      }).catch(() => {
        suggestionsDiv.classList.add('hidden');
      });
    } else {
      // Offline mode suggestions
      let matches = [];
      if (state.movieLensData.loaded) {
        // Get ALL matches, sort them, cache all, show top 5
        const allMatches = Object.values(state.movieLensData.movies)
          .filter(m => m.title.toLowerCase().includes(q));
        
        // Sort by relevance
        allMatches.sort((a, b) => {
          const aTitle = a.title.toLowerCase().replace(/\s\(\d{4}\)$/,'');
          const bTitle = b.title.toLowerCase().replace(/\s\(\d{4}\)$/,'');
          const aExact = aTitle === q ? 2 : aTitle.startsWith(q) ? 1 : 0;
          const bExact = bTitle === q ? 2 : bTitle.startsWith(q) ? 1 : 0;
          if (bExact !== aExact) return bExact - aExact;
          
          const ratings = state.movieLensData.movieRatings || {};
          const aRatings = ratings[a.movieId] || {};
          const bRatings = ratings[b.movieId] || {};
          const aCount = Object.keys(aRatings).length;
          const bCount = Object.keys(bRatings).length;
          const aAvg = aCount > 0 ? Object.values(aRatings).reduce((sum,v)=>sum+v,0)/aCount : 0;
          const bAvg = bCount > 0 ? Object.values(bRatings).reduce((sum,v)=>sum+v,0)/bCount : 0;
          const aScore = (aCount * aAvg + 5 * 3.5) / (aCount + 5);
          const bScore = (bCount * bAvg + 5 * 3.5) / (bCount + 5);
          return bScore - aScore;
        });
        
        matches = allMatches; // Keep all for cache
      } else {
        const matchedMovies = MOVIES.filter(m => {
          const titleMatch = m.title.toLowerCase().includes(q);
          const castMatch = m.cast && m.cast.some(c => c.name.toLowerCase().includes(q));
          const directorMatch = m.director && m.director.some(d => d.name.toLowerCase().includes(q));
          return titleMatch || castMatch || directorMatch;
        });

        matches = matchedMovies.map(m => {
          const item = { ...m };
          const matchingCast = m.cast && m.cast.find(c => c.name.toLowerCase().includes(q));
          const matchingDirector = m.director && m.director.find(d => d.name.toLowerCase().includes(q));
          if (matchingDirector) {
            item.personReason = { name: matchingDirector.name, role: 'Director' };
          } else if (matchingCast) {
            item.personReason = { name: matchingCast.name, role: 'Cast' };
          }
          return item;
        });
        
        // Sort by relevance
        matches.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aExact = aTitle === q ? 2 : aTitle.startsWith(q) ? 1 : 0;
          const bExact = bTitle === q ? 2 : bTitle.startsWith(q) ? 1 : 0;
          if (bExact !== aExact) return bExact - aExact;
          return parseFloat(b.rating||0) - parseFloat(a.rating||0);
        });
      }

      // Cache ALL results, show top 5 in dropdown
      _autocompleteCache = { q, results: matches };
      renderSuggestionsList(matches.slice(0, 5), suggestionsDiv);
    }
  }, 150);
}

function renderSuggestionsList(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div style="padding: 12px 16px; font-size: 13px; color: var(--t3)">No suggestions found</div>';
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    let title = '';
    let year = '';
    let poster = '';
    let match = 85;
    let cardId = null;

    const isTMDB = !!item.release_date || !!item.first_air_date || (TMDB_API_KEY && !item.movieId);

    if (isTMDB) {
      title = item.title || item.name || '';
      year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
      poster = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=80&q=120';
      match = item.match ? item.match : Math.floor(Math.random() * 15) + 85;
      const mediaType = item.mediaType || item.media_type || 'movie';
      cardId = `tmdb-${mediaType}-${item.id}`;
      if (state.movieLensData.loaded) {
        const mlMovie = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
        if (mlMovie) {
          cardId = mlMovie.movieId;
        }
      }
    } else {
      title = item.title ? item.title.replace(/\s\(\d{4}\)$/, '') : item.title;
      year = item.title ? item.title.match(/\((\d{4})\)$/)?.[1] || item.year || 'N/A' : item.year || 'N/A';
      poster = item.poster || 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=80&q=120';
      cardId = item.movieId || item.id;
      match = calculateMatchScore(cardId);
    }

    let suggestionMetaStr = year;
    if (item.personReason) {
      const rolePrefix = item.personReason.role === 'Director' ? 'Dir: ' : '';
      suggestionMetaStr = `${year} · ${rolePrefix}${item.personReason.name}`;
    }

    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `
      <img class="suggestion-thumb" src="${poster}" alt="${title}"/>
      <div class="suggestion-info">
        <span class="suggestion-title">${title}</span>
        <span class="suggestion-meta">${suggestionMetaStr}</span>
      </div>
      <span class="suggestion-match">${match}% Match</span>
    `;

    div.addEventListener('click', (e) => {
      e.stopPropagation();
      // Commit: close dropdown, keep query in input, open modal
      _searchCommitted = true;
      closeSuggestionsDropdown();
      fetchTMDBDetails(cardId).then(details => {
        if (details) {
          if (item.personReason) details.personReason = item.personReason;
          openModal(details);
        }
      });
    });

    container.appendChild(div);
  });
  container.classList.remove('hidden');
}

/* ─── SURPRISE ME CANVAS SPARKLES ─── */
export function launchSurpriseSparkles(x, y) {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  };
  resize();

  const particles = [];
  const colors = ['#fbbf24', '#c4c0e8', '#8b5cf6', '#06b6d4', '#ec4899'];

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 20;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (5 + Math.random() * 5),
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.04 + Math.random() * 0.03,
      gravity: 0.4,
      isStar: Math.random() > 0.6
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      if (p.alpha <= 0) return;
      active = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      // Draw bright core (circle or star shine cross)
      ctx.globalAlpha = p.alpha;
      if (p.isStar) {
        ctx.beginPath();
        ctx.moveTo(p.x - p.size * 1.5, p.y);
        ctx.lineTo(p.x + p.size * 1.5, p.y);
        ctx.moveTo(p.x, p.y - p.size * 1.5);
        ctx.lineTo(p.x, p.y + p.size * 1.5);
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    if (active) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(animate);
}

/* ─── TASTE TUNER DYNAMICS ─── */
export function applyMatchScoreTasteBoost(movieObj) {
  if (!movieObj || !movieObj.genre) return;
  
  const weightsStr = localStorage.getItem('taste_weights') || '{}';
  let weights = { Action: 50, SciFi: 50, Romance: 50, Comedy: 50, Horror: 50 };
  try {
    weights = { ...weights, ...JSON.parse(weightsStr) };
  } catch(e) {}

  const movieGenres = movieObj.genre.toLowerCase();
  let totalDelta = 0;
  let genreCount = 0;

  if (movieGenres.includes('action') || movieGenres.includes('adventure')) {
    totalDelta += (weights.Action - 50) / 5;
    genreCount++;
  }
  if (movieGenres.includes('sci-fi') || movieGenres.includes('science fiction') || movieGenres.includes('fantasy')) {
    totalDelta += (weights.SciFi - 50) / 5;
    genreCount++;
  }
  if (movieGenres.includes('romance') || movieGenres.includes('drama')) {
    totalDelta += (weights.Romance - 50) / 5;
    genreCount++;
  }
  if (movieGenres.includes('comedy') || movieGenres.includes('animation') || movieGenres.includes('family')) {
    totalDelta += (weights.Comedy - 50) / 5;
    genreCount++;
  }
  if (movieGenres.includes('horror') || movieGenres.includes('mystery') || movieGenres.includes('crime') || movieGenres.includes('thriller')) {
    totalDelta += (weights.Horror - 50) / 5;
    genreCount++;
  }

  if (genreCount > 0) {
    const avgDelta = totalDelta / genreCount;
    movieObj.match = Math.min(99, Math.max(40, Math.round((movieObj.match || 85) + avgDelta)));
  }
}

window.updateTastePreference = function(category, value) {
  const label = document.getElementById(`val-${category}`);
  if (label) label.textContent = `${value}%`;

  const weightsStr = localStorage.getItem('taste_weights') || '{}';
  let weights = {};
  try { weights = JSON.parse(weightsStr); } catch(e) {}
  weights[category] = parseInt(value);
  localStorage.setItem('taste_weights', JSON.stringify(weights));

  liveUpdateAllCardScores();
};

export function liveUpdateAllCardScores() {
  document.querySelectorAll('.movie-card').forEach(card => {
    const movieId = card.dataset.id;
    if (!movieId) return;

    let details = state.tmdbCache[movieId];
    if (!details) {
      if (state.movieLensData.loaded && state.movieLensData.movies[movieId]) {
        const mlMovie = state.movieLensData.movies[movieId];
        details = {
          id: movieId,
          genre: mlMovie.genres.replace(/\|/g, ' · '),
          match: calculateMatchScore(movieId)
        };
      } else {
        const local = MOVIES.find(m => String(m.id) === String(movieId));
        if (local) {
          details = {
            id: movieId,
            genre: local.genre,
            match: calculateMatchScore(movieId)
          };
        }
      }
    }
    if (!details) return;

    // Preserve search-ranking match score if it was already set on the card
    const existingMatch = card.dataset.searchMatch ? parseInt(card.dataset.searchMatch) : null;
    details.match = existingMatch || calculateMatchScore(movieId);
    applyMatchScorePreferencesBoost(details);

    const badge = card.querySelector('.m-badge');
    if (badge) {
      const match = details.match;
      const starCount = match >= 90 ? 5 : (match >= 75 ? 4 : (match >= 60 ? 3 : (match >= 40 ? 2 : 1)));
      const starsStr = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
      badge.innerHTML = `<span class="m-stars-inline">${starsStr}</span> ${match}%`;
    }
  });

  const heroChip = document.querySelector('#hero .match-chip');
  if (heroChip && state.currentHeroMovie) {
    state.currentHeroMovie.match = calculateMatchScore(state.currentHeroMovie.id);
    applyMatchScorePreferencesBoost(state.currentHeroMovie);
    heroChip.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:10px"></i> ${state.currentHeroMovie.match}% Match For You`;
  }
}

window.toggleTasteTuner = function() {
  const drawer = document.getElementById('taste-tuner-drawer');
  const btn = document.getElementById('tuner-toggle-btn');
  if (!drawer) return;

  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    if (btn) {
      btn.style.background = 'var(--y)';
      btn.style.color = '#000';
      btn.style.borderColor = 'var(--y)';
    }
    
    const weightsStr = localStorage.getItem('taste_weights') || '{}';
    let weights = { Action: 50, SciFi: 50, Romance: 50, Comedy: 50, Horror: 50 };
    try { weights = { ...weights, ...JSON.parse(weightsStr) }; } catch(e) {}

    for (const [cat, val] of Object.entries(weights)) {
      const slider = document.getElementById(`tuner-${cat.toLowerCase()}`);
      const valLabel = document.getElementById(`val-${cat}`);
      if (slider) slider.value = val;
      if (valLabel) valLabel.textContent = `${val}%`;
    }
  } else {
    drawer.classList.add('hidden');
    if (btn) {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  }
};

export function triggerPersonSearch(name) {
  closeModal();

  // Clear any stale cache so the search always fetches fresh
  _autocompleteCache = { q: '', results: [] };

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = name;

  // Close the floating search bar so it doesn't block the results
  if (typeof window.closeSearchPanel === 'function') window.closeSearchPanel();

  if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
    // Coming from the watchlist page — switch to home first, then search
    // after the page transition so showHomePage doesn't nuke our results
    activeViewState = 'home';
    showHomePage();
    setTimeout(() => _runPersonSearch(name), 350);
  } else {
    // Already on home — just run the search immediately
    // Reset activeViewState so the navbar shows Search as active
    activeViewState = 'home';
    _runPersonSearch(name);
  }
}
window.triggerPersonSearch = triggerPersonSearch;

/**
 * Full person-first search: looks up the person via TMDb /search/person,
 * fetches ALL their combined credits, then renders every card as a grid
 * with a working Load More that pages through their filmography.
 */
async function _runPersonSearch(name) {
  const q            = name.trim().toLowerCase();
  const searchSec    = document.getElementById('search-section');
  const searchResults= document.getElementById('search-results');
  const countEl      = document.getElementById('search-count');
  const lmWrap       = document.getElementById('search-load-more-wrap');
  const lmBtn        = document.getElementById('search-load-more-btn');
  const gridWrap     = document.getElementById('genre-grid-wrap');
  const rowWrap      = document.getElementById('search-row-wrap');
  const quickResults = document.getElementById('search-quick-results');
  const divider      = document.getElementById('search-results-divider');
  const titleEl      = searchSec ? searchSec.querySelector('#search-section-title') : null;
  const subEl        = document.getElementById('search-sub');

  if (!searchSec || !searchResults) return;

  // Remove any !important display:none that showHomePage may have set
  searchSec.style.removeProperty('display');

  // Switch to list/search mode (not genre-grid mode)
  if (gridWrap) gridWrap.classList.add('hidden');
  if (rowWrap)  rowWrap.classList.remove('hidden');

  document.body.classList.add('search-active');
  searchSec.classList.remove('hidden');
  searchResults.innerHTML = '';
  if (quickResults) { quickResults.innerHTML = ''; quickResults.classList.add('hidden'); }
  if (divider)      divider.classList.add('hidden');
  if (lmWrap)       lmWrap.classList.add('hidden');

  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-user" style="color:var(--vl);font-size:15px"></i> ${name} <span class="sec-tag tag-violet" id="search-count">Loading…</span>`;
  }
  if (subEl) subEl.textContent = `Movies and TV shows featuring ${name}`;

  // Reset pagination state
  _searchState = {
    q,
    tmdbMoviePage: 0, tmdbTvPage: 0,
    tmdbMovieTotalPages: 1, tmdbTvTotalPages: 1,
    rendered: new Set(),
    allResults: [],
    offlineOffset: 0,
    loading: false,
  };

  if (!TMDB_API_KEY) {
    // Offline fallback — search by title substring
    const rawMatches = state.movieLensData && state.movieLensData.loaded
      ? Object.values(state.movieLensData.movies)
          .filter(m => m.title.toLowerCase().includes(q))
          .map(m => m.movieId)
      : MOVIES.filter(m => m.title.toLowerCase().includes(q)).map(m => m.id);

    if (countEl) countEl.textContent = `${rawMatches.length} found`;
    _searchState.allResults  = rawMatches;
    _searchState.offlineOffset = 0;
    _appendOfflineCards(rawMatches.slice(0, SEARCH_PAGE_SIZE), searchResults);
    _searchState.offlineOffset = SEARCH_PAGE_SIZE;
    if (lmWrap) lmWrap.style.display = rawMatches.length > SEARCH_PAGE_SIZE ? 'block' : 'none';
    if (lmBtn)  lmBtn.onclick = () => _loadMoreOfflineResults(searchResults, lmWrap, lmBtn);
    setTimeout(() => searchSec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return;
  }

  // ── TMDb path: person lookup → combined_credits ──────────────────────────
  try {
    // 1. Find the person
    const personRes = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&page=1`
    ).then(r => r.json()).catch(() => ({ results: [] }));

    let allCredits = [];

    if (personRes.results && personRes.results.length > 0) {
      // Fetch combined credits for the top 2 matching people
      const creditsResults = await Promise.all(
        personRes.results.slice(0, 2).map(person =>
          fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}`)
            .then(r => r.json())
            .then(credits => ({ person, credits }))
            .catch(() => null)
        )
      );

      const seen = new Set();
      creditsResults.forEach(res => {
        if (!res) return;
        const { person, credits } = res;
        // Director credits (crew)
        (credits.crew || [])
          .filter(i => i.job === 'Director' && i.poster_path)
          .forEach(i => {
            const key = `${i.media_type||'movie'}-${i.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              allCredits.push({ ...i, mediaType: i.media_type || 'movie', personReason: { name: person.name, role: 'Director' } });
            }
          });
        // Cast credits
        (credits.cast || []).filter(i => i.poster_path).forEach(i => {
          const key = `${i.media_type||'movie'}-${i.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            allCredits.push({ ...i, mediaType: i.media_type || 'movie', personReason: { name: person.name, role: 'Cast' } });
          }
        });
      });

      // Sort by popularity descending
      allCredits.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // Fall back to a regular movie+tv search if no person match found
    if (allCredits.length === 0) {
      const [m1, tv1] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&page=1`).then(r => r.json()).catch(() => ({ results: [], total_pages: 1, total_results: 0 })),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&page=1`).then(r => r.json()).catch(() => ({ results: [], total_pages: 1, total_results: 0 })),
      ]);
      allCredits = _mergeAndSort(
        (m1.results || []).map(i => ({ ...i, mediaType: 'movie' })),
        (tv1.results || []).map(i => ({ ...i, mediaType: 'tv' })),
        [],
        q
      );
      _searchState.tmdbMovieTotalPages = m1.total_pages || 1;
      _searchState.tmdbTvTotalPages    = tv1.total_pages || 1;
    }

    if (countEl) {
      const countTag = document.getElementById('search-count');
      if (countTag) countTag.textContent = `${allCredits.length} titles`;
    }

    if (allCredits.length === 0) {
      searchResults.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;">No results found for this person.</div>';
      setTimeout(() => searchSec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }

    // Store full list for pagination
    _searchState.allResults    = allCredits;
    _searchState.offlineOffset = 0;

    // Render first page
    const firstPage = allCredits.slice(0, SEARCH_INITIAL_SIZE);
    _appendSearchCards(firstPage, searchResults);
    _searchState.offlineOffset = SEARCH_INITIAL_SIZE;

    const hasMore = _searchState.offlineOffset < allCredits.length;
    if (lmWrap) lmWrap.style.display = hasMore ? 'block' : 'none';
    if (lmBtn) {
      lmBtn.disabled = false;
      lmBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Load More Results';
      lmBtn.onclick = () => {
        const slice = _searchState.allResults.slice(
          _searchState.offlineOffset,
          _searchState.offlineOffset + SEARCH_MORE_SIZE
        );
        _appendSearchCards(slice, searchResults);
        _searchState.offlineOffset += SEARCH_MORE_SIZE;
        const stillMore = _searchState.offlineOffset < _searchState.allResults.length;
        if (lmWrap) lmWrap.style.display = stillMore ? 'block' : 'none';
      };
    }

    setTimeout(() => {
      searchSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);

  } catch (err) {
    console.error('Person search error:', err);
    searchResults.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;">Search failed. Please try again.</div>';
  }
}

export function injectGradualBlurs(container) {
  if (!container || container.querySelector('.gradual-blur')) return;

  const positions = ['left', 'right'];
  positions.forEach(pos => {
    const blurEl = document.createElement('div');
    blurEl.className = `gradual-blur gradual-blur-${pos}`;
    blurEl.style.width = '72px';
    blurEl.style[pos] = '0';

    const innerEl = document.createElement('div');
    innerEl.className = 'gradual-blur-inner';
    blurEl.appendChild(innerEl);

    const divCount = 9;
    const strength = 3;
    const increment = 100 / divCount;
    const curveFunc = p => p * p * (3 - 2 * p); // bezier curve

    for (let i = 1; i <= divCount; i++) {
      let progress = i / divCount;
      progress = curveFunc(progress);

      // Exponential progression formula
      const blurValue = Math.pow(2, progress * 4) * 0.0625 * strength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let maskGradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) maskGradient += `, black ${p3}%`;
      if (p4 <= 100) maskGradient += `, transparent ${p4}%`;

      const direction = pos === 'left' ? 'to left' : 'to right';

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.inset = '0';
      
      const gradientVal = `linear-gradient(${direction}, ${maskGradient})`;
      div.style.maskImage = gradientVal;
      div.style.webkitMaskImage = gradientVal;
      
      const blurStr = `blur(${blurValue.toFixed(3)}rem)`;
      div.style.backdropFilter = blurStr;
      div.style.webkitBackdropFilter = blurStr;
      div.style.opacity = '0.5';

      innerEl.appendChild(div);
    }

    container.appendChild(blurEl);
  });
}

export function injectOverlayGradualBlur(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay || overlay.querySelector('.gradual-blur')) return;

  const blurEl = document.createElement('div');
  blurEl.className = 'gradual-blur gradual-blur-overlay';
  blurEl.style.position = 'absolute';
  blurEl.style.inset = '0';
  blurEl.style.width = '100%';
  blurEl.style.height = '100%';
  blurEl.style.zIndex = '1';

  const innerEl = document.createElement('div');
  innerEl.className = 'gradual-blur-inner';
  blurEl.appendChild(innerEl);

  const divCount = 9;
  const strength = 3;
  const increment = 100 / divCount;
  const curveFunc = p => p * p * (3 - 2 * p); // bezier curve

  const directions = ['to bottom', 'to top'];
  directions.forEach(direction => {
    for (let i = 1; i <= divCount; i++) {
      let progress = i / divCount;
      progress = curveFunc(progress);

      // Exponential progression formula
      const blurValue = Math.pow(2, progress * 4) * 0.0625 * strength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let maskGradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) maskGradient += `, black ${p3}%`;
      if (p4 <= 100) maskGradient += `, transparent ${p4}%`;

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.inset = '0';
      
      const gradientVal = `linear-gradient(${direction}, ${maskGradient})`;
      div.style.maskImage = gradientVal;
      div.style.webkitMaskImage = gradientVal;
      
      const blurStr = `blur(${blurValue.toFixed(3)}rem)`;
      div.style.backdropFilter = blurStr;
      div.style.webkitBackdropFilter = blurStr;
      div.style.opacity = '0.5';

      innerEl.appendChild(div);
    }
  });

  overlay.insertBefore(blurEl, overlay.firstChild);
}
