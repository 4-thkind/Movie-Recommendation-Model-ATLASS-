import { state, saveWatchlistToStorage } from './state.js';
import { TMDB_API_KEY, IS_FILE_PROTOCOL, DEFAULT_RECS } from './config.js';
import { MOVIES } from './data.js';
import { initializeRecommender, calculateMatchScore } from './recommender.js';
import { createCircularGallery } from './CircularGallery.js?v=3';

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
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,release_dates`);
    if (!res.ok) throw new Error("TMDB network error");
    const data = await res.json();
    
    let cert = 'PG-13';
    if (data.release_dates && data.release_dates.results) {
      const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates.length > 0 && usRelease.release_dates[0].certification) {
        cert = usRelease.release_dates[0].certification;
      }
    }
    
    const mapped = {
      id: movieId,
      title: type === 'tv' ? data.name : data.title,
      year: type === 'tv'
        ? (data.first_air_date ? data.first_air_date.split('-')[0] : 'N/A')
        : (data.release_date ? data.release_date.split('-')[0] : year),
      match: calculateMatchScore(isVirtual ? tmdbId : movieId),
      rating: data.vote_average ? data.vote_average.toFixed(1) : '7.0',
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

/* ─── SHARED FLOATING POPUP (NETFLIX-STYLE) ─── */
const popup = document.getElementById('card-popup');
let hideTimer = null;
let popupTimer = null;

export function schedulePopup(movie, cardEl) {
  clearTimeout(popupTimer);
  clearTimeout(hideTimer);
  popupTimer = setTimeout(() => showPopup(movie, cardEl), 280);
}

export function cancelPopup() {
  clearTimeout(popupTimer);
  hideTimer = setTimeout(() => hidePopup(), 120);
}

export function showPopup(movie, cardEl) {
  if (!popup) return;
  state.currentPopupMovie = movie;
  
  // Populate
  document.getElementById('pp-img').src = movie.backdrop || movie.poster;
  document.getElementById('pp-match').textContent = movie.match + '% Match';
  document.getElementById('pp-rating').textContent = movie.rating || '...';
  document.getElementById('pp-cert').textContent = movie.cert || 'PG-13';
  document.getElementById('pp-title').textContent = movie.title;
  
  // Genres
  const genres = (movie.genre || "").split('·').map(g => g.trim());
  document.getElementById('pp-genres').innerHTML = genres.map((g, i) =>
    i < genres.length - 1 ? `<span>${g}</span><span class="pg-dot"></span>` : `<span>${g}</span>`
  ).join('');
  
  // Add btn state
  const addBtn = document.getElementById('pp-add');
  const inList = state.watchlist.find(m => m.id === movie.id);
  addBtn.classList.toggle('added', !!inList);
  addBtn.innerHTML = inList
    ? '<i class="fa-solid fa-check" style="font-size:10px"></i>'
    : '<i class="fa-solid fa-plus" style="font-size:10px"></i>';

  // Wire buttons
  document.getElementById('pp-play').onclick = () => openModal(movie);
  document.getElementById('pp-info').onclick = () => openModal(movie);
  document.getElementById('pp-add').onclick = (e) => {
    e.stopPropagation();
    addToWatchlist(movie, e.currentTarget);
    e.currentTarget.classList.add('added');
    e.currentTarget.innerHTML = '<i class="fa-solid fa-check" style="font-size:10px"></i>';
  };

  // Position — center above or below card, clamp to viewport
  const rect = cardEl.getBoundingClientRect();
  const pw = 268, ph = 320;
  let left = rect.left + rect.width / 2 - pw / 2;
  let top  = rect.top - ph - 8;

  // Flip below if not enough room above
  if (top < 70) top = rect.bottom + 8;

  // Clamp horizontally
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));

  popup.style.left = (left + window.scrollX) + 'px';
  popup.style.top  = (top + window.scrollY) + 'px'; // Account for page scroll
  popup.classList.remove('hiding');
  popup.classList.add('visible');
}

export function hidePopup() {
  if (!popup) return;
  clearTimeout(popupTimer);
  popup.classList.add('hiding');
  setTimeout(() => {
    popup.classList.remove('visible', 'hiding');
    state.currentPopupMovie = null;
  }, 220);
}

if (popup) {
  popup.addEventListener('mouseenter', () => { clearTimeout(hideTimer); clearTimeout(popupTimer); });
  popup.addEventListener('mouseleave', () => hidePopup());
}

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
    match = initialData && initialData.match ? initialData.match : Math.floor(Math.random() * 15) + 85;
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

  wrap.innerHTML = `
    <div class="card-thumb">
      <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity:${initialData || TMDB_API_KEY ? '1' : '0.35'};transition:opacity 0.5s var(--smooth)"/>
      <div class="m-badge"><span class="m-stars-inline">${starsStr}</span> ${match}%</div>
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
    director: []
  } : null;

  const cardAddBtn = wrap.querySelector('.card-quick-add');

  wrap.addEventListener('click', (e) => {
    if (resolvedDetails) openModal(resolvedDetails);
  });
  cardAddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (resolvedDetails) toggleWatchlist(resolvedDetails);
  });

  fetchTMDBDetails(movieId).then(details => {
    if (!details) return;
    resolvedDetails = details;
    const img = wrap.querySelector('.lazy-poster');
    if (img) {
      img.src = details.poster;
      img.style.opacity = 1;
    }
    wrap.addEventListener('mouseenter', () => schedulePopup(details, wrap));
    wrap.addEventListener('mouseleave', () => cancelPopup());
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

    fetchTMDBDetails(tmdbId).then(details => {
      if (!details) return;
      resolvedDetails = details;
    });
    grid.appendChild(card);
  });
}

