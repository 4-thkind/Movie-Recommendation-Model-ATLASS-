/* ─── FETCH TMDB DETAILS (WITH CACHING & FALLBACK) ─── */
async function fetchTMDBDetails(movieId) {
  if (tmdbCache[movieId]) return tmdbCache[movieId];
  
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
  } else {
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
        cast: [{name: "Cast N/A", character: "Cast Member", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}],
        director: [{name: "Director N/A", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80"}]
      };
    }
    const movie = movieLensData.movies[movieId];
    if (!movie) return null;
    tmdbId = movie.tmdbId;
    cleanTitle = movie.title.replace(/\s\(\d{4}\)$/, '');
    year = movie.title.match(/\((\d{4})\)$/)?.[1] || 'N/A';
    genresList = movie.genres.replace(/\|/g, ' · ');
  }
  
  const apiKey = localStorage.getItem('tmdb_api_key');
  if (!apiKey || !tmdbId) {
    // Return custom placeholder with real MovieLens values
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
    tmdbCache[movieId] = fallbackMock;
    return fallbackMock;
  }
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`);
    if (!res.ok) throw new Error("TMDB network error");
    const data = await res.json();
    
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
  let delay = 0;
  const ticks = 28;
  for (let i = 0; i < ticks; i++) {
    const progress = i / ticks;
    delay += 60 + progress * 160;
    setTimeout(playTick, delay);
  }
}

function playWhoosh() {
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buf;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.35);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.35);
  } catch(e){}
}

function playWin() {
  try {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.5);
    });
  } catch(e){}
}

function playClick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  } catch(e){}
}

/* ─── SHARED FLOATING POPUP (NETFLIX-STYLE) ─── */
const popup = document.getElementById('card-popup');
let hideTimer = null;
let popupTimer = null;
let currentPopupMovie = null;

function schedulePopup(movie, cardEl) {
  clearTimeout(popupTimer);
  clearTimeout(hideTimer);
  popupTimer = setTimeout(() => showPopup(movie, cardEl), 280);
}

function cancelPopup() {
  clearTimeout(popupTimer);
  hideTimer = setTimeout(() => hidePopup(), 120);
}

function showPopup(movie, cardEl) {
  if (!popup) return;
  currentPopupMovie = movie;
  
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
  const inList = watchlist.find(m => m.id === movie.id);
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

function hidePopup() {
  if (!popup) return;
  clearTimeout(popupTimer);
  popup.classList.add('hiding');
  setTimeout(() => {
    popup.classList.remove('visible', 'hiding');
    currentPopupMovie = null;
  }, 220);
}

if (popup) {
  popup.addEventListener('mouseenter', () => { clearTimeout(hideTimer); clearTimeout(popupTimer); });
  popup.addEventListener('mouseleave', () => hidePopup());
}

/* ─── RENDER MOVIES CARD ─── */
function buildCard(movieId) {
  const wrap = document.createElement('div');
  wrap.className = 'movie-card';
  wrap.dataset.id = movieId;
  
  let cleanTitle = "Loading...";
  let year = "";
  let genresList = "";
  
  const isVirtual = typeof movieId === 'string' && movieId.startsWith('tmdb-');
  let match = calculateMatchScore(movieId);
  
  if (isVirtual) {
    cleanTitle = "Loading...";
    year = "";
    genresList = "";
  } else if (movieLensData.loaded) {
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
  
  const alreadyIn = watchlist.some(m => m.id === movieId);
  wrap.innerHTML = `
    <div class="card-thumb">
      <img class="lazy-poster" src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" alt="${cleanTitle}" style="opacity: 0.35; transition: opacity 0.5s var(--smooth)"/>
      <div class="m-badge">${match}%</div>
      <button class="card-quick-add${alreadyIn ? ' added' : ''}" data-id="${movieId}" title="${alreadyIn ? 'Remove from Watchlist' : 'Add to Watchlist'}">
        ${alreadyIn ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' : '<i class="fa-solid fa-plus" style="font-size:9px"></i>'}
      </button>
    </div>`;

  let resolvedDetails = null;
  const cardAddBtn = wrap.querySelector('.card-quick-add');

  const handleOpen = (e) => {
    if (e) e.stopPropagation();
    if (resolvedDetails) {
      openModal(resolvedDetails);
    } else {
      openModal(fallbackMock);
    }
  };

  const handleAdd = (e) => {
    if (e) e.stopPropagation();
    toggleWatchlist(resolvedDetails || fallbackMock);
  };

  wrap.addEventListener('click', handleOpen);
  cardAddBtn.addEventListener('click', handleAdd);

  const fallbackMock = {
    id: movieId,
    title: cleanTitle,
    year: year,
    match: match,
    rating: "...",
    runtime: "N/A",
    genre: genresList,
    synopsis: "Loading details from TMDb...",
    poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
    backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
    platforms: ["Streaming"],
    reasons: ["Popular Choice"],
    cast: []
  };

  wrap.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || fallbackMock, wrap));
  wrap.addEventListener('mouseleave', () => cancelPopup());

  fetchTMDBDetails(movieId).then(details => {
    if (!details) return;
    resolvedDetails = details;

    const img = wrap.querySelector('.lazy-poster');
    if (img) {
      img.src = details.poster;
      img.alt = details.title;
      img.style.opacity = 1;
    }
    
    if (currentPopupMovie && currentPopupMovie.id === movieId) {
      showPopup(details, wrap);
    }
  });
  
  return wrap;
}

/* ─── RENDER TRENDING GRID ─── */
function buildTrending() {
  const grid = document.getElementById('trend-row');
  if (!grid) return;
  grid.innerHTML = '';
  
  const trendingIds = [1, 296, 318, 356, 593, 260, 2571, 480];
  
  const apiKey = localStorage.getItem('tmdb_api_key');
  if (apiKey) {
    fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (!data.results || data.results.length === 0) throw new Error("No trending results");
        const items = [];
        data.results.slice(0, 8).forEach(item => {
          const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
          let cardId = `tmdb-${mediaType}-${item.id}`;
          if (mediaType === 'movie' && movieLensData.loaded) {
            const mlMovie = Object.values(movieLensData.movies).find(m => m.tmdbId == item.id);
            if (mlMovie) {
              cardId = mlMovie.movieId;
            }
          }
          items.push(cardId);
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
  const grid = document.getElementById('trend-row');
  if (!grid) return;
  grid.innerHTML = '';
  
  ids.forEach((movieId, i) => {
    const isVirtual = typeof movieId === 'string' && movieId.startsWith('tmdb-');
    let cleanTitle = "Loading...";
    let genresList = "Drama";
    let year = "";
    
    if (!isVirtual) {
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
    }
    
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.dataset.id = movieId;
    
    const alreadyIn = watchlist.some(m => m.id === movieId || String(m.id) === String(movieId));
    card.innerHTML = `
      <img class="lazy-poster" src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" alt="${cleanTitle}" style="opacity: 0.35; transition: opacity 0.5s var(--smooth)"/>
      <div class="trend-num">${i + 1}</div>
      ${i < 3 ? `<div class="trend-badge"><span class="live-dot"></span>#${i + 1} Today</div>` : ''}
      <div class="trend-overlay"></div>
      <div class="trend-info">
        <div class="trend-title">${cleanTitle}</div>
        <div class="trend-meta">
          <span class="trend-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ...</span>
          <span style="color:var(--t3)">·</span><span class="trend-year">${year}</span>
        </div>
        <div class="trend-btns">
          <button class="trend-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
          <button class="trend-btn add${alreadyIn ? ' added' : ''}"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
        </div>
      </div>
    `;
    
    let resolvedDetails = null;
    const playBtn = card.querySelector('.trend-btn.play');
    const addBtn = card.querySelector('.trend-btn.add');
    
    const handleOpen = (e) => {
      if (e) e.stopPropagation();
      if (resolvedDetails) {
        openModal(resolvedDetails);
      } else {
        openModal(fallbackMock);
      }
    };
    const handleAdd = (e) => {
      if (e) e.stopPropagation();
      toggleWatchlist(resolvedDetails || fallbackMock);
    };
    
    card.addEventListener('click', () => handleOpen(null));
    playBtn.addEventListener('click', e => handleOpen(e));
    addBtn.addEventListener('click', e => handleAdd(e));
    card.querySelector('img').addEventListener('click', (e) => { e.stopPropagation(); handleOpen(null); });
    
    const fallbackMock = {
      id: movieId,
      title: cleanTitle,
      year: year,
      match: calculateMatchScore(movieId),
      rating: "...",
      runtime: "N/A",
      genre: genresList,
      synopsis: "Loading details from TMDb...",
      poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
      backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
      platforms: ["Streaming"],
      reasons: ["Popular Choice"],
      cast: []
    };
    
    card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || fallbackMock, card));
    card.addEventListener('mouseleave', () => cancelPopup());
    
    fetchTMDBDetails(movieId).then(details => {
      if (!details) return;
      resolvedDetails = details;
      const img = card.querySelector('.lazy-poster');
      if (img) {
        img.src = details.poster;
        img.alt = details.title;
        img.style.opacity = 1;
      }
      const titleEl = card.querySelector('.trend-title');
      if (titleEl) {
        titleEl.textContent = details.title;
      }
      const yearEl = card.querySelector('.trend-year');
      if (yearEl) {
        yearEl.textContent = details.year;
      }
      const ratingEl = card.querySelector('.trend-rating');
      if (ratingEl) {
        ratingEl.innerHTML = `<i class="fa-solid fa-star" style="font-size:9px"></i> ${details.rating}`;
      }
      
      const isAdded = watchlist.some(m => m.id === movieId || String(m.id) === String(movieId));
      if (addBtn) {
        addBtn.classList.toggle('added', isAdded);
        addBtn.innerHTML = isAdded 
          ? '<i class="fa-solid fa-check" style="font-size:9px"></i> In List'
          : '<i class="fa-solid fa-plus" style="font-size:9px"></i> Add';
      }
    });
    grid.appendChild(card);
  });
}

/* ─── SCROLL ROWS ─── */
function renderRows() {
  const rw1 = document.getElementById('rw1');
  const rw2 = document.getElementById('rw2');
  if (!rw1 || !rw2) return;
  
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
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 540, behavior: 'smooth' });
}

function scrollTrend(dir) {
  const el = document.getElementById('trend-row');
  if (el) el.scrollBy({ left: dir * 580, behavior: 'smooth' });
}

/* ─── PLATFORMS DATA ─── */
const PLATFORMS_DATA = [
  {
    id: 'netflix', name: 'Netflix', color: '#e50914', icon: 'fa-solid fa-n',
    movieLensIds: [109487, 164179, 2571, 79132, 58559, 1], // Interstellar, Arrival, Matrix, Inception, Dark Knight, Toy Story
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
    movieLensIds: [480, 296, 2959, 356, 593, 1704], // Jurassic Park, Pulp Fiction, Fight Club, Forrest Gump, Silence of the Lambs, Good Will Hunting
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
    movieLensIds: [924, 260, 4993, 7361, 50, 1198], // 2001, Star Wars IV, Lord of the Rings, Eternal Sunshine, Usual Suspects, Raiders of the Lost Ark
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
    movieLensIds: [364, 588, 595, 6377, 4896, 2], // Lion King, Aladdin, Beauty and the Beast, Finding Nemo, Monsters Inc., Jumanji
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
    movieLensIds: [318, 858, 58559, 912, 919, 50, 1198], // Shawshank, Godfather, Dark Knight, Casablanca, Citizen Kane, Usual Suspects, Raiders of the Lost Ark
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
    movieLensIds: [1208, 904, 908, 4973, 5618, 924], // Apocalypse Now, Rear Window, Vertigo, Amelie, Spirited Away, 2001
    movies: [MOVIES[5], MOVIES[9], MOVIES[10], MOVIES[2], MOVIES[6], MOVIES[3]],
    series: [
      {id: "tmdb-tv-110034", title: "Pachinko", year: "2022–", type: "series", genre: "Drama · History", rating: "8.4", poster: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80"},
      {id: "tmdb-tv-154948", title: "Irma Vep", year: "2022", type: "series", genre: "Drama · Comedy", rating: "7.7", poster: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80"},
      {id: "tmdb-tv-61175", title: "The Affair", year: "2014–2019", type: "series", genre: "Drama · Romance", rating: "7.7", poster: "https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?w=400&q=80"},
    ]
  }
];

/* ─── PLATFORM BROWSER WIRING ─── */
function buildPlatforms() {
  const tabsEl   = document.getElementById('plat-tabs');
  const panelsEl = document.getElementById('plat-panels');
  if (!tabsEl || !panelsEl) return;

  tabsEl.innerHTML = '';
  panelsEl.innerHTML = '';

  PLATFORMS_DATA.forEach((plat, idx) => {
    // Tab
    const tab = document.createElement('button');
    tab.className = 'plat-tab' + (plat.id === activePlatform ? ' active' : '');
    tab.dataset.id = plat.id;
    tab.innerHTML = `<i class="${plat.icon}" style="color:${plat.color}"></i>${plat.name}`;
    tab.onclick = () => { playClick(); switchPlatform(plat.id); };
    tabsEl.appendChild(tab);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'platform-panel' + (plat.id === activePlatform ? ' active' : '');
    panel.id = 'panel-' + plat.id;
    panel.innerHTML = `
      <div class="plat-wrap" id="pw-${plat.id}">
        <div class="plat-arr L" onclick="scrollPlat('${plat.id}',-1)"><i class="fa-solid fa-chevron-left"></i></div>
        <div class="plat-row" id="pr-${plat.id}"></div>
        <div class="plat-arr R" onclick="scrollPlat('${plat.id}',1)"><i class="fa-solid fa-chevron-right"></i></div>
      </div>`;
    panelsEl.appendChild(panel);

    // Build initial cards
    renderPlatCards(plat.id, activeType);
  });
}

function renderPlatCards(platId, type) {
  const plat = PLATFORMS_DATA.find(p => p.id === platId);
  if (!plat) return;
  const row = document.getElementById('pr-' + platId);
  if (!row) return;
  row.innerHTML = '';

  if (type === 'series') {
    plat.series.forEach(item => {
      const card = document.createElement('div');
      card.className = 'plat-card';
      card.dataset.id = item.id;
      
      const isVirtual = typeof item.id === 'string' && item.id.startsWith('tmdb-');
      const cleanTitle = isVirtual ? "Loading..." : item.title;
      const year = isVirtual ? "" : item.year;
      const genre = isVirtual ? "TV Show" : item.genre;
      const rating = isVirtual ? "..." : item.rating;
      const poster = isVirtual ? "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" : item.poster;
      
      const alreadyIn = watchlist.some(m => m.id === item.id || String(m.id) === String(item.id));
      card.innerHTML = `
        <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity: ${isVirtual ? '0.35' : '1'}; transition: opacity 0.5s var(--smooth)"/>
        <div class="plat-card-overlay"></div>
        <div class="plat-card-badge badge-series">Series</div>
        <div class="plat-card-info">
          <div class="plat-card-title">${cleanTitle}</div>
          <div class="plat-card-meta"><span class="plat-card-meta-text">${year} · ${genre} · ★ ${rating}</span></div>
          <div class="plat-card-actions">
            <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
            <button class="pca-btn add${alreadyIn ? ' added' : ''}"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
          </div>
        </div>`;
      
      let resolvedDetails = null;
      const playBtn = card.querySelector('.pca-btn.play');
      const addBtn = card.querySelector('.pca-btn.add');
      
      const handlePlay = (e) => {
        if (e) e.stopPropagation();
        if (resolvedDetails) {
          openModal(resolvedDetails);
        } else {
          openModal(fallbackMock);
        }
      };
      const handleAdd = (e) => {
        if (e) e.stopPropagation();
        toggleWatchlist(resolvedDetails || fallbackMock);
      };
      
      card.addEventListener('click', handlePlay);
      playBtn.addEventListener('click', handlePlay);
      addBtn.addEventListener('click', handleAdd);
      
      const fallbackMock = {
        id: item.id,
        title: item.title || cleanTitle,
        year: item.year || year,
        match: calculateMatchScore(item.id),
        rating: item.rating || rating,
        runtime: "N/A",
        genre: item.genre || genre,
        synopsis: "Loading details from TMDb...",
        poster: poster,
        backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
        platforms: [plat.name],
        reasons: ["Popular Choice"],
        cast: []
      };
      
      card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || fallbackMock, card));
      card.addEventListener('mouseleave', () => cancelPopup());
      
      fetchTMDBDetails(item.id).then(details => {
        if (!details) return;
        resolvedDetails = details;
        
        const img = card.querySelector('.lazy-poster');
        if (img) {
          img.src = details.poster;
          img.alt = details.title;
          img.style.opacity = 1;
        }
        const titleEl = card.querySelector('.plat-card-title');
        if (titleEl) {
          titleEl.textContent = details.title;
        }
        const metaTextEl = card.querySelector('.plat-card-meta-text');
        if (metaTextEl) {
          metaTextEl.textContent = `${details.year} · ${details.genre} · ★ ${details.rating}`;
        }
        
        const isAdded = watchlist.some(m => m.id === item.id || String(m.id) === String(item.id));
        if (addBtn) {
          addBtn.classList.toggle('added', isAdded);
          addBtn.innerHTML = isAdded 
            ? '<i class="fa-solid fa-check" style="font-size:9px"></i> In List' 
            : '<i class="fa-solid fa-plus" style="font-size:9px"></i> Add';
        }
        
        if (currentPopupMovie && currentPopupMovie.id === item.id) {
          showPopup(details, card);
        }
      });
      
      row.appendChild(card);
    });
  } else {
    // Movies
    if (movieLensData.loaded) {
      plat.movieLensIds.forEach(movieId => {
        const card = document.createElement('div');
        card.className = 'plat-card';
        card.dataset.id = movieId;
        
        const movie = movieLensData.movies[movieId];
        const cleanTitle = movie ? movie.title.replace(/\s\(\d{4}\)$/, '') : `MovieLens #${movieId}`;
        const year = movie ? movie.title.match(/\((\d{4})\)$/)?.[1] || 'N/A' : 'N/A';
        const genresList = movie ? movie.genres.replace(/\|/g, ' · ') : 'Drama';
        const match = calculateMatchScore(movieId);
        
        card.innerHTML = `
          <img class="lazy-poster" src="https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80" alt="${cleanTitle}" style="opacity: 0.35; transition: opacity 0.5s var(--smooth)"/>
          <div class="plat-card-overlay"></div>
          <div class="plat-card-badge badge-movie">Movie</div>
          <div class="plat-card-info">
            <div class="plat-card-title">${cleanTitle}</div>
            <div class="plat-card-meta">${year} · ${genresList} · ★ ...</div>
            <div class="plat-card-actions">
              <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
              <button class="pca-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
            </div>
          </div>`;
          
        let resolvedDetails = null;
        const playBtn = card.querySelector('.pca-btn.play');
        const addBtn = card.querySelector('.pca-btn.add');
        
        const handleOpen = (e) => {
          if (e) e.stopPropagation();
          if (resolvedDetails) openModal(resolvedDetails);
        };
        const handleAdd = (e) => {
          if (e) e.stopPropagation();
          toggleWatchlist(resolvedDetails || fallbackMock);
        };
        
        card.addEventListener('click', () => handleOpen(null));
        playBtn.addEventListener('click', e => handleOpen(e));
        addBtn.addEventListener('click', handleAdd);
        
        const fallbackMock = {
          id: movieId,
          title: cleanTitle,
          year: year,
          match: match,
          rating: "...",
          runtime: "N/A",
          genre: genresList,
          synopsis: "Loading details from TMDb...",
          poster: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80",
          backdrop: "https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85",
          platforms: ["Streaming"],
          reasons: ["Popular Choice"],
          cast: []
        };
        
        card.addEventListener('mouseenter', () => schedulePopup(resolvedDetails || fallbackMock, card));
        card.addEventListener('mouseleave', () => cancelPopup());
        
        fetchTMDBDetails(movieId).then(details => {
          if (!details) return;
          resolvedDetails = details;
          
          const img = card.querySelector('.lazy-poster');
          if (img) {
            img.src = details.poster;
            img.style.opacity = 1;
          }
          const metaEl = card.querySelector('.plat-card-meta');
          if (metaEl) {
            metaEl.textContent = `${details.year} · ${details.genre} · ★ ${details.rating}`;
          }
          
          if (currentPopupMovie && currentPopupMovie.id === movieId) {
            showPopup(details, card);
          }
        });
        
        row.appendChild(card);
      });
    } else {
      plat.movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'plat-card';
        card.dataset.id = movie.id;
        card.innerHTML = `
          <img src="${movie.poster}" alt="${movie.title}" loading="lazy"/>
          <div class="plat-card-overlay"></div>
          <div class="plat-card-badge badge-movie">Movie</div>
          <div class="plat-card-info">
            <div class="plat-card-title">${movie.title}</div>
            <div class="plat-card-meta">${movie.year} · ${movie.genre} · ★ ${movie.rating}</div>
            <div class="plat-card-actions">
              <button class="pca-btn play"><i class="fa-solid fa-circle-info" style="font-size:9px"></i> Details</button>
              <button class="pca-btn add"><i class="fa-solid fa-plus" style="font-size:9px"></i> Add</button>
            </div>
          </div>`;
          
        const handleOpen = (e) => {
          if (e) e.stopPropagation();
          openModal(movie);
        };
        const handleAdd = (e) => {
          if (e) e.stopPropagation();
          toggleWatchlist(movie);
        };
        
        card.addEventListener('click', () => handleOpen(null));
        card.querySelector('.pca-btn.play').addEventListener('click', e => handleOpen(e));
        card.querySelector('.pca-btn.add').addEventListener('click', handleAdd);
        
        card.addEventListener('mouseenter', () => schedulePopup(movie, card));
        card.addEventListener('mouseleave', () => cancelPopup());
        
        row.appendChild(card);
      });
    }
  }
}

