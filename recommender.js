import { state } from './state.js';
import { TMDB_API_KEY, DEFAULT_RECS } from './config.js';
import { buildCard, updateDatabaseStatus, renderRows, buildTrending, buildPlatforms, initHero } from './ui.js';

/* ─── RECOMMENDATION ENGINE ─── */
export function initializeRecommender() {
  const rw1 = document.getElementById('rw1');
  if (!rw1) return;
  rw1.innerHTML = '';

  if (TMDB_API_KEY) {
    // Online TMDB recommendations based on watchlist seed
    if (state.watchlist.length > 0) {
      const seedId = state.watchlist[0].id;
      fetch(`https://api.themoviedb.org/3/movie/${seedId}/recommendations?api_key=${TMDB_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            data.results.slice(0, 15).forEach(m => rw1.appendChild(buildCard(m.id, m)));
          } else {
            loadDefaultRecs(rw1);
          }
        }).catch(() => loadDefaultRecs(rw1));
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
    DEFAULT_RECS.forEach(id => {
      rw1.appendChild(buildCard(id));
    });
    return;
  }

  const myRatingsMapped = {};
  for (const [mid, r] of Object.entries(myRatings)) {
    myRatingsMapped[parseInt(mid)] = parseFloat(r);
  }

  const similarities = [];
  for (const userId in state.movieLensData.ratings) {
    const uRatings = state.movieLensData.ratings[userId];
    const sim = cosineSimilarity(myRatingsMapped, uRatings);
    if (sim > 0) {
      similarities.push({ userId, similarity: sim });
    }
  }

  similarities.sort((a, b) => b.similarity - a.similarity);
  const topUsers = similarities.slice(0, 30);

  const predictions = {};
  const simSum = {};

  topUsers.forEach(u => {
    const ratings = state.movieLensData.ratings[u.userId];
    for (const [mid, val] of Object.entries(ratings)) {
      const movieId = parseInt(mid);
      if (myRatingsMapped[movieId] !== undefined) continue;

      if (!predictions[movieId]) {
        predictions[movieId] = 0;
        simSum[movieId] = 0;
      }
      predictions[movieId] += u.similarity * val;
      simSum[movieId] += u.similarity;
    }
  });

  const finalRecs = {};
  for (const movieId in predictions) {
    if (simSum[movieId] > 0) {
      finalRecs[movieId] = predictions[movieId] / simSum[movieId];
    }
  }

  state.personalizedRecommendations = finalRecs;

  const sortedIds = Object.entries(state.personalizedRecommendations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => parseInt(entry[0]));

  if (sortedIds.length === 0) {
    DEFAULT_RECS.forEach(id => {
      rw1.appendChild(buildCard(id));
    });
  } else {
    sortedIds.forEach(id => {
      rw1.appendChild(buildCard(id));
    });
  }
}

export function loadDefaultRecs(container) {
  fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) data.results.slice(0, 15).forEach(m => container.appendChild(buildCard(m.id, m)));
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
    return;
  }

  if (window.location.protocol === 'file:') {
    document.getElementById('cors-warning-banner').style.display = 'block';
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

    renderRows();
    buildTrending();
    buildPlatforms();
    initHero();

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