/* ─── RENDER ROWS ─── */
export function renderRows() {
  initializeRecommender();

  const rw2 = document.getElementById('rw2');
  if (!rw2) return;
  rw2.innerHTML = '';

  if (TMDB_API_KEY) {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.results) data.results.slice(0, 15).forEach(m => rw2.appendChild(buildCard(m.id, m)));
      });
    return;
  }

  const popularRecs = [296, 356, 318, 593, 260, 480, 110, 589];
  popularRecs.forEach(id => {
    rw2.appendChild(buildCard(id));
  });
}

function addRandomCards(el, dir, isTrend) {
  // Backwards compatibility for scrolling row expansion
}

export function scrollRow(id, dir) {
  const el = document.getElementById(id);
  if (el) {
    if (state.movieLensData.loaded) addRandomCards(el, dir, false);
    el.scrollBy({ left: dir * 540, behavior: 'smooth' });
  }
}

export function scrollTrend(dir) {
  const el = document.getElementById('trend-row');
  if (el) {
    if (state.movieLensData.loaded) addRandomCards(el, dir, true);
    el.scrollBy({ left: dir * 580, behavior: 'smooth' });
  }
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
      </div>`;
    panelsEl.appendChild(panel);

    renderPlatCards(plat.id, state.activeType);
  });
}

export function renderPlatCards(platId, type) {
  const row = document.getElementById('pr-' + platId);
  if (!row) return;
  row.innerHTML = '';

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

            if (type === 'movie') {
              fetchTMDBDetails(item.id).then(details => {
                if(!details) return;
                resolvedDetails = details;
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

    fetchTMDBDetails(m.id).then(details => {
      if (!details) return;
      resolvedDetails = details;
      card.addEventListener('mouseenter', () => schedulePopup(details, card));
      card.addEventListener('mouseleave', () => cancelPopup());
    });

    row.appendChild(card);
  });
}

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
      prompt.style.display = 'block';
      setTimeout(() => prompt.style.opacity = '1', 50);
      setTimeout(() => prompt.style.transform = 'translateY(0)', 50);
    } else {
      prompt.style.opacity = '0';
      prompt.style.transform = 'translateY(14px)';
      setTimeout(() => prompt.style.display = 'none', 450);
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
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    state.watchlist.forEach(movie => {
      const card = buildCard(movie.id, movie);
      container.appendChild(card);
    });
  }
  initPickGallery();
}

/* ─── ROULETTE LOGIC ─── */
export function openRoulette() {
  if (state.watchlist.length < 2) return;
  document.getElementById('roulette-wrap').classList.add('open');
  document.getElementById('roulette-prompt').style.display = 'none';
  buildDrum();
}

export function closeRoulette() {
  document.getElementById('roulette-wrap').classList.remove('open');
  resetWinner();
  const prompt = document.getElementById('roulette-prompt');
  if (prompt && state.watchlist.length >= 2) {
    prompt.style.display = 'block';
    setTimeout(() => {
      prompt.style.opacity = '1';
      prompt.style.transform = 'translateY(0)';
    }, 50);
  }
}

export function dismissRoulette() {
  const prompt = document.getElementById('roulette-prompt');
  if (prompt) {
    prompt.style.opacity = '0';
    prompt.style.transform = 'translateY(14px)';
    setTimeout(() => prompt.style.display = 'none', 450);
  }
}

export function buildDrum() {
  const inner = document.getElementById('drum-inner');
  if (!inner || state.watchlist.length === 0) return;
  
  inner.innerHTML = '';
  const pool = [...state.watchlist];
  
  // Duplicate list to create a realistic wheel spinning effect
  const repeats = Math.max(3, Math.ceil(40 / pool.length));
  let finalPool = [];
  for (let r = 0; r < repeats; r++) {
    finalPool = finalPool.concat(pool);
  }
  
  finalPool.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'drum-card';
    card.dataset.id = movie.id;
    card.innerHTML = `<img src="${movie.poster}" alt="${movie.title}"/>`;
    inner.appendChild(card);
  });
}

export function spinRoulette() {
  if (state.spinLock || state.watchlist.length === 0) return;
  state.spinLock = true;
  resetWinner();

  const btn = document.getElementById('spin-btn');
  const inner = document.getElementById('drum-inner');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('spinning');
  }

  playWhoosh();
  playSpinAccel();

  const winnerIdx = Math.floor(Math.random() * state.watchlist.length);
  const winner = state.watchlist[winnerIdx];

  if (inner) {
    inner.style.transition = 'none';
    inner.style.transform = 'translateX(0)';
  }
  buildDrum();

  const CARD_W = 112 + 10;
  const cards = inner ? inner.querySelectorAll('.drum-card') : [];
  const totalCards = cards.length;

  let targetCardIdx = -1;
  const searchStart = Math.floor(totalCards * 0.55);
  for (let i = searchStart; i < totalCards; i++) {
    if (String(cards[i].dataset.id) === String(winner.id)) { targetCardIdx = i; break; }
  }
  if (targetCardIdx === -1) targetCardIdx = searchStart;

  const wrapW = document.getElementById('drum-wrap').offsetWidth;
  const targetX = -(targetCardIdx * CARD_W - wrapW / 2 + CARD_W / 2);
  const overshoot = targetX - CARD_W * 5;

  requestAnimationFrame(() => {
    if (inner) {
      inner.style.transition = 'transform 2.6s cubic-bezier(.12,.7,.18,1)';
      inner.style.transform = `translateX(${overshoot}px)`;
    }
  });

  setTimeout(() => {
    if (inner) {
      inner.style.transition = 'transform 0.85s cubic-bezier(.34,1.1,.64,1)';
      inner.style.transform = `translateX(${targetX}px)`;
    }
    setTimeout(playTick, 200);
    setTimeout(playTick, 500);
  }, 2620);

  setTimeout(() => {
    if (inner) {
      inner.querySelectorAll('.drum-card').forEach((c, i) => {
        if (i === targetCardIdx) c.classList.add('winner');
      });
    }
    showWinner(winner);
    playWin();
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('spinning');
    }
    state.spinLock = false;
    confettiBurst();
  }, 3580);
}

export function showWinner(movie) {
  const panel = document.getElementById('winner-reveal');
  if (!panel) return;
  
  const nameEl = document.getElementById('winner-name');
  const metaEl = document.getElementById('winner-meta');
  const openEl = document.getElementById('winner-open');
  
  if (nameEl) nameEl.textContent = movie.title;
  if (metaEl) metaEl.textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
  if (openEl) openEl.onclick = () => openModal(movie);
  
  panel.classList.add('show');
}

export function resetWinner() {
  const panel = document.getElementById('winner-reveal');
  if (panel) panel.classList.remove('show');
  
  const inner = document.getElementById('drum-inner');
  if (inner) {
    inner.querySelectorAll('.drum-card').forEach(c => c.classList.remove('winner'));
  }
}

export function confettiBurst() {
  const savedVal = localStorage.getItem('confetti_enabled');
  const confettiEnabled = savedVal !== null ? (savedVal === 'true') : true;
  if (!confettiEnabled) return;

  for (let i = 0; i < 75; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti';
    const left = 10 + Math.random() * 80;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    dot.style.cssText = `
      left:${left}%;background:${color};
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
      result.style.display = 'none';
    }

    const N = state.watchlist.length;

    if (N === 0) {
      if (galleryWrap) galleryWrap.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      if (rollBtn) rollBtn.style.display = 'none';
      if (lockMsg) lockMsg.style.display = 'none';
      return;
    }

    if (N === 1) {
      if (galleryWrap) galleryWrap.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'none';
      if (rollBtn) rollBtn.style.display = 'none';
      if (lockMsg) lockMsg.style.display = 'flex';
      return;
    }

    // If 2 or more movies, unlock!
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (lockMsg) lockMsg.style.display = 'none';
    if (galleryWrap) galleryWrap.style.display = 'block';
    if (rollBtn) rollBtn.style.display = 'inline-flex';

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
  if (result) { result.classList.remove('show'); result.style.display = 'none'; }

  const app = pickGalleryApp;
  
  // Reset highlights on all media cards
  app.medias.forEach(media => {
    media.uWinningTarget = 0.0;
  });

  // Pick a random winner
  const winnerIdx = Math.floor(Math.random() * state.watchlist.length);
  const winner = state.watchlist[winnerIdx];

  const w = app.medias[0].width;
  const N = state.watchlist.length;

  // Calculate current index position
  const currentIndex = Math.round(app.scroll.target / w);

  // We want to spin smoothly with 4 rotations
  const rotations = 4;
  const targetIndex = currentIndex + rotations * N + ((winnerIdx - (currentIndex % N) + N) % N);

  // Set target and start programmatic spin with faster deceleration ease
  app.scroll.target = targetIndex * w;
  app.scroll.ease = 0.04; // Faster deceleration
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

  result.style.display = 'block';
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
  if (orb) {
    orb.style.transform = 'scale(0.82)';
    orb.classList.remove('has-result');
  }
  setTimeout(() => { if (orb) orb.style.transform = ''; }, 200);

  if (result) result.classList.remove('show');
  if (section) section.classList.remove('has-result');

  if (TMDB_API_KEY) {
    const page = Math.floor(Math.random() * 50) + 1;
    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
          fetchTMDBDetails(randomMovie.id).then(movie => {
            if (!movie) return;
            state.currentSurpriseMovie = movie;
            setTimeout(() => {
              document.getElementById('s-img').src = movie.poster;
              document.getElementById('s-title').textContent = movie.title;
              document.getElementById('s-sub').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
              document.getElementById('s-synopsis').textContent = movie.synopsis.slice(0, 115) + '…';
              document.getElementById('s-modal-btn').onclick = () => openModal(movie);
              document.getElementById('s-add-btn').onclick = () => addToWatchlist(movie, document.getElementById('s-add-btn'));
              syncWatchlistButtons();
              if (result) result.classList.add('show');
              if (orb) orb.classList.add('has-result');
              if (section) section.classList.add('has-result');
            }, 220);
          });
        }
      });
    return;
  }

  // Offline Mode pick
  let movieId;
  if (state.movieLensData.loaded) {
    const movieIds = Object.keys(state.movieLensData.movies);
    let idx;
    do {
      idx = Math.floor(Math.random() * movieIds.length);
      movieId = parseInt(movieIds[idx]);
    } while (movieId === lastSurprise);
    lastSurprise = movieId;
  } else {
    let idx;
    do { idx = Math.floor(Math.random() * MOVIES.length); } while (idx === lastSurprise);
    lastSurprise = idx;
    movieId = MOVIES[idx].id;
  }

  fetchTMDBDetails(movieId).then(movie => {
    if (!movie) return;
    state.currentSurpriseMovie = movie;
    setTimeout(() => {
      document.getElementById('s-img').src = movie.poster;
      document.getElementById('s-title').textContent = movie.title;
      document.getElementById('s-sub').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
      document.getElementById('s-synopsis').textContent = movie.synopsis.slice(0, 115) + '…';
      document.getElementById('s-modal-btn').onclick = () => openModal(movie);
      document.getElementById('s-add-btn').onclick = () => addToWatchlist(movie, document.getElementById('s-add-btn'));
      syncWatchlistButtons();
      if (result) result.classList.add('show');
      if (orb) orb.classList.add('has-result');
      if (section) section.classList.add('has-result');
    }, 220);
  });
}