function switchPlatform(platId) {
  activePlatform = platId;
  document.querySelectorAll('.plat-tab').forEach(t => t.classList.toggle('active', t.dataset.id === platId));
  document.querySelectorAll('.platform-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + platId));
}

function setType(type) {
  activeType = type;
  const pillMovies = document.getElementById('pill-movies');
  const pillSeries = document.getElementById('pill-series');
  if (pillMovies) pillMovies.classList.toggle('active', type === 'movies');
  if (pillSeries) pillSeries.classList.toggle('active', type === 'series');
  playClick();
  PLATFORMS_DATA.forEach(p => renderPlatCards(p.id, type));
}

function scrollPlat(platId, dir) {
  const el = document.getElementById('pr-' + platId);
  if (el) el.scrollBy({ left: dir * 600, behavior: 'smooth' });
}

/* ─── WATCHLIST LOGIC ─── */
let roulettePromptDismissed = false;

function toggleWatchlist(movie) {
  const index = watchlist.findIndex(m => String(m.id) === String(movie.id));
  if (index !== -1) {
    watchlist.splice(index, 1);
  } else {
    watchlist.push(movie);
    const badge = document.getElementById('wl-count');
    if (badge) {
      badge.classList.add('bump');
      setTimeout(() => badge.classList.remove('bump'), 450);
    }
  }
  localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
  updateWatchlistUI();
  updateWLCount();
  playClick();
  syncWatchlistButtons();
}

function addToWatchlist(movie, triggerEl) {
  if (watchlist.find(m => String(m.id) === String(movie.id))) return;
  watchlist.push(movie);
  
  // Persist to localStorage
  localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
  
  updateWatchlistUI();
  updateWLCount();
  playClick();

  const badge = document.getElementById('wl-count');
  if (badge) {
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 450);
  }
  syncWatchlistButtons();
}

