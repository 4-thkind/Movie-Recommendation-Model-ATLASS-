const TMDB_API_KEY = localStorage.getItem('tmdb_api_key') || '572a69a7b33b22b3aaa05c9c9351fbab';

// Override loadMovieLensDatabase to just kick off the live TMDB UI
async function loadMovieLensDatabase() {
  updateDatabaseStatus('movies', 'Live (TMDB)');
  updateDatabaseStatus('links', 'Live (TMDB)');
  updateDatabaseStatus('ratings', 'Live (TMDB)');
  
  renderRows();
  buildTrending();
  if (typeof buildPlatforms === 'function') buildPlatforms();
  initHero();
}

// Override fetchTMDBDetails to natively use TMDB IDs and directly fetch
async function fetchTMDBDetails(tmdbId) {
  if (tmdbCache[tmdbId]) return tmdbCache[tmdbId];
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,release_dates`);
    if (!res.ok) throw new Error("TMDB network error");
    const data = await res.json();
    
    let cert = 'PG-13';
    if (data.release_dates && data.release_dates.results) {
      const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates.length > 0 && usRelease.release_dates[0].certification) {
        cert = usRelease.release_dates[0].certification;
      }
    }
    if (!cert) cert = 'PG-13';
    
    const mapped = {
      id: tmdbId,
      title: data.title,
      year: data.release_date ? data.release_date.split('-')[0] : 'N/A',
      match: Math.floor(Math.random() * 15) + 85,
      rating: data.vote_average ? data.vote_average.toFixed(1) : '7.0',
      runtime: data.runtime ? `${Math.floor(data.runtime/60)}h ${data.runtime%60}m` : 'N/A',
      genre: data.genres && data.genres.length > 0 ? data.genres.map(g => g.name).join(' · ') : 'Drama',
      synopsis: data.overview || 'No synopsis available.',
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=1200&q=85',
      platforms: ["Netflix", "Prime Video", "Apple TV+", "Max", "Hulu", "Disney+"].sort(() => 0.5 - Math.random()).slice(0, 3),
      reasons: data.genres ? data.genres.map(g => g.name).slice(0, 3) : ['Highly Rated'],
      cast: data.credits && data.credits.cast ? data.credits.cast.slice(0, 5).map(c => ({
        name: c.name,
        img: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80'
      })) : [],
      cert: cert
    };
    
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) mapped.trailerKey = trailer.key;
    }
    
    tmdbCache[tmdbId] = mapped;
    return mapped;
  } catch (err) {
    console.error("TMDB fetch error:", err);
    return null;
  }
}

// Override recommender to fetch recommendations from TMDB
function initializeRecommender() {
  const rw1 = document.getElementById('rw1');
  if (!rw1) return;
  rw1.innerHTML = '';
  
  if (watchlist.length > 0) {
    const seedId = watchlist[0].id; // TMDB ID
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
}

function loadDefaultRecs(container) {
  fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) data.results.slice(0, 15).forEach(m => container.appendChild(buildCard(m.id, m)));
    });
}

// Override renderRows for "Because You Watched"
function renderRows() {
  initializeRecommender(); // Does Because you watched / Top Rated for rw1
  
  const rw2 = document.getElementById('rw2');
  if (!rw2) return;
  rw2.innerHTML = '';
  
  fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) data.results.slice(0, 15).forEach(m => rw2.appendChild(buildCard(m.id, m)));
    });
}

// Helper to safely build card with live TMDB data
function buildCard(tmdbId, initialData = null) {
  const wrap = document.createElement('div');
  wrap.className = 'movie-card';
  wrap.dataset.id = tmdbId;
  
  const cleanTitle = initialData ? initialData.title : "Loading...";
  const poster = initialData && initialData.poster_path ? `https://image.tmdb.org/t/p/w500${initialData.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
  const match = Math.floor(Math.random() * 15) + 85;
  const alreadyIn = watchlist.some(m => m.id === tmdbId);
  
  wrap.innerHTML = `
    <div class="card-thumb">
      <img class="lazy-poster" src="${poster}" alt="${cleanTitle}" style="opacity: ${initialData ? '1' : '0.35'}; transition: opacity 0.5s var(--smooth)"/>
      <div class="m-badge">${match}%</div>
      <button class="card-quick-add${alreadyIn ? ' added' : ''}" data-id="${tmdbId}" title="${alreadyIn ? 'Remove from Watchlist' : 'Add to Watchlist'}">
        ${alreadyIn ? '<i class="fa-solid fa-check" style="font-size:9px"></i>' : '<i class="fa-solid fa-plus" style="font-size:9px"></i>'}
      </button>
    </div>`;

  let resolvedDetails = null;
  const cardAddBtn = wrap.querySelector('.card-quick-add');

  const handleOpen = (e) => {
    if (e) e.stopPropagation();
    if (resolvedDetails) {
      openModal(resolvedDetails);
    }
  };

  const handleAdd = (e) => {
    if (e) e.stopPropagation();
    if (resolvedDetails) toggleWatchlist(resolvedDetails);
  };

  wrap.addEventListener('click', handleOpen);
  cardAddBtn.addEventListener('click', handleAdd);

  fetchTMDBDetails(tmdbId).then(details => {
    if (!details) return;
    resolvedDetails = details;
    const img = wrap.querySelector('.lazy-poster');
    if (img && !initialData) {
      img.src = details.poster;
      img.style.opacity = 1;
    }
    wrap.addEventListener('mouseenter', () => schedulePopup(details, wrap));
    wrap.addEventListener('mouseleave', () => cancelPopup());
    if (currentPopupMovie && currentPopupMovie.id === tmdbId) showPopup(details, wrap);
  });
  
  return wrap;
}

