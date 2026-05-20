/* ─── FETCH TMDB DETAILS (WITH CACHING & FALLBACK) ─── */
async function fetchTMDBDetails(movieId) {
  if (tmdbCache[movieId]) return tmdbCache[movieId];
  
  // If database is not loaded, map from fallbacks if matching id
  if (!movieLensData.loaded) {
    const fallback = MOVIES.find(m => m.id === movieId);
    if (fallback) return fallback;
    return {
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
      cast: [{name: "Cast N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}]
    };
  }
  
  const movie = movieLensData.movies[movieId];
  if (!movie) return null;
  
  const cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
  const year = movie.title.match(/\((\d{4})\)$/)?.[1] || 'N/A';
  const genresList = movie.genres.replace(/\|/g, ' · ');
  
  const apiKey = localStorage.getItem('tmdb_api_key');
  if (!apiKey || !movie.tmdbId) {
    // Return custom placeholder with real MovieLens values
    const fallbackMock = {
      id: movieId,
      title: cleanTitle,
      year: year,
      match: calculateMatchScore(movieId),
      rating: (6.5 + ((movieId * 3) % 25) / 10).toFixed(1),
      runtime: `${1 + ((movieId * 2) % 2)}h ${10 + ((movieId * 11) % 45)}m`,
      genre: genresList,
      synopsis: `Synopsis for ${cleanTitle}. Connect CineMatch with your TMDb API Key (gear icon in the top right) to fetch rich metadata, real posters, trailers, and cast profiles from TMDb!`,
      poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
      backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
      platforms: ["Netflix", "Prime Video", "Apple TV+"].slice(0, 1 + (movieId % 3)),
      reasons: genresList.split('·').slice(0, 3).map(g => g.trim()),
      cast: [{name: "Director", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}]
    };
    tmdbCache[movieId] = fallbackMock;
    return fallbackMock;
  }
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`);
    if (!res.ok) throw new Error("TMDB network error");
    const data = await res.json();
    
    const mapped = {
      id: movieId,
      title: data.title,
      year: data.release_date ? data.release_date.split('-')[0] : year,
      match: calculateMatchScore(movieId),
      rating: data.vote_average ? data.vote_average.toFixed(1) : '7.0',
      runtime: data.runtime ? `${Math.floor(data.runtime/60)}h ${data.runtime%60}m` : 'N/A',
      genre: data.genres ? data.genres.map(g => g.name).join(' · ') : genresList,
      synopsis: data.overview || 'No synopsis available.',
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85',
      platforms: ["Max", "Netflix", "Prime Video", "Apple TV+"].slice(0, 1 + (data.id % 3)),
      reasons: data.genres ? data.genres.map(g => g.name).slice(0, 3) : ['Highly Rated'],
      cast: data.credits && data.credits.cast ? data.credits.cast.slice(0, 3).map(c => ({
        name: c.name,
        img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
      })) : []
    };
    
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) {
        mapped.trailerKey = trailer.key;
      }
    }
    
    tmdbCache[movieId] = mapped;
    return mapped;
  } catch (err) {
    console.error("TMDB error:", err);
    return null;
  }
}

/* ─── RENDER MOVIES CARD ─── */
function buildCard(movieId) {
  const wrap = document.createElement('div');
  wrap.className = 'movie-card';
  wrap.dataset.id = movieId;
  
  let cleanTitle = "Loading...";
  let year = "";
  let genresList = "";
  
  if (movieLensData.loaded) {
    const movie = movieLensData.movies[movieId];
    if (movie) {
      cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
      year = movie.title.match(/\((\d{4})\)$/)?.[1] || '';
      genresList = movie.genres.replace(/\|/g, ' · ');
    }
  } else {
    const fallback = MOVIES.find(m => m.id === movieId);
    if (fallback) {
      cleanTitle = fallback.title;
      year = fallback.year;
      genresList = fallback.genre;
    }
  }
  
  const match = calculateMatchScore(movieId);
  
  wrap.innerHTML = `
    <div class="card-inner">
      <div class="card-poster">
        <img class="lazy-poster" src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" alt="${cleanTitle}" style="opacity: 0.35; transition: opacity 0.5s var(--smooth)"/>
        <div class="m-badge">${match}%</div>
        <button class="card-add" title="Add to watchlist" data-id="${movieId}">
          <i class="fa-solid fa-plus"></i>
        </button>
        <div class="card-poster-fade"></div>
      </div>
      <div class="card-info">
        <div>
          <div class="ci-title">${cleanTitle}</div>
          <div class="ci-meta">
            <span class="ci-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ...</span>
            <span>·</span><span>${year}</span>
          </div>
          <div class="ci-synopsis">Loading overview...</div>
          <div class="ci-tags">
            ${genresList.split('·').slice(0, 2).map(g=>`<span class="ci-tag">${g.trim()}</span>`).join('')}
          </div>
        </div>
        <div class="ci-btns">
          <button class="ci-btn play" data-open="${movieId}">
            <i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details
          </button>
          <button class="ci-btn wl" data-add="${movieId}">
            <i class="fa-solid fa-plus" style="font-size:9px"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  fetchTMDBDetails(movieId).then(details => {
    if (!details) return;
    const img = wrap.querySelector('.lazy-poster');
    if (img) {
      img.src = details.poster;
      img.style.opacity = 1;
    }
    const ratingEl = wrap.querySelector('.ci-rating');
    if (ratingEl) {
      ratingEl.innerHTML = `<i class="fa-solid fa-star" style="font-size:9px"></i> ${details.rating}`;
    }
    const synEl = wrap.querySelector('.ci-synopsis');
    if (synEl) {
      synEl.textContent = details.synopsis;
    }
    
    // Clicking anywhere on the card opens the details modal
    wrap.addEventListener('click', () => {
      openModal(details);
    });

    // Watchlist add buttons stop propagation so they don't open the modal
    wrap.querySelector('.card-add').addEventListener('click', e => {
      e.stopPropagation();
      addToWatchlist(details, wrap.querySelector('.card-add'));
    });
    wrap.querySelector('[data-add]').addEventListener('click', e => {
      e.stopPropagation();
      addToWatchlist(details, wrap.querySelector('[data-add]'));
    });

    // Allow the Details button to explicitly trigger it and stop propagation
    wrap.querySelector('[data-open]').addEventListener('click', e => {
      e.stopPropagation();
      openModal(details);
    });
  });
  
  return wrap;
}

/* ─── RENDER TRENDING GRID ─── */
function buildTrending() {
  const grid = document.getElementById('trending-grid');
  grid.innerHTML = '';
  
  const trendingIds = [1, 296, 318, 356, 593, 260, 2571, 480];
  
  const apiKey = localStorage.getItem('tmdb_api_key');
  if (apiKey && movieLensData.loaded) {
    fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (!data.results || data.results.length === 0) throw new Error("No trending results");
        const items = [];
        data.results.slice(0, 8).forEach(tmdbMovie => {
          const mlMovie = Object.values(movieLensData.movies).find(m => m.tmdbId == tmdbMovie.id);
          if (mlMovie) {
            items.push(mlMovie.movieId);
          }
        });
        if (items.length > 0) {
          renderTrendingGrid(items);
        } else {
          renderTrendingGrid(trendingIds);
        }
      })
      .catch(err => {
        console.warn("Could not fetch TMDB trending, falling back:", err);
        renderTrendingGrid(trendingIds);
      });
  } else {
    renderTrendingGrid(trendingIds);
  }
}

