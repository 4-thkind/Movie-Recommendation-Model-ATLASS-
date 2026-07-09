/* ─── ATLASS HYBRID RECOMMENDER ───────────────────────────────────────────────
   Stage 1 — Collaborative filter (SVD, k=32) trained on MovieLens 100k ratings
   Stage 2 — Content model (TF-IDF+LSA, dim=48) trained on Wikipedia plot text
   Blended at score time: α×SVD + (1-α)×content_similarity
   Fully client-side — no backend, no retraining at runtime.
   ─────────────────────────────────────────────────────────────────────────── */

const ALPHA = 0.70;   // 70% collaborative, 30% content — tune freely

let svdModel     = null;
let contentModel = null;
let loadPromise  = null;

export function loadModel() {
  if (svdModel && contentModel) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    fetch('data/model.json').then(r => r.json()),
    fetch('data/content_model.json').then(r => r.json())
  ]).then(([svd, content]) => {
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

    // collaborative score
    let svdScore = uvec ? dot(svdModel.factors[i], uvec) : 0;

    // content score (cosine sim against user profile)
    let cScore = 0;
    if (profile && contentModel.vectors[String(mid)]) {
      cScore = dot(contentModel.vectors[String(mid)], profile);
    }

    // blend
    const final = ALPHA * svdScore + (1 - ALPHA) * cScore;
    scores.push([mid, final]);
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
