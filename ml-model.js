/* ─── ATLASS HYBRID RECOMMENDER ───────────────────────────────────────────────
   Stage 1 — Collaborative filter (SVD, k=32) trained on MovieLens 100k ratings
   Stage 2 — Content model (TF-IDF+LSA, dim=48) trained on Wikipedia plot text
   Blended at score time: α×SVD + (1-α)×content_similarity
   Fully client-side — no backend, no retraining at runtime.

   Enhanced: Loads links.csv + movies.csv at init to enable TMDB↔MovieLens
   mapping and genre-filtered ML recommendations across all home sections.
   ─────────────────────────────────────────────────────────────────────────── */

const ALPHA = 0.70;   // 70% collaborative, 30% content — tune freely

let svdModel     = null;
let contentModel = null;
let loadPromise  = null;

// ── ID Bridge: MovieLens ↔ TMDB ────────────────────────────────────────────
// Populated from links.csv at load time.
let mlToTmdb     = new Map();   // MovieLens movieId → TMDB id
let tmdbToMl     = new Map();   // TMDB id → MovieLens movieId

// ── Genre Index: MovieLens movieId → genre set ─────────────────────────────
// Populated from movies.csv at load time.
let movieGenres  = new Map();   // movieId → Set<string>  e.g. {"Action","Comedy"}

export function isModelLoaded() {
  return !!(svdModel && contentModel);
}

/* ── CSV micro-parser (handles quoted fields) ───────────────────────────── */
function _parseCSVLines(text) {
  const lines = text.split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { insideQuote = !insideQuote; }
      else if (ch === ',' && !insideQuote) { row.push(entry.trim()); entry = ''; }
      else { entry += ch; }
    }
    row.push(entry.trim());
    rows.push(row);
  }
  return rows;
}

export function loadModel() {
  if (svdModel && contentModel) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    fetch('data/model.json').then(r => r.json()),
    fetch('data/content_model.json').then(r => r.json()),
    fetch('data/ml-latest-small/links.csv').then(r => r.text()).catch(() => ''),
    fetch('data/ml-latest-small/movies.csv').then(r => r.text()).catch(() => '')
  ]).then(([svd, content, linksCSV, moviesCSV]) => {
    svdModel = {
      k:          svd.k,
      globalMean: svd.global_mean,
      movieIds:   svd.movie_ids,
      idxOf:      new Map(svd.movie_ids.map((id, i) => [id, i])),
      factors:    svd.item_factors,   // n_items × k
      popularity: svd.popularity      // movieId(str) -> bayesian avg
    };
    contentModel = {
      dim:     content.dim,
      movieIds: content.movie_ids,
      vectors: content.vectors        // movieId(str) -> dim-vector
    };

    // ── Build MovieLens ↔ TMDB bridge from links.csv ─────────────────────
    if (linksCSV) {
      const linkRows = _parseCSVLines(linksCSV);
      linkRows.forEach(row => {
        if (row.length < 3) return;
        const mlId   = parseInt(row[0]);
        const tmdbId = parseInt(row[2]);
        if (!isNaN(mlId) && !isNaN(tmdbId)) {
          mlToTmdb.set(mlId, tmdbId);
          tmdbToMl.set(tmdbId, mlId);
        }
      });
      console.log(`[ML-MODEL] Links loaded: ${mlToTmdb.size} MovieLens↔TMDB mappings`);
    }

    // ── Build genre index from movies.csv ────────────────────────────────
    if (moviesCSV) {
      const movieRows = _parseCSVLines(moviesCSV);
      movieRows.forEach(row => {
        if (row.length < 3) return;
        const mlId = parseInt(row[0]);
        const genres = row[row.length - 1];  // last column is genres
        if (!isNaN(mlId) && genres && genres !== '(no genres listed)') {
          movieGenres.set(mlId, new Set(genres.split('|').map(g => g.trim())));
        }
      });
      console.log(`[ML-MODEL] Genres loaded: ${movieGenres.size} movies with genre data`);
    }
  });
  return loadPromise;
}

/* ── SVD fold-in: project user ratings into latent space ───────────────────── */
function foldIn(userRatings) {
  const { factors, idxOf, globalMean, k } = svdModel;
  const vec = new Array(k).fill(0);
  let wsum  = 0;

  for (const [midStr, rating] of Object.entries(userRatings)) {
    const mid = parseInt(midStr);
    const idx = idxOf.get(mid);
    if (idx === undefined) continue;
    const dev = rating - globalMean;
    const w   = Math.abs(dev) + 1e-6;
    const row = factors[idx];
    for (let d = 0; d < k; d++) vec[d] += row[d] * dev;
    wsum += w;
  }
  return wsum === 0 ? null : vec.map(v => v / wsum);
}

