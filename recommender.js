import { state } from './state.js?v=32';
import { TMDB_API_KEY, DEFAULT_RECS } from './config.js?v=32';
import { buildCard, updateDatabaseStatus, renderRows, buildTrending, buildPlatforms, initHero, makeRowInfinite, renderHomeSections } from './ui.js?v=32';
import { loadModel, getRecommendations, getScoreMap } from './ml-model.js?v=32';

/* ─── RECOMMENDATION ENGINE ─── */
export function initializeRecommender() {
  const rw1 = document.getElementById('rw1');
  if (!rw1) return;
  rw1.innerHTML = '';
  rw1._infiniteInit = false;

  const myRatingsStr = localStorage.getItem('user_movie_ratings') || '{}';
  const myRatings = JSON.parse(myRatingsStr);
  const myRatingsMapped = {};
  for (const [mid, r] of Object.entries(myRatings)) {
    myRatingsMapped[parseInt(mid)] = parseFloat(r);
  }

  let onboardingLikes = [];
  try { onboardingLikes = JSON.parse(localStorage.getItem('onboarding_likes') || '[]'); } catch(e){}
  onboardingLikes.forEach(id => {
    if (!myRatingsMapped[id]) {
      myRatingsMapped[id] = 4.5;
    }
  });

  // Always load the model to populate score map for badges and recommendations
  loadModel().then(() => {
    state.personalizedRecommendations = getScoreMap(myRatingsMapped);

    if (TMDB_API_KEY) {
      if (Object.keys(myRatingsMapped).length > 0) {
        // We have enough signal to use the ML model
        const sortedIds = getRecommendations(myRatingsMapped, 30);
        if (sortedIds.length > 0) {
          Promise.all(sortedIds.map(id => 
            fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`).then(r => r.json()).catch(() => null)
          )).then(results => {
            let onboardingDislikes = [];
            try { onboardingDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
            const dislikeSet = new Set(onboardingDislikes.map(id => String(id)));
            
            const validMovies = results.filter(m => m && m.id && !m.adult && !dislikeSet.has(String(m.id)));
            
            if (validMovies.length > 0) {
              validMovies.slice(0, 20).forEach(m => rw1.appendChild(buildCard(m.id, m)));
            } else {
              loadDefaultRecs(rw1);
            }
            requestAnimationFrame(() => makeRowInfinite(rw1));
          });
          return;
        }
      }

      // Cold start / Fallback: TMDB Discover based on Watchlist/Onboarding Likes
      const watchlistSeeds = state.watchlist.map(m => m.id);
      const combinedSeeds = [...watchlistSeeds, ...onboardingLikes];

      if (combinedSeeds.length > 0) {
        const seeds = combinedSeeds.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        Promise.all(
          seeds.map(seedId =>
            fetch(`https://api.themoviedb.org/3/movie/${seedId}/recommendations?api_key=${TMDB_API_KEY}`)
              .then(r => r.json())
              .catch(() => ({ results: [] }))
          )
        ).then(allData => {
          const seen = new Set();
          const merged = [];
          const maxLen = Math.max(...allData.map(d => (d.results || []).length));
          for (let i = 0; i < maxLen; i++) {
            allData.forEach(data => {
              const m = (data.results || [])[i];
              if (m && !seen.has(m.id)) { seen.add(m.id); merged.push(m); }
            });
          }

          let onboardingGenres = [];
          let onboardingLanguages = [];
          try { onboardingGenres = JSON.parse(localStorage.getItem('onboarding_genres') || '[]'); } catch(e){}
          try { onboardingLanguages = JSON.parse(localStorage.getItem('onboarding_languages') || '[]'); } catch(e){}

          let onboardingDislikes = [];
          try { onboardingDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
          const dislikeSet = new Set(onboardingDislikes.map(id => String(id)));

          const filtered = merged.filter(m => !dislikeSet.has(String(m.id)));
          let finalRecs = filtered.filter(m => {
            const matchesLang = onboardingLanguages.length === 0 || onboardingLanguages.includes(m.original_language);
            const matchesGenre = onboardingGenres.length === 0 || (m.genre_ids || []).some(gId => onboardingGenres.includes(gId));
            return matchesLang && matchesGenre;
          });

          const scored = finalRecs.map(m => {
            let score = 0;
            const matchingGenresCount = (m.genre_ids || []).filter(gId => onboardingGenres.includes(gId)).length;
            score += matchingGenresCount * 100;
            score += (m.popularity || 0) / 1000;
            return { item: m, score };
          });
          scored.sort((a, b) => b.score - a.score);
          let sortedRecs = scored.map(s => s.item);

          if (sortedRecs.length < 20 && (onboardingLanguages.length > 0 || onboardingGenres.length > 0)) {
            const genreStr = onboardingGenres.join(',');
            const langStr = onboardingLanguages.join('|');
            let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1`;
            if (genreStr) discoverUrl += `&with_genres=${genreStr}`;
            if (langStr) discoverUrl += `&with_original_language=${langStr}`;

            fetch(discoverUrl)
              .then(r => r.json())
              .then(backfillRes => {
                if (backfillRes.results) {
                  backfillRes.results.forEach(m => {
                    if (!seen.has(m.id) && !dislikeSet.has(String(m.id))) {
                      seen.add(m.id);
                      sortedRecs.push(m);
                    }
                  });
                }
                sortedRecs.slice(0, 20).forEach(m => rw1.appendChild(buildCard(m.id, m)));
                requestAnimationFrame(() => makeRowInfinite(rw1));
              })
              .catch(() => {
                const finalSet = sortedRecs.slice(0, 20);
                if (finalSet.length > 0) {
                  finalSet.forEach(m => rw1.appendChild(buildCard(m.id, m)));
                } else {
                  loadDefaultRecs(rw1);
                }
                requestAnimationFrame(() => makeRowInfinite(rw1));
              });
          } else {
            const finalSet = sortedRecs.slice(0, 20);
            if (finalSet.length > 0) {
              finalSet.forEach(m => rw1.appendChild(buildCard(m.id, m)));
            } else {
              loadDefaultRecs(rw1);
            }
            requestAnimationFrame(() => makeRowInfinite(rw1));
          }
        }).catch(() => { loadDefaultRecs(rw1); requestAnimationFrame(() => makeRowInfinite(rw1)); });
      } else {
        loadDefaultRecs(rw1);
      }
    } else {
      // Offline mode
      const sortedIds = getRecommendations(myRatingsMapped, 10);
      if (sortedIds.length === 0) {
        state.personalizedRecommendations = {};
        DEFAULT_RECS.slice(0, Math.ceil(DEFAULT_RECS.length / 2)).forEach(id => {
          rw1.appendChild(buildCard(id));
        });
      } else {
        sortedIds.forEach(id => rw1.appendChild(buildCard(id)));
      }
      requestAnimationFrame(() => makeRowInfinite(rw1));
    }
  });
}

export function loadDefaultRecs(container) {
  let onboardingGenres = [];
  let onboardingLanguages = [];
  try { onboardingGenres = JSON.parse(localStorage.getItem('onboarding_genres') || '[]'); } catch(e){}
  try { onboardingLanguages = JSON.parse(localStorage.getItem('onboarding_languages') || '[]'); } catch(e){}

  const genreStr = onboardingGenres.join(',');
  const langStr = onboardingLanguages.join('|');

  let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1`;
  if (genreStr) url += `&with_genres=${genreStr}`;
  if (langStr) url += `&with_original_language=${langStr}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.results) {
        let currentDislikes = [];
        try { currentDislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]'); } catch(e){}
        const filtered = data.results.filter(m => !currentDislikes.some(id => String(id) === String(m.id)));

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

        finalRecs.slice(0, 15).forEach(m => container.appendChild(buildCard(m.id, m)));
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
    
    // Warm up the trained SVD model in the background
    loadModel();
    
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
  const numericId = parseInt(String(movieId).replace(/\D/g, '')) || 0;
  if (state.personalizedRecommendations && state.personalizedRecommendations[movieId]) {
    return Math.min(99, Math.max(75, Math.round(75 + (state.personalizedRecommendations[movieId] / 5.0) * 24)));
  }
  return 85 + ((numericId * 7) % 15);
}
