import { state } from './state.js?v=28';
import { TMDB_API_KEY, DEFAULT_RECS } from './config.js?v=28';
import { buildCard, updateDatabaseStatus, renderRows, buildTrending, buildPlatforms, initHero, makeRowInfinite, renderHomeSections } from './ui.js?v=28';
import { loadModel, getRecommendations, getScoreMap } from './ml-model.js?v=28';

/* ─── RECOMMENDATION ENGINE ─── */
export function initializeRecommender() {
  const rw1 = document.getElementById('rw1');
  if (!rw1) return;
  rw1.innerHTML = '';
  rw1._infiniteInit = false;

  if (TMDB_API_KEY) {
    if (state.watchlist.length > 0) {
      // Use up to 3 different watchlist items as seeds and merge results — deduped
      const seeds = state.watchlist
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(m => m.id);

      Promise.all(
        seeds.map(seedId =>
          fetch(`https://api.themoviedb.org/3/movie/${seedId}/recommendations?api_key=${TMDB_API_KEY}`)
            .then(r => r.json())
            .catch(() => ({ results: [] }))
        )
      ).then(allData => {
        const seen = new Set();
        const merged = [];
        // Interleave results from each seed so variety comes first
        const maxLen = Math.max(...allData.map(d => (d.results || []).length));
        for (let i = 0; i < maxLen; i++) {
          allData.forEach(data => {
            const m = (data.results || [])[i];
            if (m && !seen.has(m.id)) { seen.add(m.id); merged.push(m); }
          });
        }
        if (merged.length > 0) {
          merged.slice(0, 20).forEach(m => rw1.appendChild(buildCard(m.id, m)));
        } else {
          loadDefaultRecs(rw1);
        }
        requestAnimationFrame(() => makeRowInfinite(rw1));
      }).catch(() => { loadDefaultRecs(rw1); requestAnimationFrame(() => makeRowInfinite(rw1)); });
    } else {
      loadDefaultRecs(rw1);
    }
    return;
  }

  // Offline MovieLens collaborative filtering
  const myRatingsStr = localStorage.getItem('user_movie_ratings') || '{}';
  const myRatings = JSON.parse(myRatingsStr);

  if (Object.keys(myRatings).length === 0) {
    state.personalizedRecommendations = {};
    // Use first half of DEFAULT_RECS for rw1 (rw2 uses second half — no overlap)
    DEFAULT_RECS.slice(0, Math.ceil(DEFAULT_RECS.length / 2)).forEach(id => {
      rw1.appendChild(buildCard(id));
    });
    requestAnimationFrame(() => makeRowInfinite(rw1));
    return;
  }

  const myRatingsMapped = {};
  for (const [mid, r] of Object.entries(myRatings)) {
    myRatingsMapped[parseInt(mid)] = parseFloat(r);
  }

  // Trained SVD model (32 latent factors, fit offline on MovieLens)
  loadModel().then(() => {
    state.personalizedRecommendations = getScoreMap(myRatingsMapped);
    const sortedIds = getRecommendations(myRatingsMapped, 10);

    rw1.innerHTML = '';
    if (sortedIds.length === 0) {
      DEFAULT_RECS.forEach(id => rw1.appendChild(buildCard(id)));
    } else {
      sortedIds.forEach(id => rw1.appendChild(buildCard(id)));
    }
    requestAnimationFrame(() => makeRowInfinite(rw1));
  });
}

export function loadDefaultRecs(container) {
  // Pick a random page from top_rated so "For You" row doesn't always show the same movies
  const randomPage = Math.floor(Math.random() * 4) + 1;
  fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${randomPage}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) {
        const shuffled = data.results.sort(() => Math.random() - 0.5);
        shuffled.slice(0, 15).forEach(m => container.appendChild(buildCard(m.id, m)));
        requestAnimationFrame(() => makeRowInfinite(container));
      }
    });
}