/* ─── STAR RATING LOGIC ─── */
export function highlightStars(rating) {
  const stars = document.querySelectorAll('.user-stars i');
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
    modal.style.transition = 'transform .42s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
    modal.style.transform = 'scale(1) translateY(0)';
    modal.style.opacity = '1';
  }, 220);
}

export function openModal(movie, _fromSimilar = false, skipHashUpdate = false) {
  if (!skipHashUpdate && movie && movie.id) {
    window.location.hash = `#movie-${movie.id}`;
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
  
  const isSeries = movie.type === 'series';
  const backdropEl = document.getElementById('m-backdrop');
  const posterEl = document.getElementById('m-poster');
  const hasValidBackdrop = movie.backdrop && movie.backdrop !== movie.poster && !movie.backdrop.includes('unsplash.com');
  
  if (hasValidBackdrop) {
    backdropEl.src = movie.backdrop;
    backdropEl.style.filter = 'none';
    backdropEl.style.transform = 'none';
    if (posterEl) posterEl.style.display = 'none';
  } else {
    backdropEl.src = movie.poster;
    backdropEl.style.filter = 'blur(15px) brightness(0.4)';
    backdropEl.style.transform = 'scale(1.1)';
    if (posterEl) {
      posterEl.src = movie.poster;
      posterEl.style.display = 'block';
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

  if (isSeries) {
    document.getElementById('m-chip').innerHTML = `<i class="fa-solid fa-tv" style="font-size:10px"></i> Popular Series`;
    document.getElementById('m-title').textContent = movie.title;
    document.getElementById('m-year').textContent = `${movie.year}`;
    document.getElementById('m-rating').textContent = `★ ${movie.rating}`;
    document.getElementById('m-runtime').textContent = "Series";
    document.getElementById('m-genre').textContent = movie.genre;
    document.getElementById('m-synopsis').textContent = movie.synopsis || `${movie.title} is a hit series in the ${movie.genre} genre. Watch all seasons now! Rated ${movie.rating}/10.`;
    
    document.getElementById('m-platforms').innerHTML = `<span class="plat-badge"><i class="fa-solid fa-circle-play" style="font-size:9px;color:var(--y)"></i>Streaming</span>`;
    document.getElementById('m-reasons').innerHTML = `<span class="ai-pill"><i class="fa-solid fa-bolt" style="font-size:9px"></i>Trending</span>`;
    
    // Render Director
    const directorList = (movie.director && movie.director.length > 0) ? movie.director : [
      { name: "Creator", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }
    ];
    document.getElementById('m-director').innerHTML = directorList.map((d, idx) => `
      <div class="m-director-person" data-director-index="${idx}">
        <img src="${d.img}" alt="${d.name}"/>
        <span>${d.name}</span>
      </div>
    `).join('');

    // Render Cast
    const castList = (movie.cast && movie.cast.length > 0) ? movie.cast : [
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
    if (ratingBox) ratingBox.style.display = 'none';
    
    const videoContainer = document.getElementById('m-video-container');
    if (videoContainer) videoContainer.style.display = 'none';
    
    const playBtn = document.getElementById('m-play-btn');
    if (playBtn) playBtn.style.display = 'none';
    
  } else {
    const ratingBox = document.querySelector('.user-rating-box');
    if (ratingBox) ratingBox.style.display = 'flex';
    
    document.getElementById('m-chip').innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:10px"></i> ${movie.match}% Match`;
    document.getElementById('m-title').textContent = movie.title;
    document.getElementById('m-year').textContent = `${movie.year} · ${movie.runtime}`;
    document.getElementById('m-rating').textContent = `★ ${movie.rating}`;
    document.getElementById('m-runtime').textContent = movie.runtime;
    document.getElementById('m-genre').textContent = movie.genre;
    document.getElementById('m-synopsis').textContent = movie.synopsis;

    document.getElementById('m-platforms').innerHTML = movie.platforms.map(p =>
      `<span class="plat-badge"><i class="fa-solid fa-circle-play" style="font-size:9px;color:var(--y)"></i>${p}</span>`
    ).join('');

    document.getElementById('m-reasons').innerHTML = movie.reasons.map(r =>
      `<span class="ai-pill"><i class="fa-solid fa-bolt" style="font-size:9px"></i>${r}</span>`
    ).join('');

    // Render Director
    const directorList = (movie.director && movie.director.length > 0) ? movie.director : [
      { name: "Director N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" }
    ];
    document.getElementById('m-director').innerHTML = directorList.map((d, idx) => `
      <div class="m-director-person" data-director-index="${idx}">
        <img src="${d.img}" alt="${d.name}"/>
        <span>${d.name}</span>
      </div>
    `).join('');

    // Render Cast
    const castList = (movie.cast && movie.cast.length > 0) ? movie.cast : [
      { name: "Lead Actor", character: "Protagonist", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80" },
      { name: "Supporting Cast", character: "Co-Star", img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&q=80" }
    ];
    
    document.getElementById('m-cast').innerHTML = castList.map((c, idx) => `
      <div class="m-cast-person" data-cast-index="${idx}">
        <img src="${c.img}" alt="${c.name}"/>
        <span>${c.name}</span>
      </div>
    `).join('');

    // Set user stars
    const userRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    const myRating = userRatings[movie.id] || 0;
    highlightStars(myRating);
    
    const starsContainer = document.querySelector('.user-stars');
    if (starsContainer) {
      starsContainer.onmouseleave = () => {
        const currentRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
        highlightStars(currentRatings[movie.id] || 0);
      };
    }
    
    document.querySelectorAll('.user-stars i').forEach(star => {
      star.onmouseenter = () => {
        const val = parseInt(star.dataset.value);
        highlightStars(val);
      };
      star.onclick = () => {
        const val = parseInt(star.dataset.value);
        const currentRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
        if (currentRatings[movie.id] === val) {
          delete currentRatings[movie.id];
        } else {
          currentRatings[movie.id] = val;
        }
        localStorage.setItem('user_movie_ratings', JSON.stringify(currentRatings));
        highlightStars(currentRatings[movie.id] || 0);
        if (state.movieLensData.loaded) {
          initializeRecommender();
          initHero();
        }
      };
    });

    // Play Trailer Config
    const playBtn = document.getElementById('m-play-btn');
    const videoContainer = document.getElementById('m-video-container');
    const videoIframe = document.getElementById('m-video-iframe');
    
    if (videoContainer) videoContainer.style.display = 'none';
    if (videoIframe) videoIframe.src = '';
    
    if (movie.trailerKey && playBtn) {
      playBtn.style.display = 'inline-flex';
      playBtn.onclick = () => {
        if (videoIframe) videoIframe.src = `https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`;
        if (videoContainer) {
          videoContainer.style.display = 'block';
          videoContainer.scrollIntoView({ behavior: 'smooth' });
        }
      };
    } else if (playBtn) {
      playBtn.style.display = 'none';
    }
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
      window.location.hash = '#home';
    }
  }
}

export function handleOverlay(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') {
    closeModal();
    if (typeof window.closeSearchModal === 'function') window.closeSearchModal();
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
  document.getElementById('tmdb-key-input').value = localStorage.getItem('tmdb_api_key') || '';
  
  switchSettingsTab('api-integration');
  
  const runtimeMin = Math.round((Date.now() - sessionStart) / 60000);
  const runtimeValEl = document.getElementById('session-runtime-val');
  if (runtimeValEl) {
    runtimeValEl.textContent = `${runtimeMin}m`;
  }
  
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

  const key = document.getElementById('tmdb-key-input').value.trim();
  if (key) {
    testTMDBConnection();
  } else {
    const dot = document.getElementById('connection-status-indicator');
    const text = document.getElementById('connection-status-text');
    const latencyValEl = document.getElementById('tmdb-latency-val');
    if (dot) dot.className = 'status-dot';
    if (text) text.textContent = 'API Key is not configured.';
    if (latencyValEl) latencyValEl.textContent = 'N/A';
  }
  
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
  const oldKey = localStorage.getItem('tmdb_api_key') || '';
  const newKey = document.getElementById('tmdb-key-input').value.trim();
  
  if (newKey) {
    localStorage.setItem('tmdb_api_key', newKey);
  } else {
    localStorage.removeItem('tmdb_api_key');
  }
  
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
export function clearSearch(skipHashUpdate = false) {
  state.isShowingGenre = false;
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  const searchSec = document.getElementById('search-section');
  if (searchSec) {
    searchSec.style.display = 'none';
    const titleEl = searchSec.querySelector('.sec-title');
    if (titleEl) {
      titleEl.innerHTML = `<i class="fa-solid fa-magnifying-glass" style="color:var(--v);font-size:15px"></i> Search Results`;
    }
  }
  document.body.classList.remove('search-active');
  
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
      window.location.hash = '#home';
    }
  }
}

let searchDebounce;
export function handleSearchInput(e) {
  state.isShowingGenre = false;
  const genreBtn = document.getElementById('dock-genre-btn');
  if (genreBtn) {
    genreBtn.classList.remove('active');
  }
  const q = e.target.value.trim().toLowerCase();
  const searchSec = document.getElementById('search-section');
  const searchResults = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');

  if (!q) {
    if (searchSec) searchSec.style.display = 'none';
    document.body.classList.remove('search-active');
    
    if (typeof activeViewState !== 'undefined' && activeViewState === 'watchlist') {
      window.location.hash = '#watchlist-section';
    } else {
      window.location.hash = '#home';
    }
    return;
  }

  if (!document.body.classList.contains('search-active')) {
    window.location.hash = '#search';
  }
  document.body.classList.add('search-active');

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    if (!searchResults) return;
    searchResults.innerHTML = '';

    if (TMDB_API_KEY) {
      if (countEl) countEl.textContent = "Searching...";
      const moviePromise = fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .catch(() => ({ results: [] }));
      const tvPromise = fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .catch(() => ({ results: [] }));

      Promise.all([moviePromise, tvPromise]).then(([movieData, tvData]) => {
        if (e.target.value.trim().toLowerCase() !== q) return;
        
        searchResults.innerHTML = '';
        const movies = (movieData.results || []).map(item => ({ ...item, mediaType: 'movie' }));
        const tvs = (tvData.results || []).map(item => ({ ...item, mediaType: 'tv' }));
        
        let combined = [...movies, ...tvs]
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 18);
          
        if (countEl) countEl.textContent = `${combined.length} found`;
        
        if (combined.length === 0) {
          searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No results found matching that query.</div>';
        } else {
          combined.forEach(item => {
            let cardId = `tmdb-${item.mediaType}-${item.id}`;
            if (item.mediaType === 'movie' && state.movieLensData.loaded) {
              const mlMovie = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
              if (mlMovie) {
                cardId = mlMovie.movieId;
              }
            }
            searchResults.appendChild(buildCard(cardId, item));
          });
        }
        if (searchSec) searchSec.style.display = 'block';
      });
    } else {
      let matches = [];
      if (state.movieLensData.loaded) {
        matches = Object.values(state.movieLensData.movies)
          .filter(m => m.title.toLowerCase().includes(q))
          .slice(0, 18)
          .map(m => m.movieId);
      } else {
        matches = MOVIES
          .filter(m => m.title.toLowerCase().includes(q))
          .slice(0, 18)
          .map(m => m.id);
      }
      
      if (countEl) countEl.textContent = `${matches.length} found`;
      
      if (matches.length === 0) {
        searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
      } else {
        matches.forEach(id => {
          searchResults.appendChild(buildCard(id));
        });
      }
      if (searchSec) searchSec.style.display = 'block';
    }
  }, 300);
}

// Logo click listener
document.querySelectorAll('.logo, .footer-logo').forEach(logo => {
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    clearSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initHero();
  });
});