// Override buildTrending
function buildTrending() {
  fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) renderTrendingGrid(data.results.slice(0, 10));
    });
}

function renderTrendingGrid(moviesList) {
  const grid = document.getElementById('trend-row');
  if (!grid) return;
  grid.innerHTML = '';
  
  moviesList.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.dataset.id = item.id;
    const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
    
    card.innerHTML = `
      <img class="lazy-poster" src="${poster}" alt="${item.title}" style="opacity: 1;"/>
      <div class="trend-num">${i + 1}</div>
      ${i < 3 ? `<div class="trend-badge"><span class="live-dot"></span>#${i + 1} Today</div>` : ''}
      <div class="trend-overlay"></div>
      <div class="trend-info">
        <div class="trend-title">${item.title}</div>
        <div class="trend-meta">
          <span class="trend-rating"><i class="fa-solid fa-star" style="font-size:9px"></i> ${item.vote_average ? item.vote_average.toFixed(1) : '7.0'}</span>
          <span style="color:var(--t3)">·</span><span>${item.release_date ? item.release_date.split('-')[0] : 'N/A'}</span>
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
    
    fetchTMDBDetails(item.id).then(details => {
      if (!details) return;
      resolvedDetails = details;
    });
    grid.appendChild(card);
  });
}

// Override Platform Browsing
const LIVE_PLATFORMS = [
  { id: 'netflix', name: 'Netflix', color: '#e50914', icon: 'fa-solid fa-n', providerId: 8 },
  { id: 'prime', name: 'Prime Video', color: '#00a8e0', icon: 'fa-brands fa-amazon', providerId: 9 },
  { id: 'appletv', name: 'Apple TV+', color: '#a2aaad', icon: 'fa-brands fa-apple', providerId: 350 },
  { id: 'disney', name: 'Disney+', color: '#113ccf', icon: 'fa-solid fa-star', providerId: 337 },
  { id: 'max', name: 'Max', color: '#002be0', icon: 'fa-solid fa-m', providerId: 384 },
  { id: 'hulu', name: 'Hulu', color: '#1ce783', icon: 'fa-solid fa-h', providerId: 15 }
];

function buildPlatforms() {
  const tabsEl   = document.getElementById('plat-tabs');
  const panelsEl = document.getElementById('plat-panels');
  if (!tabsEl || !panelsEl) return;

  tabsEl.innerHTML = '';
  panelsEl.innerHTML = '';

  LIVE_PLATFORMS.forEach((plat) => {
    const tab = document.createElement('button');
    tab.className = 'plat-tab' + (plat.id === activePlatform ? ' active' : '');
    tab.dataset.id = plat.id;
    tab.innerHTML = `<i class="${plat.icon}" style="color:${plat.color}"></i>${plat.name}`;
    tab.onclick = () => { playClick(); switchPlatform(plat.id); };
    tabsEl.appendChild(tab);

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

    renderPlatCards(plat.id, activeType);
  });
}