function removeFromWatchlist(id) {
  watchlist = watchlist.filter(m => String(m.id) !== String(id));
  localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
  updateWatchlistUI();
  updateWLCount();
  playClick();
  syncWatchlistButtons();
}

function syncWatchlistButtons() {
  // 1. Sync all .card-quick-add buttons on the page
  document.querySelectorAll('.card-quick-add').forEach(btn => {
    const rawId = btn.dataset.id || btn.getAttribute('data-id');
    if (rawId) {
      const mid = rawId.startsWith('tmdb-') ? rawId : parseInt(rawId);
      const isAdded = watchlist.some(m => String(m.id) === String(mid));
      btn.classList.toggle('added', isAdded);
      btn.innerHTML = isAdded 
        ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' 
        : '<i class="fa-solid fa-plus" style="font-size:9px"></i>';
      btn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
    }
  });

  // 2. Sync all .pca-btn.add buttons on platform cards (.plat-card)
  document.querySelectorAll('.plat-card').forEach(card => {
    const rawId = card.dataset.id || card.getAttribute('data-id');
    if (rawId) {
      const mid = rawId.startsWith('tmdb-') ? rawId : parseInt(rawId);
      const isAdded = watchlist.some(m => String(m.id) === String(mid));
      const btn = card.querySelector('.pca-btn.add');
      if (btn) {
        btn.classList.toggle('added', isAdded);
        btn.innerHTML = isAdded 
          ? '<i class="fa-solid fa-check" style="font-size:9px"></i> In List' 
          : '<i class="fa-solid fa-plus" style="font-size:9px"></i> Add';
        btn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
      }
    }
  });

  // 2b. Sync all .trend-btn.add buttons on trending cards (.trend-card)
  document.querySelectorAll('.trend-card').forEach(card => {
    const rawId = card.dataset.id || card.getAttribute('data-id');
    if (rawId) {
      const mid = rawId.startsWith('tmdb-') ? rawId : parseInt(rawId);
      const isAdded = watchlist.some(m => String(m.id) === String(mid));
      const btn = card.querySelector('.trend-btn.add');
      if (btn) {
        btn.classList.toggle('added', isAdded);
        btn.innerHTML = isAdded 
          ? '<i class="fa-solid fa-check" style="font-size:9px"></i> In List' 
          : '<i class="fa-solid fa-plus" style="font-size:9px"></i> Add';
        btn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
      }
    }
  });

  // 3. Sync floating preview popup button (#pp-add)
  const ppAdd = document.getElementById('pp-add');
  if (ppAdd && currentPopupMovie) {
    const isAdded = watchlist.some(m => String(m.id) === String(currentPopupMovie.id));
    ppAdd.classList.toggle('added', isAdded);
    ppAdd.innerHTML = isAdded 
      ? '<i class="fa-solid fa-check" style="font-size:10px"></i>' 
      : '<i class="fa-solid fa-plus" style="font-size:10px"></i>';
    ppAdd.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
  }

  // 4. Sync details modal button (#m-add-wl-new)
  const wlBtnNew = document.getElementById('m-add-wl-new');
  if (wlBtnNew && currentModalMovie) {
    const isAdded = watchlist.some(m => String(m.id) === String(currentModalMovie.id));
    wlBtnNew.classList.toggle('added', isAdded);
    wlBtnNew.innerHTML = isAdded 
      ? '<i class="fa-solid fa-check" style="font-size:10px;margin-right:6px"></i>In Watchlist' 
      : '<i class="fa-solid fa-plus" style="font-size:10px;margin-right:6px"></i>Add to Watchlist';
    wlBtnNew.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
  }

  // 5. Sync hero section watchlist button (#hero-wl-btn)
  const heroWlBtn = document.getElementById('hero-wl-btn');
  if (heroWlBtn && currentHeroMovie) {
    const isAdded = watchlist.some(m => String(m.id) === String(currentHeroMovie.id));
    heroWlBtn.classList.toggle('added', isAdded);
    heroWlBtn.innerHTML = isAdded ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
    heroWlBtn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
  }

  // 6. Sync surprise pick watchlist button (#s-add-btn)
  const sAddBtn = document.getElementById('s-add-btn');
  if (sAddBtn && currentSurpriseMovie) {
    const isAdded = watchlist.some(m => String(m.id) === String(currentSurpriseMovie.id));
    sAddBtn.classList.toggle('added', isAdded);
    sAddBtn.innerHTML = isAdded 
      ? '<i class="fa-solid fa-check" style="font-size:11px;margin-right:6px"></i>In Watchlist' 
      : '<i class="fa-solid fa-plus" style="font-size:11px;margin-right:6px"></i>Watchlist';
    sAddBtn.title = isAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
  }
}