/* ── Content profile: average content vector of liked movies ───────────────── */
function buildContentProfile(userRatings) {
  const { vectors, dim } = contentModel;
  const profile = new Array(dim).fill(0);
  let   count   = 0;

  for (const [midStr, rating] of Object.entries(userRatings)) {
    if (rating < 3.5) continue;       // only positive signals
    const vec = vectors[midStr];
    if (!vec) continue;
    for (let d = 0; d < dim; d++) profile[d] += vec[d];
    count++;
  }
  if (count === 0) return null;
  const norm = Math.hypot(...profile) || 1;
  return profile.map(v => v / norm);
}

/* ── Dot product helper ─────────────────────────────────────────────────────── */
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/* ── Internal: compute raw ML score for a single MovieLens ID ──────────────── */
function _scoreOne(mlId, uvec, profile) {
  const idx = svdModel.idxOf.get(mlId);
  if (idx === undefined) return null;

  let svdScore = uvec ? dot(svdModel.factors[idx], uvec) : 0;
  let cScore   = 0;
  if (profile && contentModel.vectors[String(mlId)]) {
    cScore = dot(contentModel.vectors[String(mlId)], profile);
  }
  return ALPHA * svdScore + (1 - ALPHA) * cScore;
}

/* ── Main: returns top-N recommended movieIds ────────────────────────────────
   userRatings: { movieId: rating (1-5) }                                      */
export function getRecommendations(userRatings, topN = 10) {
  if (!svdModel) return [];
  const ratedIds = new Set(Object.keys(userRatings).map(Number));

  // Cold start — no ratings yet
  if (Object.keys(userRatings).length === 0) {
    return Object.entries(svdModel.popularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([mid]) => parseInt(mid));
  }

  const uvec    = foldIn(userRatings);
  const profile = buildContentProfile(userRatings);   // may be null

  const scores = [];
  for (let i = 0; i < svdModel.factors.length; i++) {
    const mid = svdModel.movieIds[i];
    if (ratedIds.has(mid)) continue;

    const final = _scoreOne(mid, uvec, profile);
    if (final !== null) scores.push([mid, final]);
  }

  scores.sort((a, b) => b[1] - a[1]);
  return scores.slice(0, topN).map(([mid]) => mid);
}