/* ─── SEARCH MODAL ─── */
let smDebounce;

window.openSearchModal = function() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.classList.add('on');
  setTimeout(() => {
    const inp = document.getElementById('sm-search-input');
    if (inp) inp.focus();
  }, 120);
};

window.closeSearchModal = function() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.classList.remove('on');
};

window.handleSearchOverlay = function(e) {
  if (e.target === document.getElementById('search-overlay')) {
    window.closeSearchModal();
  }
};

window.clearSearchModalInput = function() {
  const inp = document.getElementById('sm-search-input');
  if (inp) {
    inp.value = '';
    inp.dispatchEvent(new Event('input'));
    inp.focus();
  }
};

// Wire up the modal search input
(function initModalSearch() {
  const inp = document.getElementById('sm-search-input');
  const clearBtn = document.getElementById('sm-clear-btn');
  const catSelect = document.getElementById('search-category');
  if (!inp) return;

  inp.addEventListener('input', () => {
    const q = inp.value.trim();
    if (clearBtn) clearBtn.classList.toggle('visible', q.length > 0);
    clearTimeout(smDebounce);
    smDebounce = setTimeout(() => runModalSearch(q), 280);
  });

  if (catSelect) {
    catSelect.addEventListener('change', () => {
      const q = inp.value.trim();
      if (q) runModalSearch(q);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeSearchModal();
  });
})();

function runModalSearch(q) {
  const list = document.getElementById('sm-results-list');
  if (!list) return;

  if (!q) {
    list.innerHTML = '<div class="sm-placeholder">Type something to search...</div>';
    return;
  }

  const category = (document.getElementById('search-category') || {}).value || 'all';
  list.innerHTML = '<div class="sm-loading">Searching...</div>';

  if (TMDB_API_KEY) {
    const fetches = [];
    if (category === 'all' || category === 'movie') {
      fetches.push(
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`)
          .then(r => r.json()).then(d => (d.results || []).map(i => ({ ...i, mediaType: 'movie' })))
          .catch(() => [])
      );
    }
    if (category === 'all' || category === 'tv') {
      fetches.push(
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`)
          .then(r => r.json()).then(d => (d.results || []).map(i => ({ ...i, mediaType: 'tv' })))
          .catch(() => [])
      );
    }

    Promise.all(fetches).then(arrays => {
      const inp = document.getElementById('sm-search-input');
      if (inp && inp.value.trim().toLowerCase() !== q.toLowerCase()) return;
      const combined = [].concat(...arrays)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20);
      renderModalResults(combined, list, 'tmdb');
    });
  } else {
    let matches = [];
    if (state.movieLensData.loaded) {
      matches = Object.values(state.movieLensData.movies)
        .filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 20)
        .map(m => ({
          id: m.movieId,
          title: m.title.replace(/\s\(\d{4}\)$/, ''),
          year: m.title.match(/\((\d{4})\)$/)?.[1] || 'N/A',
          genre: m.genres.replace(/\|/g, ' · '),
          mediaType: 'movie',
          vote_average: null,
          poster_path: null
        }));
    } else {
      matches = MOVIES
        .filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 20)
        .map(m => ({
          id: m.id,
          title: m.title,
          year: m.year,
          genre: m.genre,
          mediaType: 'movie',
          vote_average: parseFloat(m.rating),
          poster_path: null,
          poster: m.poster
        }));
    }
    renderModalResults(matches, list, 'offline');
  }
}