function renderTrendingGrid(ids) {
  const grid = document.getElementById('trending-grid');
  grid.innerHTML = '';
  
  ids.forEach((movieId, i) => {
    let cleanTitle = `MovieLens #${movieId}`;
    if (movieLensData.loaded) {
      const movie = movieLensData.movies[movieId];
      if (movie) cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
    } else {
      const fallback = MOVIES.find(m => m.id === movieId);
      if (fallback) cleanTitle = fallback.title;
    }
    
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.innerHTML = `
      <img class="lazy-poster" src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" alt="${cleanTitle}" style="opacity: 0.35; transition: opacity 0.5s var(--smooth)"/>
      <div class="trend-num">${i + 1}</div>
      ${i < 3 ? `<div class="trend-badge"><i class="fa-solid fa-fire" style="font-size:9px"></i> Hot</div>` : ''}
      <div class="trend-overlay"></div>
      <div class="trend-info">
        <div class="trend-title">${cleanTitle}</div>
        <div class="trend-meta">
          <span class="trend-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ...</span>
        </div>
        <div class="trend-btns">
          <button class="trend-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
          <button class="trend-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i></button>
        </div>
      </div>
    `;
    
    fetchTMDBDetails(movieId).then(details => {
      if (!details) return;
      const img = card.querySelector('.lazy-poster');
      if (img) {
        img.src = details.poster;
        img.style.opacity = 1;
      }
      const ratingEl = card.querySelector('.trend-rating');
      if (ratingEl) {
        ratingEl.innerHTML = `<i class="fa-solid fa-star" style="font-size:9px"></i> ${details.rating} · ${details.year}`;
      }
      
      card.querySelector('.trend-btn.play').addEventListener('click', e => { e.stopPropagation(); openModal(details); });
      card.querySelector('.trend-btn.add').addEventListener('click', e => { e.stopPropagation(); addToWatchlist(details, card.querySelector('.trend-btn.add')); });
      card.querySelector('img').addEventListener('click', () => openModal(details));
    });
    grid.appendChild(card);
  });
}