/* ─── LOAD MOVIELENS DATABASE ─── */
export async function loadMovieLensDatabase() {
  if (TMDB_API_KEY) {
    updateDatabaseStatus('movies', 'Live (TMDB)');
    updateDatabaseStatus('links', 'Live (TMDB)');
    updateDatabaseStatus('ratings', 'Live (TMDB)');
    state.movieLensData.loaded = true;
    
    renderRows();
    buildTrending();
    buildPlatforms();
    initHero();
    renderHomeSections();
    return;
  }

  if (window.location.protocol === 'file:') {
    if (typeof window.showToast === 'function') {
      window.showToast(
        "Offline Database Error", 
        "CineMatch is running via file://. Browser security policies block loading local CSVs. Run a local web server (e.g. python -m http.server) to enable offline recommendations.",
        "error"
      );
    }
    updateDatabaseStatus('movies', 'CORS Blocked');
    updateDatabaseStatus('links', 'CORS Blocked');
    updateDatabaseStatus('ratings', 'CORS Blocked');
    return;
  }

  try {
    updateDatabaseStatus('movies', 'Loading...');
    updateDatabaseStatus('links', 'Loading...');
    updateDatabaseStatus('ratings', 'Loading...');

    const moviesRes = await fetch('data/ml-latest-small/movies.csv');
    if (!moviesRes.ok) throw new Error("Failed to load movies.csv");
    const moviesText = await moviesRes.text();
    const moviesCSV = parseCSV(moviesText);

    const moviesMap = {};
    moviesCSV.rows.forEach(row => {
      if (row.length < 3) return;
      const movieId = parseInt(row[0]);
      const title = row[1];
      const genres = row[2];
      moviesMap[movieId] = { movieId, title, genres, tmdbId: null, imdbId: null };
    });

    state.movieLensData.movies = moviesMap;
    updateDatabaseStatus('movies', 'Loaded');

    const linksRes = await fetch('data/ml-latest-small/links.csv');
    if (!linksRes.ok) throw new Error("Failed to load links.csv");
    const linksText = await linksRes.text();
    const linksCSV = parseCSV(linksText);

    linksCSV.rows.forEach(row => {
      if (row.length < 3) return;
      const movieId = parseInt(row[0]);
      const imdbId = row[1];
      const tmdbId = row[2];
      if (moviesMap[movieId]) {
        moviesMap[movieId].imdbId = imdbId;
        moviesMap[movieId].tmdbId = tmdbId;
      }
    });

    updateDatabaseStatus('links', 'Loaded');

    const ratingsRes = await fetch('data/ml-latest-small/ratings.csv');
    if (!ratingsRes.ok) throw new Error("Failed to load ratings.csv");
    const ratingsText = await ratingsRes.text();
    const ratingsCSV = parseCSV(ratingsText);

    const ratingsMap = {};
    const movieRatingsMap = {};

    ratingsCSV.rows.forEach(row => {
      if (row.length < 3) return;
      const userId = parseInt(row[0]);
      const movieId = parseInt(row[1]);
      const rating = parseFloat(row[2]);

      if (!ratingsMap[userId]) ratingsMap[userId] = {};
      ratingsMap[userId][movieId] = rating;

      if (!movieRatingsMap[movieId]) movieRatingsMap[movieId] = {};
      movieRatingsMap[movieId][userId] = rating;
    });

    state.movieLensData.ratings = ratingsMap;
    state.movieLensData.movieRatings = movieRatingsMap;

    state.movieLensData.loaded = true;
    updateDatabaseStatus('ratings', 'Loaded');

    // Warm up the trained SVD model in the background
    loadModel();

    renderRows();
    buildTrending();
    buildPlatforms();
    initHero();
    renderHomeSections();

  } catch (err) {
    console.error("Database load error:", err);
    updateDatabaseStatus('movies', 'Failed');
    updateDatabaseStatus('links', 'Failed');
    updateDatabaseStatus('ratings', 'Failed');
  }
}

/* ─── CSV PARSER ─── */
export function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  const headers = lines[0] ? lines[0].split(',') : [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    result.push(row);
  }
  return { headers, rows: result };
}

/* ─── COSINE SIMILARITY ─── */
export function cosineSimilarity(ratingsA, ratingsB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let shared = 0;

  for (const movieId in ratingsA) {
    const valA = ratingsA[movieId];
    normA += valA * valA;
    if (ratingsB[movieId] !== undefined) {
      const valB = ratingsB[movieId];
      dotProduct += valA * valB;
      shared++;
    }
  }

  for (const movieId in ratingsB) {
    const valB = ratingsB[movieId];
    normB += valB * valB;
  }

  if (shared === 0 || normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ─── MATCH SCORE CALCULATION ─── */
export function calculateMatchScore(movieId) {
  if (state.personalizedRecommendations[movieId]) {
    return Math.min(99, Math.max(75, Math.round(75 + (state.personalizedRecommendations[movieId] / 5.0) * 24)));
  }
  return 85 + ((movieId * 7) % 15);
}