/* ── Score map: all movieId->score, used for match-% badges etc. ───────────── */
export function getScoreMap(userRatings) {
  if (!svdModel) return {};
  const ratedIds = new Set(Object.keys(userRatings).map(Number));
  const uvec     = foldIn(userRatings);
  const profile  = buildContentProfile(userRatings);
  const out      = {};

  for (let i = 0; i < svdModel.factors.length; i++) {
    const mid = svdModel.movieIds[i];
    if (ratedIds.has(mid)) continue;
    let svdScore = uvec ? dot(svdModel.factors[i], uvec) : 0;
    let cScore   = 0;
    if (profile && contentModel.vectors[String(mid)]) {
      cScore = dot(contentModel.vectors[String(mid)], profile);
    }
    out[mid] = ALPHA * svdScore + (1 - ALPHA) * cScore;
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NEW: TMDB-FACING ML API — used by renderHomeSections to re-rank every row
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Build user ratings from onboarding signals ────────────────────────────────
   Converts onboarding likes/dislikes (TMDB IDs) into MovieLens-compatible
   user ratings that the SVD model can fold-in.                                 */
export function buildUserRatingsFromOnboarding() {
  const ratings = {};

  // Explicit user ratings (if any)
  try {
    const saved = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    for (const [mid, r] of Object.entries(saved)) {
      ratings[parseInt(mid)] = parseFloat(r);
    }
  } catch(e) {}

  // Onboarding likes → treat as 5-star ratings (mapped from TMDB→ML)
  try {
    const likes = JSON.parse(localStorage.getItem('onboarding_likes') || '[]');
    likes.forEach(tmdbId => {
      const mlId = tmdbToMl.get(Number(tmdbId));
      if (mlId && !ratings[mlId]) ratings[mlId] = 5.0;
    });
  } catch(e) {}

  // Onboarding dislikes → treat as 1-star ratings
  try {
    const dislikes = JSON.parse(localStorage.getItem('onboarding_dislikes') || '[]');
    dislikes.forEach(tmdbId => {
      const mlId = tmdbToMl.get(Number(tmdbId));
      if (mlId && !ratings[mlId]) ratings[mlId] = 1.0;
    });
  } catch(e) {}

  // Watchlist items → treat as 4-star (interested but not rated)
  try {
    const wl = JSON.parse(localStorage.getItem('user_watchlist') || '[]');
    wl.forEach(item => {
      const id = item.id || item;
      const mlId = tmdbToMl.get(Number(id));
      if (mlId && !ratings[mlId]) ratings[mlId] = 4.0;
    });
  } catch(e) {}

  return ratings;
}

/* ── Prepare user vectors for batch scoring ────────────────────────────────── */
export function prepareUserVectors(userRatings) {
  if (!svdModel || Object.keys(userRatings).length === 0) return { uvec: null, profile: null };
  return {
    uvec:    foldIn(userRatings),
    profile: buildContentProfile(userRatings)
  };
}

/* ── Get ML score for a TMDB movie ID ──────────────────────────────────────── */
export function scoreTmdbId(tmdbId, uvec, profile) {
  if (!svdModel) return null;
  const mlId = tmdbToMl.get(Number(tmdbId));
  if (mlId === undefined) return null;
  return _scoreOne(mlId, uvec, profile);
}

/* ── Re-rank an array of TMDB movie objects using ML scores ────────────────────
   items:   Array of TMDB movie objects (must have .id field = TMDB ID)
   uvec:    User latent vector (from prepareUserVectors)
   profile: User content profile (from prepareUserVectors)
   Returns: same array, sorted by ML score (highest first).
            Items not in the ML model are pushed to the end.              */
export function rerankByML(items, uvec, profile) {
  if (!svdModel || (!uvec && !profile) || items.length === 0) return items;

  const scored = items.map(item => {
    const mlScore = scoreTmdbId(item.id, uvec, profile);
    return { item, mlScore };
  });

  // Items with ML scores sort by score desc; items without → end (sorted by original position)
  scored.sort((a, b) => {
    if (a.mlScore !== null && b.mlScore !== null) return b.mlScore - a.mlScore;
    if (a.mlScore !== null) return -1;
    if (b.mlScore !== null) return 1;
    return 0;  // preserve original order for unmapped items
  });

  return scored.map(s => s.item);
}

/* ── Get ML-recommended movies filtered by genre ──────────────────────────────
   Returns top-N MovieLens movie IDs that match the given genre string
   (e.g. "Action", "Comedy") and returns their TMDB IDs.
   Used as a "pure ML" supplement when TMDB results are thin.            */
export function getRecommendationsByGenre(userRatings, genreFilter, topN = 20) {
  if (!svdModel) return [];
  const ratedIds = new Set(Object.keys(userRatings).map(Number));
  const uvec     = foldIn(userRatings);
  const profile  = buildContentProfile(userRatings);

  const scores = [];
  for (let i = 0; i < svdModel.factors.length; i++) {
    const mid = svdModel.movieIds[i];
    if (ratedIds.has(mid)) continue;

    // Genre filter: skip movies that don't match
    const genres = movieGenres.get(mid);
    if (!genres || !genres.has(genreFilter)) continue;

    const score = _scoreOne(mid, uvec, profile);
    if (score !== null) {
      const tmdbId = mlToTmdb.get(mid);
      if (tmdbId) scores.push({ tmdbId, mlId: mid, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topN);
}

/* ── Get TMDB→ML mapping info (for diagnostics) ───────────────────────────── */
export function getMappingStats() {
  return {
    mlToTmdbSize: mlToTmdb.size,
    tmdbToMlSize: tmdbToMl.size,
    genreCount:   movieGenres.size,
    modelLoaded:  !!(svdModel && contentModel)
  };
}

/* ── Get Plot Similar Movies using NLP Content Vectors ────────────────────── */
export function getPlotSimilarMovies(tmdbId, topN = 30) {
  if (!contentModel || !tmdbToMl) return [];
  const seedMlId = tmdbToMl.get(Number(tmdbId));
  if (seedMlId === undefined) return [];
  
  const seedVec = contentModel.vectors[String(seedMlId)];
  if (!seedVec) return [];

  const scores = [];
  for (let i = 0; i < contentModel.movieIds.length; i++) {
    const mid = contentModel.movieIds[i];
    if (mid === seedMlId) continue;
    const vec = contentModel.vectors[String(mid)];
    if (!vec) continue;
    
    let dotProd = 0;
    let magA = 0;
    let magB = 0;
    for (let d = 0; d < contentModel.dim; d++) {
      dotProd += seedVec[d] * vec[d];
      magA += seedVec[d] * seedVec[d];
      magB += vec[d] * vec[d];
    }
    const cosSim = (magA && magB) ? (dotProd / (Math.sqrt(magA) * Math.sqrt(magB))) : 0;
    
    if (cosSim > 0.1) {
      const candTmdbId = mlToTmdb.get(mid);
      if (candTmdbId) scores.push({ tmdbId: candTmdbId, score: cosSim });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topN).map(s => ({ id: s.tmdbId, media_type: 'movie', plotScore: s.score }));
}