/* ─── SCROLL ROWS ─── */
function renderRows() {
  const rw1 = document.getElementById('rw1');
  const rw2 = document.getElementById('rw2');
  
  rw1.innerHTML = '';
  rw2.innerHTML = '';
  
  if (movieLensData.loaded) {
    initializeRecommender();
    
    const becauseYouWatchedIds = [109487, 79132, 104313, 164179, 134853, 924, 1584];
    becauseYouWatchedIds.forEach(id => {
      rw2.appendChild(buildCard(id));
    });
  } else {
    MOVIES.slice(0, 9).forEach(m => rw1.appendChild(buildCard(m.id)));
    [MOVIES[6], MOVIES[7], MOVIES[8], MOVIES[10], MOVIES[3], MOVIES[4], MOVIES[5]].forEach(m => rw2.appendChild(buildCard(m.id)));
  }
}

function scrollRow(id, dir) {
  document.getElementById(id).scrollBy({ left: dir * 540, behavior: 'smooth' });
}

/* ─── WATCHLIST ─── */
function addToWatchlist(movie, triggerEl) {
  if (watchlist.find(m => m.id === movie.id)) return;
  watchlist.push(movie);
  updateWatchlistUI();
  updateWLCount();

  const badge = document.getElementById('wl-count');
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 450);

  if (triggerEl) {
    triggerEl.classList.add('added');
    triggerEl.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => {
      triggerEl.classList.remove('added');
      triggerEl.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }, 1600);
  }
}

function removeFromWatchlist(id) {
  watchlist = watchlist.filter(m => m.id !== id);
  updateWatchlistUI();
  updateWLCount();
}

function updateWLCount() {
  document.getElementById('wl-count').textContent = watchlist.length;
}

function updateWatchlistUI() {
  const strip = document.getElementById('wl-strip');
  const empty = document.getElementById('wl-empty');
  const spinBtn = document.getElementById('spin-btn');
  const drumInner = document.getElementById('drum-inner');

  strip.querySelectorAll('.wl-item').forEach(el => el.remove());

  if (watchlist.length === 0) {
    empty.style.display = 'flex';
    spinBtn.disabled = true;
    drumInner.innerHTML = '';
    resetWinner();
    return;
  }
  empty.style.display = 'none';
  spinBtn.disabled = false;

  watchlist.forEach(movie => {
    const item = document.createElement('div');
    item.className = 'wl-item';
    item.dataset.id = movie.id;
    item.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}" title="${movie.title}"/>
      <div class="wl-remove" onclick="removeFromWatchlist(${movie.id})">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;
    item.querySelector('img').addEventListener('click', () => openModal(movie));
    strip.appendChild(item);
  });

  buildDrum();
  resetWinner();
}