function renderPlatCards(platId, type) {
  const plat = LIVE_PLATFORMS.find(p => p.id === platId);
  const row = document.getElementById('pr-' + platId);
  if (!row || !plat) return;
  row.innerHTML = '';

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
          
          let resolvedDetails = null;
          if (type === 'movie') {
            fetchTMDBDetails(item.id).then(details => {
              if(!details) return;
              resolvedDetails = details;
              if (currentPopupMovie && currentPopupMovie.id === item.id) showPopup(details, card);
            });
          } else {
            // Map TV show details
            fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}`)
              .then(res => res.json())
              .then(tvData => {
                resolvedDetails = {
                  id: tvData.id, type: 'series', title: tvData.name,
                  year: tvData.first_air_date ? tvData.first_air_date.split('-')[0] : 'N/A',
                  rating: tvData.vote_average ? tvData.vote_average.toFixed(1) : '7.0',
                  genre: tvData.genres ? tvData.genres.map(g=>g.name).join(' · ') : 'Drama',
                  synopsis: tvData.overview,
                  poster: tvData.poster_path ? `https://image.tmdb.org/t/p/w500${tvData.poster_path}` : '',
                  backdrop: tvData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tvData.backdrop_path}` : '',
                  platforms: [plat.name], reasons: ['Popular Series']
                };
                if (currentPopupMovie && currentPopupMovie.id === item.id) showPopup(resolvedDetails, card);
              });
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
}

// Override initHero
function initHero() {
  fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        // Pick random trending hero movie
        const movie = data.results[Math.floor(Math.random() * Math.min(5, data.results.length))];
        fetchTMDBDetails(movie.id).then(details => {
          if (details) {
            currentHeroMovie = details;
            updateHeroUI(details);
            syncWatchlistButtons();
          }
        });
      }
    });
}

// Override Surprise Me
function surpriseMe() {
  const orb = document.getElementById('surprise-btn');
  const result = document.getElementById('surprise-result');
  if (orb) orb.style.transform = 'scale(0.82)';
  setTimeout(() => { if (orb) orb.style.transform = ''; }, 200);

  if (result) result.classList.remove('show');
  
  // Get random popular movie from random page
  const page = Math.floor(Math.random() * 50) + 1;
  fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) {
        const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
        fetchTMDBDetails(randomMovie.id).then(movie => {
          if (!movie) return;
          currentSurpriseMovie = movie;
          setTimeout(() => {
            document.getElementById('s-img').src = movie.poster;
            document.getElementById('s-title').textContent = movie.title;
            document.getElementById('s-sub').textContent = `${movie.year} · ${movie.genre} · ★ ${movie.rating}`;
            document.getElementById('s-synopsis').textContent = movie.synopsis.slice(0, 115) + '…';
            document.getElementById('s-modal-btn').onclick = () => openModal(movie);
            document.getElementById('s-add-btn').onclick = () => addToWatchlist(movie, document.getElementById('s-add-btn'));
            syncWatchlistButtons();
            if (result) result.classList.add('show');
          }, 220);
        });
      }
    });
}

// Override Realtime Search & See All Buttons
window.addEventListener('DOMContentLoaded', () => {
  // 1. See All Buttons - Make them scroll the closest row
  document.querySelectorAll('.sec-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const rowWrap = e.target.closest('section').querySelector('.row-scroll, .plat-row');
      if (rowWrap) {
        rowWrap.scrollBy({ left: 800, behavior: 'smooth' });
      }
    });
  });

  // 2. Search Fix
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    // Clone to remove old ui.js listeners securely
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    let debounceTimer;
    newSearchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      const q = this.value.trim();
      const searchSec = document.getElementById('search-section');
      const searchResults = document.getElementById('search-results');
      const countEl = document.getElementById('search-count');
      
      if (!q) {
        if (searchSec) searchSec.style.display = 'none';
        return;
      }
      
      debounceTimer = setTimeout(() => {
        if (!searchResults) return;
        searchResults.innerHTML = '';
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`)
          .then(res => res.json())
          .then(data => {
            if (data.results && data.results.length > 0) {
              const matches = data.results.slice(0, 15);
              if (countEl) countEl.textContent = `${matches.length} found`;
              matches.forEach(m => {
                searchResults.appendChild(buildCard(m.id, m));
              });
            } else {
              if (countEl) countEl.textContent = `0 found`;
              searchResults.innerHTML = '<div style="padding: 24px; color: var(--t3); font-size: 13px;">No movies found matching that query.</div>';
            }
            if (searchSec) {
              searchSec.style.display = 'block';
              searchSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }).catch(err => {
            console.error("Search failed:", err);
          });
      }, 300);
    });
  }

  // Ensure scroll functions are globally available just in case
  window.scrollRow = function(id, dir) {
    const el = document.getElementById(id);
    if (el) el.scrollBy({ left: dir * 540, behavior: 'smooth' });
  };
  window.scrollPlat = function(platId, dir) {
    const el = document.getElementById('pr-' + platId);
    if (el) el.scrollBy({ left: dir * 600, behavior: 'smooth' });
  };
});