function renderModalResults(items, list, mode) {
  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = '<div class="sm-no-results">No results found. Try a different title.</div>';
    return;
  }

  items.forEach(item => {
    const isTV = item.mediaType === 'tv';
    const title = isTV ? (item.name || item.title || 'Unknown') : (item.title || 'Unknown');
    const year = isTV
      ? (item.first_air_date ? item.first_air_date.split('-')[0] : (item.year || 'N/A'))
      : (item.release_date ? item.release_date.split('-')[0] : (item.year || 'N/A'));
    const rating = item.vote_average ? parseFloat(item.vote_average).toFixed(1) : null;
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
      : (item.poster || 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=92&q=80');
    const genre = item.genre || '';
    const cardId = mode === 'tmdb' ? `tmdb-${item.mediaType}-${item.id}` : item.id;
    const inList = state.watchlist.some(m => String(m.id) === String(cardId));

    const row = document.createElement('div');
    row.className = 'sm-result-row';
    row.innerHTML = `
      <img class="sm-result-thumb" src="${poster}" alt="${title}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=92&q=80'"/>
      <div class="sm-result-body">
        <div class="sm-result-title">${title}</div>
        <div class="sm-result-meta">
          <span class="sm-result-type ${isTV ? 'tv' : 'movie'}">${isTV ? 'TV Show' : 'Movie'}</span>
          ${year !== 'N/A' ? `<span class="sm-dot">·</span><span>${year}</span>` : ''}
          ${rating ? `<span class="sm-dot">·</span><span class="sm-result-rating"><i class="fa-solid fa-star"></i>${rating}</span>` : ''}
          ${genre ? `<span class="sm-dot">·</span><span style="color:var(--t3)">${genre.split('·').slice(0,2).join('·').trim()}</span>` : ''}
        </div>
      </div>
      <button class="sm-result-add${inList ? ' added' : ''}" title="${inList ? 'In Watchlist' : 'Add to Watchlist'}">
        <i class="fa-solid ${inList ? 'fa-check' : 'fa-plus'}" style="font-size:11px"></i>
      </button>`;

    row.addEventListener('click', () => {
      window.closeSearchModal();
      fetchTMDBDetails(cardId).then(details => { if (details) openModal(details); });
    });

    const addBtn = row.querySelector('.sm-result-add');
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const details = await fetchTMDBDetails(cardId);
      if (!details) return;
      toggleWatchlist(details);
      addBtn.classList.add('added');
      addBtn.innerHTML = '<i class="fa-solid fa-check" style="font-size:11px"></i>';
      addBtn.title = 'In Watchlist';
    });

    list.appendChild(row);
  });
}