/* ─── DRUM ─── */
function buildDrum() {
  const inner = document.getElementById('drum-inner');
  inner.innerHTML = '';
  const repeated = [];
  while (repeated.length < Math.max(watchlist.length * 4, 20)) repeated.push(...watchlist);
  repeated.forEach(m => {
    const card = document.createElement('div');
    card.className = 'drum-card';
    card.innerHTML = `<img src="${m.poster}" alt="${m.title}" loading="lazy"/>`;
    card.dataset.id = m.id;
    inner.appendChild(card);
  });
}

/* ─── SPIN ─── */
function spinRoulette() {
  if (spinLock || watchlist.length === 0) return;
  spinLock = true;
  resetWinner();

  const btn = document.getElementById('spin-btn');
  const inner = document.getElementById('drum-inner');
  btn.disabled = true;
  btn.classList.add('spinning');

  const winnerIdx = Math.floor(Math.random() * watchlist.length);
  const winner = watchlist[winnerIdx];

  inner.style.transition = 'none';
  inner.style.transform = 'translateX(0)';
  buildDrum();

  const CARD_W = 112 + 10;
  const cards = inner.querySelectorAll('.drum-card');
  const totalCards = cards.length;

  let targetCardIdx = -1;
  const searchStart = Math.floor(totalCards * 0.55);
  for (let i = searchStart; i < totalCards; i++) {
    if (parseInt(cards[i].dataset.id) === winner.id) { targetCardIdx = i; break; }
  }
  if (targetCardIdx === -1) targetCardIdx = searchStart;

  const wrapW = document.getElementById('drum-wrap').offsetWidth;
  const targetX = -(targetCardIdx * CARD_W - wrapW / 2 + CARD_W / 2);
  const overshoot = targetX - CARD_W * 5;

  requestAnimationFrame(() => {
    inner.style.transition = 'transform 2.6s cubic-bezier(.12,.7,.18,1)';
    inner.style.transform = `translateX(${overshoot}px)`;
  });

  setTimeout(() => {
    inner.style.transition = 'transform 0.85s cubic-bezier(.34,1.1,.64,1)';
    inner.style.transform = `translateX(${targetX}px)`;
  }, 2620);

  setTimeout(() => {
    inner.querySelectorAll('.drum-card').forEach((c, i) => {
      if (i === targetCardIdx) c.classList.add('winner');
    });
    showWinner(winner);
    btn.disabled = false;
    btn.classList.remove('spinning');
    spinLock = false;
    confettiBurst();
  }, 3580);
}

function showWinner(movie) {
  const rev = document.getElementById('winner-reveal');
  document.getElementById('winner-name').textContent = movie.title;
  document.getElementById('winner-meta').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
  document.getElementById('winner-open').onclick = () => openModal(movie);
  rev.classList.add('show');
}

function resetWinner() {
  document.getElementById('winner-reveal').classList.remove('show');
  document.getElementById('drum-inner').querySelectorAll('.drum-card').forEach(c => c.classList.remove('winner'));
}