function updateWLCount() {
  const badge = document.getElementById('wl-count');
  if (!badge) return;
  const count = watchlist.length;
  badge.textContent = count;
  // Hide badge when empty
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function updateWatchlistUI() {
  const strip = document.getElementById('wl-strip');
  const empty = document.getElementById('wl-empty');
  const prompt = document.getElementById('roulette-prompt');
  const roulette = document.getElementById('roulette-wrap');
  const rpCount = document.getElementById('rp-count');
  if (!strip) return;

  strip.querySelectorAll('.wl-item').forEach(el => el.remove());

  if (watchlist.length === 0) {
    if (empty) empty.style.display = 'flex';
    if (prompt) prompt.classList.remove('show');
    if (roulette) roulette.classList.remove('open');
    roulettePromptDismissed = false;
    resetWinner();
    return;
  }
  
  if (empty) empty.style.display = 'none';

  if (rpCount) rpCount.textContent = watchlist.length;

  if (!roulettePromptDismissed && roulette && !roulette.classList.contains('open')) {
    if (prompt) prompt.classList.add('show');
  }

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
}

function openRoulette() {
  playClick();
  const prompt = document.getElementById('roulette-prompt');
  const roulette = document.getElementById('roulette-wrap');
  if (prompt) prompt.classList.remove('show');
  if (roulette) {
    roulette.classList.add('open');
    roulette.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function closeRoulette() {
  playClick();
  const roulette = document.getElementById('roulette-wrap');
  const prompt = document.getElementById('roulette-prompt');
  if (roulette) roulette.classList.remove('open');
  if (prompt) prompt.classList.add('show');
  roulettePromptDismissed = false;
  resetWinner();
}

function dismissRoulette() {
  playClick();
  roulettePromptDismissed = true;
  const prompt = document.getElementById('roulette-prompt');
  if (prompt) prompt.classList.remove('show');
}

/* ─── DRUM ─── */
function buildDrum() {
  const inner = document.getElementById('drum-inner');
  if (!inner) return;
  inner.innerHTML = '';
  
  if (watchlist.length === 0) return;
  
  const repeated = [];
  while (repeated.length < Math.max(watchlist.length * 5, 25)) {
    repeated.push(...watchlist);
  }
  
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
  if (btn) {
    btn.disabled = true;
    btn.classList.add('spinning');
  }

  playWhoosh();
  playSpinAccel();

  const winnerIdx = Math.floor(Math.random() * watchlist.length);
  const winner = watchlist[winnerIdx];

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
    if (parseInt(cards[i].dataset.id) === winner.id) { targetCardIdx = i; break; }
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
    spinLock = false;
    confettiBurst();
  }, 3580);
}

function showWinner(movie) {
  const rev = document.getElementById('winner-reveal');
  if (!rev) return;
  document.getElementById('winner-name').textContent = movie.title;
  document.getElementById('winner-meta').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
  document.getElementById('winner-open').onclick = () => openModal(movie);
  rev.classList.add('show');
}

function resetWinner() {
  const rev = document.getElementById('winner-reveal');
  if (rev) rev.classList.remove('show');
  const inner = document.getElementById('drum-inner');
  if (inner) {
    inner.querySelectorAll('.drum-card').forEach(c => c.classList.remove('winner'));
  }
}

/* ─── CONFETTI ─── */
function confettiBurst() {
  const colors = ['#f5c518','#7c3aed','#a78bfa','#fbbf24','#f472b6'];
  for (let i = 0; i < 38; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = `
      left:${Math.random()*100}vw;top:${38+Math.random()*22}vh;
      background:${colors[i%colors.length]};
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1.3+Math.random()*.7}s;
      transform:rotate(${Math.random()*360}deg);
      width:${5+Math.random()*9}px;height:${5+Math.random()*9}px;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 2600);
  }
}

/* ─── SURPRISE ME ─── */
let lastSurprise = -1;
function surpriseMe() {
  const orb = document.getElementById('surprise-btn');
  const result = document.getElementById('surprise-result');
  if (orb) orb.style.transform = 'scale(0.82)';
  setTimeout(() => { if (orb) orb.style.transform = ''; }, 200);

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

  if (result) result.classList.remove('show');
  fetchTMDBDetails(movieId).then(movie => {
    if (!movie) return;
    setTimeout(() => {
      document.getElementById('s-img').src = movie.poster;
      document.getElementById('s-title').textContent = movie.title;
      document.getElementById('s-sub').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
      document.getElementById('s-synopsis').textContent = movie.synopsis.slice(0, 115) + '…';
      document.getElementById('s-modal-btn').onclick = () => openModal(movie);
      document.getElementById('s-add-btn').onclick = () => addToWatchlist(movie, document.getElementById('s-add-btn'));
      if (result) result.classList.add('show');
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
  hidePopup();
  
  const isSeries = movie.type === 'series';
  
  document.getElementById('m-backdrop').src = movie.backdrop || movie.poster;
  
  if (isSeries) {
    document.getElementById('m-chip').innerHTML = `<i class="fa-solid fa-tv" style="font-size:10px"></i> Popular Series`;
    document.getElementById('m-title').textContent = movie.title;
    document.getElementById('m-year').textContent = `${movie.year}`;
    document.getElementById('m-rating').textContent = `★ ${movie.rating}`;
    document.getElementById('m-runtime').textContent = "Series";
    document.getElementById('m-genre').textContent = movie.genre;
    document.getElementById('m-synopsis').textContent = `${movie.title} is a hit series in the ${movie.genre} genre. Watch all seasons now! Rated ${movie.rating}/10.`;
    
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
    

    
    document.getElementById('m-similar').innerHTML = '';
    
    // Hide stars rating and trailer
    const ratingBox = document.querySelector('.user-rating-box');
    if (ratingBox) ratingBox.style.display = 'none';
    
    const videoContainer = document.getElementById('m-video-container');
    if (videoContainer) videoContainer.style.display = 'none';
    
    const playBtn = document.getElementById('m-play-btn');
    if (playBtn) playBtn.style.display = 'none';
    
  } else {
    // Normal Movie details
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

  const wlBtnNew = document.getElementById('m-add-wl-new');
  if (wlBtnNew) {
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
  }

  document.getElementById('overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('overlay').classList.remove('on');
  const iframe = document.getElementById('m-video-iframe');
  if (iframe) iframe.src = '';
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
  
  // Refresh cache and lists
  tmdbCache = {};
  buildTrending();
  renderRows();
  if (typeof buildPlatforms === 'function') buildPlatforms();
  if (typeof initHero === 'function') initHero();
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

/* ─── INTERACTION & SCROLL NAVIGATION ─── */
function initScrollspy() {
  const sections = ['hero', 'trending-section', 'platforms-section', 'surprise-section', 'watchlist-section'];
  const links = document.querySelectorAll('.nav-links a[data-section]');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(a => a.classList.toggle('active', a.dataset.section === id));
      }
    });
  }, { threshold: 0.25, rootMargin: '-62px 0px -40% 0px' });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) obs.observe(el);
  });
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('solid', window.scrollY > 60);
}, { passive: true });

/* ─── REVEAL ON SCROLL ─── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.07 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ─── REALTIME SEARCH ─── */
function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-section').style.display = 'none';
  document.body.classList.remove('search-active');
}

document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  const searchSec = document.getElementById('search-section');
  const searchResults = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  
  if (!q) {
    if (searchSec) searchSec.style.display = 'none';
    document.body.classList.remove('search-active');
    return;
  }
  
  document.body.classList.add('search-active');
  
  if (!searchResults) return;
  
  const apiKey = localStorage.getItem('tmdb_api_key');
  if (apiKey) {
    if (countEl) countEl.textContent = "Searching...";
    
    const moviePromise = fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .catch(() => ({ results: [] }));
      
    const tvPromise = fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .catch(() => ({ results: [] }));
      
    Promise.all([moviePromise, tvPromise]).then(([movieData, tvData]) => {
      // Prevent race conditions: check if the search input value has changed
      if (document.getElementById('search-input').value.trim().toLowerCase() !== q) return;
      
      searchResults.innerHTML = '';
      
      const movies = (movieData.results || []).map(item => ({ ...item, mediaType: 'movie' }));
      const tvs = (tvData.results || []).map(item => ({ ...item, mediaType: 'tv' }));
      
      let combined = [...movies, ...tvs]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 15);
        
      if (countEl) countEl.textContent = `${combined.length} found`;
      
      if (combined.length === 0) {
        searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No results found matching that query.</div>';
      } else {
        combined.forEach(item => {
          let cardId = `tmdb-${item.mediaType}-${item.id}`;
          if (item.mediaType === 'movie' && movieLensData.loaded) {
            const mlMovie = Object.values(movieLensData.movies).find(m => m.tmdbId == item.id);
            if (mlMovie) {
              cardId = mlMovie.movieId;
            }
          }
          searchResults.appendChild(buildCard(cardId));
        });
      }
      if (searchSec) searchSec.style.display = 'block';
    });
    return;
  }
  
  searchResults.innerHTML = '';
  
  if (!movieLensData.loaded) {
    const matches = MOVIES.filter(m => m.title.toLowerCase().includes(q));
    if (countEl) countEl.textContent = `${matches.length} found`;
    if (matches.length === 0) {
      searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
    } else {
      matches.forEach(m => {
        searchResults.appendChild(buildCard(m.id));
      });
    }
    if (searchSec) searchSec.style.display = 'block';
    return;
  }
  
  const matches = Object.values(movieLensData.movies)
    .filter(m => m.title.toLowerCase().includes(q))
    .slice(0, 15);
    
  if (countEl) countEl.textContent = `${matches.length} found`;
  
  if (matches.length === 0) {
    searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
  } else {
    matches.forEach(m => {
      searchResults.appendChild(buildCard(m.movieId));
    });
  }
  
  if (searchSec) searchSec.style.display = 'block';
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
      const isAdded = watchlist.some(m => m.id === movie.id);
      wlBtn.innerHTML = isAdded ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
      wlBtn.title = isAdded ? 'In watchlist' : 'Add to watchlist';
    };
    updateWLIcon();
    wlBtn.onclick = () => {
      if (!watchlist.some(m => m.id === movie.id)) {
        addToWatchlist(movie, wlBtn);
        updateWLIcon();
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
    const fallbackIds = [1, 2, 3, 5, 7, 8];
    const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
    heroMovie = await fetchTMDBDetails(randomId);
  }
  
  if (heroMovie) {
    updateHeroUI(heroMovie);
  }
}