/* ─── DYNAMIC HERO SECTION ─── */
export function updateHeroUI(movie) {
  if (!movie) return;
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  const heroImg = heroSection.querySelector('.hero-img');
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
    if (movie.title.includes(':')) {
      const parts = movie.title.split(':');
      title.innerHTML = `${parts[0]}<br><span style="font-size: 0.6em; font-weight: 700;">${parts.slice(1).join(':').trim()}</span>`;
    } else if (movie.title.length > 15) {
      const words = movie.title.split(' ');
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        title.innerHTML = `${words.slice(0, mid).join(' ')}<br>${words.slice(mid).join(' ')}`;
      } else {
        title.textContent = movie.title;
      }
    } else {
      title.textContent = movie.title;
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
      openModal(movie);
      setTimeout(() => {
        const mPlayBtn = document.getElementById('m-play-btn');
        if (mPlayBtn && mPlayBtn.style.display !== 'none') {
          mPlayBtn.click();
        }
      }, 400);
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
}

export async function initHero() {
  let heroMovie = null;
  
  if (TMDB_API_KEY && (!state.movieLensData.loaded || Object.keys(state.movieLensData.movies || {}).length === 0)) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const movie = data.results[Math.floor(Math.random() * Math.min(5, data.results.length))];
        heroMovie = await fetchTMDBDetails(movie.id);
      }
    } catch(e) {
      console.warn("Hero fetch now playing error, fallback used:", e);
    }
  } else if (state.movieLensData.loaded) {
    const myRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    if (Object.keys(myRatings).length > 0 && typeof state.personalizedRecommendations === 'object') {
      const sortedIds = Object.entries(state.personalizedRecommendations)
        .sort((a, b) => b[1] - a[1])
        .map(entry => parseInt(entry[0]));
      if (sortedIds.length > 0) {
        const candidates = sortedIds.slice(0, 3);
        const randomId = candidates[Math.floor(Math.random() * candidates.length)];
        heroMovie = await fetchTMDBDetails(randomId);
      }
    }
  }

  if (!heroMovie) {
    const randomId = DEFAULT_RECS[Math.floor(Math.random() * DEFAULT_RECS.length)];
    heroMovie = await fetchTMDBDetails(randomId);
  }
  
  if (heroMovie) {
    updateHeroUI(heroMovie);
  }
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
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// Attach listeners to input search element
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', handleSearchInput);
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
window.testTMDBConnection = testTMDBConnection;
window.toggleGenrePill = toggleGenrePill;
window.toggleProviderCheckbox = toggleProviderCheckbox;
window.showToast = showToast;
window.spinRoulette = spinRoulette;
window.openRoulette = openRoulette;
window.dismissRoulette = dismissRoulette;
window.closeRoulette = closeRoulette;
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
    if (typeof window.openSearchModal === 'function') {
      window.openSearchModal();
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
  
  // 1. Movie details modal routing
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

  // 2. Watchlist routing
  if (hash === '#watchlist-section' || hash === '#watchlist') {
    activeViewState = 'watchlist';
    showWatchlistPage();
    return;
  }
  
  // 3. Search routing - Redirect and show search overlay modal directly
  if (hash === '#search') {
    window.location.hash = (activeViewState === 'watchlist') ? '#watchlist-section' : '#home';
    if (typeof window.openSearchModal === 'function') {
      window.openSearchModal();
    }
    return;
  }

  // 4. Section routing (Trending, Platforms, Surprise Me)
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
  
  // 5. Default home page routing
  if (hash === '' || hash === '#' || hash === '#home' || hash === '#hero') {
    activeViewState = 'home';
    showHomePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
}

export function showWatchlistPage() {
  clearSearch(true);
  updateNavbarActiveLink('watchlist-section');
  closeModal(true);

  const homeElements = [
    document.getElementById('hero'),
    ...Array.from(document.querySelectorAll('main > section:not(#watchlist-section)'))
  ].filter(Boolean);
  
  const watchlistSection = document.getElementById('watchlist-section');
  if (!watchlistSection) return;

  document.body.classList.add('watchlist-active');

  // GSAP cross-fade transition
  gsap.killTweensOf(homeElements);
  gsap.killTweensOf(watchlistSection);

  const isHomeVisible = homeElements.some(el => el.style.display !== 'none' && parseFloat(el.style.opacity || "1") > 0);
  
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

export function showHomePage() {
  clearSearch(true);
  updateNavbarActiveLink('hero');
  
  const homeElements = [
    document.getElementById('hero'),
    ...Array.from(document.querySelectorAll('main > section:not(#watchlist-section)'))
  ].filter(Boolean);

  const watchlistSection = document.getElementById('watchlist-section');
  if (!watchlistSection) return;

  document.body.classList.remove('watchlist-active');

  gsap.killTweensOf(homeElements);
  gsap.killTweensOf(watchlistSection);

  const isWatchlistVisible = watchlistSection.style.display !== 'none' && parseFloat(gsap.getProperty(watchlistSection, "opacity")) > 0;

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

import { saveAuthState } from './state.js';

window.switchLoginTab = function(tab) {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (tab === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    submitBtn.textContent = 'Log In';
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    submitBtn.textContent = 'Sign Up';
  }
};

window.handleAuthSubmit = function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  // Mock login success
  state.isLoggedIn = true;
  state.user = { name: email.split('@')[0], role: 'Member' };
  saveAuthState();
  document.body.classList.remove('not-logged-in');
  updateProfileUI();
  updateWatchlistUI();
};

window.continueAsGuest = function() {
  state.isLoggedIn = true;
  state.user = { name: 'Guest', role: 'Limited Access' };
  saveAuthState();
  document.body.classList.remove('not-logged-in');
  updateProfileUI();
  updateWatchlistUI();
};

window.logout = function() {
  state.isLoggedIn = false;
  state.user = null;
  saveAuthState();
  document.body.classList.add('not-logged-in');
  document.getElementById('profile-dropdown').classList.remove('show');
  window.location.hash = ''; // Return to top
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

  const searchSec = document.getElementById('search-section');
  const searchResults = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  if (!searchSec || !searchResults) return;

  state.isShowingGenre = true;

  // Set URL hash to search
  window.location.hash = '#search';
  document.body.classList.add('search-active');
  
  // Highlight dock Genre button as active and remove other active links
  const genreBtn = document.getElementById('dock-genre-btn');
  if (genreBtn) {
    document.querySelectorAll('.tiktok-nav .tt-item').forEach(el => el.classList.remove('active'));
    genreBtn.classList.add('active');
  }
  
  // Update header and sub-header details
  const titleEl = searchSec.querySelector('.sec-title');
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-tags" style="color:var(--y);font-size:15px"></i> ${genreName} Movies`;
  }
  const subEl = searchSec.querySelector('.sec-sub');
  if (subEl) {
    subEl.textContent = `Top rated and popular titles in ${genreName}`;
  }

  // Clear inputs
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  // Clear previous results and show loading
  searchResults.innerHTML = '';
  if (countEl) countEl.textContent = "Loading...";
  searchSec.style.display = 'block';

  // Perform TMDb / local MovieLens filtering
  if (TMDB_API_KEY) {
    // Online mode: Query TMDb discover movies matching the selected genre sorted by vote average
    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`)
      .then(res => res.json())
      .then(data => {
        searchResults.innerHTML = '';
        const items = data.results || [];
        if (countEl) countEl.textContent = `${items.length} found`;
        
        if (items.length === 0) {
          searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found in this genre.</div>';
          return;
        }

        items.slice(0, 18).forEach(item => {
          let cardId = `tmdb-movie-${item.id}`;
          if (state.movieLensData.loaded) {
            const mlMovie = Object.values(state.movieLensData.movies).find(m => m.tmdbId == item.id);
            if (mlMovie) {
              cardId = mlMovie.movieId;
            }
          }
          searchResults.appendChild(buildCard(cardId, item));
        });
      })
      .catch(err => {
        console.error("TMDb discover error, falling back to local search", err);
        showGenreMoviesOfflineFallback(genreName, searchResults, countEl);
      });
  } else {
    // Offline mode
    showGenreMoviesOfflineFallback(genreName, searchResults, countEl);
  }

  // Scroll to search section smoothly
  setTimeout(() => {
    searchSec.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function showGenreMoviesOfflineFallback(genreName, container, countEl) {
  container.innerHTML = '';
  
  if (state.movieLensData.loaded) {
    // Get MovieLens movies matching this genre
    const matchedMovies = Object.values(state.movieLensData.movies).filter(m => {
      if (!m.genres) return false;
      return m.genres.toLowerCase().includes(genreName.toLowerCase());
    });

    // Score them using Bayesian weighting: (count * avg + 5 * 3.5) / (count + 5)
    const scored = matchedMovies.map(m => {
      const ratings = state.movieLensData.movieRatings[m.movieId] || {};
      const count = Object.keys(ratings).length;
      let avg = 0;
      if (count > 0) {
        avg = Object.values(ratings).reduce((a, b) => a + b, 0) / count;
      }
      const score = (count * avg + 5 * 3.5) / (count + 5);
      return { movieId: m.movieId, score, count };
    });

    // Sort descending by Bayesian score
    scored.sort((a, b) => b.score - a.score);
    const topScored = scored.slice(0, 18);

    if (countEl) countEl.textContent = `${topScored.length} found`;

    if (topScored.length === 0) {
      container.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found in this genre.</div>';
      return;
    }

    topScored.forEach(item => {
      container.appendChild(buildCard(item.movieId));
    });
  } else {
    // Fallback to local MOVIES array in data.js
    const matched = MOVIES.filter(m => {
      if (!m.genre) return false;
      return m.genre.toLowerCase().includes(genreName.toLowerCase());
    });

    if (countEl) countEl.textContent = `${matched.length} found`;

    if (matched.length === 0) {
      container.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found in this genre.</div>';
      return;
    }

    matched.forEach(movie => {
      container.appendChild(buildCard(movie.id));
    });
  }
}

export function initGenrePopover() {
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
      e.stopPropagation();
      toggleGenrePopover();
    });
  }

  // Bind click on close button
  const closeBtn = document.getElementById('gp-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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

  // Stop propagation on popover click
  const popover = document.getElementById('genre-popover');
  if (popover) {
    popover.addEventListener('click', (e) => {
      e.stopPropagation();
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