/* ─── CONFETTI ─── */
function confettiBurst() {
  const colors = ['#f5c518','#7c3aed','#a78bfa','#fbbf24','#f472b6'];
  for (let i = 0; i < 36; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = `
      left:${Math.random()*100}vw;top:${38+Math.random()*22}vh;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1.3+Math.random()*.7}s;
      transform:rotate(${Math.random()*360}deg);
      width:${5+Math.random()*9}px;height:${5+Math.random()*9}px;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 2500);
  }
}

/* ─── SURPRISE ME ─── */
let lastSurprise = -1;
function surpriseMe() {
  const orb = document.getElementById('surprise-btn');
  const result = document.getElementById('surprise-result');
  orb.style.transform = 'scale(0.86)';
  setTimeout(() => { orb.style.transform = ''; }, 200);

  let movieId;
  if (movieLensData.loaded) {
    const movieIds = Object.keys(movieLensData.movies);
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

  result.classList.remove('show');
  fetchTMDBDetails(movieId).then(movie => {
    if (!movie) return;
    setTimeout(() => {
      document.getElementById('s-img').src = movie.poster;
      document.getElementById('s-title').textContent = movie.title;
      document.getElementById('s-sub').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
      document.getElementById('s-synopsis').textContent = movie.synopsis.slice(0, 115) + '…';
      document.getElementById('s-modal-btn').onclick = () => openModal(movie);
      document.getElementById('s-add-btn').onclick = () => addToWatchlist(movie, document.getElementById('s-add-btn'));
      result.classList.add('show');
    }, 220);
  });
}

/* ─── STAR RATING LOGIC ─── */
function highlightStars(rating) {
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
function openModal(movie) {
  currentModalMovie = movie;
  document.getElementById('m-backdrop').src = movie.backdrop;
  document.getElementById('m-poster').src = movie.poster;
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

  document.getElementById('m-cast').innerHTML = movie.cast.map(c => `
    <div class="m-cast-person">
      <img src="${c.img}" alt="${c.name}"/>
      <span>${c.name}</span>
    </div>
  `).join('');

  if (movieLensData.loaded) {
    const list = Object.values(movieLensData.movies)
      .filter(m => m.movieId !== movie.id && m.genres.split('|').some(g => movie.genre.includes(g)))
      .slice(0, 8);
    
    document.getElementById('m-similar').innerHTML = list.map(m => `
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
        if (el) el.onclick = () => openModal(details);
      });
    });
  } else {
    document.getElementById('m-similar').innerHTML = MOVIES
      .filter(m => m.id !== movie.id).slice(0,8).map(m => `
        <div class="mini" onclick="openModal(MOVIES.find(x=>x.id===${m.id}))">
          <img src="${m.poster}" alt="${m.title}" loading="lazy"/>
          <div class="mini-title">${m.title}</div>
        </div>
      `).join('');
  }

  // Set user stars
  const userRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
  const myRating = userRatings[movie.id] || 0;
  highlightStars(myRating);
  
  const starsContainer = document.querySelector('.user-stars');
  starsContainer.onmouseleave = () => {
    const currentRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    highlightStars(currentRatings[movie.id] || 0);
  };
  
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
      if (movieLensData.loaded) {
        initializeRecommender();
        if (typeof initHero === 'function') initHero();
      }
    };
  });

  // Play Trailer Config
  const playBtn = document.getElementById('m-play-btn');
  const videoContainer = document.getElementById('m-video-container');
  const videoIframe = document.getElementById('m-video-iframe');
  videoContainer.style.display = 'none';
  videoIframe.src = '';
  
  if (movie.trailerKey) {
    playBtn.style.display = 'inline-flex';
    playBtn.onclick = () => {
      videoIframe.src = `https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`;
      videoContainer.style.display = 'block';
      videoContainer.scrollIntoView({ behavior: 'smooth' });
    };
  } else {
    playBtn.style.display = 'none';
  }

  const wlBtnNew = document.getElementById('m-add-wl-new');
  const alreadyIn = watchlist.find(x => x.id === movie.id);
  
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
    if (!watchlist.find(x => x.id === movie.id)) {
      addToWatchlist(movie, null);
      updateWatchlistButton(true);
    }
  };

  document.getElementById('overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('overlay').classList.remove('on');
  document.getElementById('m-video-iframe').src = '';
  document.body.style.overflow = '';
}

function handleOverlay(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─── SETTINGS MODAL ─── */
function openSettingsModal() {
  document.getElementById('tmdb-key-input').value = localStorage.getItem('tmdb_api_key') || '';
  document.getElementById('settings-overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
  document.getElementById('settings-overlay').classList.remove('on');
  if (!document.getElementById('overlay').classList.contains('on')) {
    document.body.style.overflow = '';
  }
}

function handleSettingsOverlay(e) {
  if (e.target === document.getElementById('settings-overlay')) closeSettingsModal();
}

function saveSettings() {
  const key = document.getElementById('tmdb-key-input').value.trim();
  if (key) {
    localStorage.setItem('tmdb_api_key', key);
  } else {
    localStorage.removeItem('tmdb_api_key');
  }
  closeSettingsModal();
  
  // Refresh data with new key
  tmdbCache = {};
  buildTrending();
  renderRows();
}

function updateDatabaseStatus(type, status) {
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

/* ─── SCROLL TO WATCHLIST ─── */
function scrollToWatchlist() {
  document.getElementById('watchlist-section').scrollIntoView({ behavior: 'smooth' });
}

/* ─── NAVBAR SCROLL ─── */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('solid', window.scrollY > 60);
}, { passive: true });

/* ─── INTERSECTION OBSERVER ─── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.07 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ─── REALTIME SEARCH ─── */
function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-section').style.display = 'none';
}

document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  const searchSec = document.getElementById('search-section');
  const searchResults = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  
  if (!q) {
    searchSec.style.display = 'none';
    return;
  }
  
  if (!movieLensData.loaded) {
    searchResults.innerHTML = '';
    const matches = MOVIES.filter(m => m.title.toLowerCase().includes(q));
    countEl.textContent = `${matches.length} found`;
    if (matches.length === 0) {
      searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
    } else {
      matches.forEach(m => {
        searchResults.appendChild(buildCard(m.id));
      });
    }
    searchSec.style.display = 'block';
    return;
  }
  
  const matches = Object.values(movieLensData.movies)
    .filter(m => m.title.toLowerCase().includes(q))
    .slice(0, 15);
    
  searchResults.innerHTML = '';
  countEl.textContent = `${matches.length} found`;
  
  if (matches.length === 0) {
    searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
  } else {
    matches.forEach(m => {
      searchResults.appendChild(buildCard(m.movieId));
    });
  }
  
  searchSec.style.display = 'block';
});

/* ─── DYNAMIC HERO SECTION ─── */
function updateHeroUI(movie) {
  if (!movie) return;
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  const heroImg = heroSection.querySelector('.hero-img');
  if (heroImg) {
    heroImg.style.backgroundImage = `url('${movie.backdrop}')`;
  }
  
  const chip = heroSection.querySelector('.match-chip');
  if (chip) {
    chip.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:10px"></i> ${movie.match}% Match For You`;
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
  
  // Set button actions
  const playBtn = heroSection.querySelector('.btn-primary');
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
  
  const infoBtn = heroSection.querySelector('.btn-secondary');
  if (infoBtn) {
    infoBtn.onclick = () => openModal(movie);
  }
  
  const wlBtn = heroSection.querySelector('.btn-icon');
  if (wlBtn) {
    const updateWLIcon = () => {
      const isAdded = watchlist.some(m => m.id === movie.id);
      wlBtn.innerHTML = isAdded ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
      wlBtn.title = isAdded ? 'In watchlist' : 'Add to watchlist';
    };
    updateWLIcon();
    wlBtn.onclick = () => {
      if (!watchlist.some(m => m.id === movie.id)) {
        addToWatchlist(movie, wlBtn);
      }
    };
  }
}

async function initHero() {
  let heroMovie = null;
  const apiKey = localStorage.getItem('tmdb_api_key');
  
  if (movieLensData.loaded) {
    const myRatings = JSON.parse(localStorage.getItem('user_movie_ratings') || '{}');
    if (Object.keys(myRatings).length > 0 && typeof personalizedRecommendations === 'object') {
      const sortedIds = Object.entries(personalizedRecommendations)
        .sort((a, b) => b[1] - a[1])
        .map(entry => parseInt(entry[0]));
      if (sortedIds.length > 0) {
        const candidates = sortedIds.slice(0, 3);
        const randomId = candidates[Math.floor(Math.random() * candidates.length)];
        heroMovie = await fetchTMDBDetails(randomId);
      }
    }
    
    if (!heroMovie) {
      const defaultRecs = [318, 858, 296, 527, 593, 2571, 50, 1198, 2858, 47];
      const randomId = defaultRecs[Math.floor(Math.random() * defaultRecs.length)];
      heroMovie = await fetchTMDBDetails(randomId);
    }
  } else {
    const fallbackIds = [1, 2, 3, 5, 7, 8]; // Dune 2, Oppenheimer, Past Lives, Killers of the Flower Moon, Interstellar, Arrival
    const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
    heroMovie = await fetchTMDBDetails(randomId);
  }
  
  if (heroMovie) {
    updateHeroUI(heroMovie);
  }
}

