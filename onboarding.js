import { state } from './state.js?v=32';
import { TMDB_API_KEY } from './config.js?v=32';
import { addToWatchlist } from './ui.js?v=32';
import { MOVIES } from './data.js?v=32';

const ONBOARDING_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 36, name: "History" },
  { id: 10402, name: "Music" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
  { id: 99, name: "Documentary" },
  { id: 10759, name: "Action & Adventure" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 9001, name: "Anime" },
  { id: 9002, name: "Indie" },
  { id: 9003, name: "Classic" },
  { id: 9004, name: "Sports" },
  { id: 9005, name: "Biographical" },
  { id: 9006, name: "Musical" },
  { id: 9007, name: "Superhero" },
  { id: 9008, name: "Dark Comedy" },
  { id: 9009, name: "Coming-of-Age" },
  { id: 9010, name: "Neo-Noir" },
  { id: 9011, name: "Cult Classic" },
  { id: 10767, name: "Reality TV" }
];

const ONBOARDING_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "ml", name: "Malayalam" },
  { code: "kn", name: "Kannada" },
  { code: "bn", name: "Bengali" },
  { code: "zh", name: "Mandarin" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "tr", name: "Turkish" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "pl", name: "Polish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "el", name: "Greek" },
  { code: "da", name: "Danish" }
];

let selectedGenres = new Set();
let selectedLanguages = new Set();
let selectedTalents = []; // array of { id, name, role }
let swipeQueue = [];
let swipedLikes = [];
let swipedDislikes = [];
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let dragCard = null;
let talentSuggestionsTimeout = null;

// On DOM load, initialize selectors and check status
window.addEventListener('DOMContentLoaded', () => {
  initPills();
  initTalentInput();
  window.checkOnboardingState();
});

// Expose state checker globally
window.checkOnboardingState = function() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  if (state.isLoggedIn && localStorage.getItem('swipe_onboarding_completed') !== 'true') {
    // Clear legacy ratings and watchlist to ensure a fresh curation session
    localStorage.setItem('user_movie_ratings', '{}');
    localStorage.setItem('watchlist', '[]');
    state.watchlist = [];
    if (window.updateWLCount) window.updateWLCount();
    if (window.updateWatchlistUI) window.updateWatchlistUI();

    overlay.style.display = 'block';
    document.body.classList.add('onboarding-active');
    document.body.classList.remove('show-landing-page');
    document.body.classList.remove('not-logged-in');
    // Hide standard navbar and main contents
    const nav = document.getElementById('nav');
    const main = document.querySelector('main');
    if (nav) nav.style.setProperty('display', 'none', 'important');
    if (main) main.style.setProperty('display', 'none', 'important');
  } else {
    overlay.style.display = 'none';
    document.body.classList.remove('onboarding-active');
    const nav = document.getElementById('nav');
    const main = document.querySelector('main');
    if (nav) nav.style.removeProperty('display');
    if (main) main.style.removeProperty('display');
  }
};

// ─── INITIALIZE PILLS ───
function initPills() {
  const genreContainer = document.getElementById('onboarding-genre-pills');
  const langContainer = document.getElementById('onboarding-lang-pills');

  let genreLimit = 13;
  let langLimit = 6;

  function renderGenres() {
    if (!genreContainer) return;
    const items = ONBOARDING_GENRES.slice(0, genreLimit);
    
    let html = items.map(g => {
      const activeClass = selectedGenres.has(g.id) ? 'active' : '';
      return `<div class="genre-pill ${activeClass}" data-id="${g.id}">${g.name}</div>`;
    }).join('');
    
    // Only append Load More button if we haven't reached the end and haven't exceeded 8 clicks (13 + 8*4 = 45)
    if (genreLimit < ONBOARDING_GENRES.length && genreLimit < 45) {
      html += `<div class="genre-pill load-more-btn" style="background:rgba(255,255,255,0.05);color:var(--t2)">+ Load More</div>`;
    }
    
    genreContainer.innerHTML = html;
    
    genreContainer.querySelectorAll('.genre-pill:not(.load-more-btn)').forEach(pill => {
      pill.addEventListener('click', () => {
        const id = Number(pill.dataset.id);
        if (selectedGenres.has(id)) {
          selectedGenres.delete(id);
          pill.classList.remove('active');
        } else {
          selectedGenres.add(id);
          pill.classList.add('active');
        }
      });
    });

    const loadMore = genreContainer.querySelector('.load-more-btn');
    if (loadMore) {
      loadMore.addEventListener('click', () => {
        genreLimit += 4;
        renderGenres();
      });
    }
  }

  function renderLangs() {
    if (!langContainer) return;
    const items = ONBOARDING_LANGUAGES.slice(0, langLimit);
    
    let html = items.map(l => {
      const activeClass = selectedLanguages.has(l.code) ? 'active' : '';
      return `<div class="lang-pill ${activeClass}" data-code="${l.code}">${l.name}</div>`;
    }).join('');
    
    // Max 8 clicks (6 + 8*4 = 38)
    if (langLimit < ONBOARDING_LANGUAGES.length && langLimit < 38) {
      html += `<div class="lang-pill load-more-btn" style="background:rgba(255,255,255,0.05);color:var(--t2)">+ Load More</div>`;
    }
    
    langContainer.innerHTML = html;
    
    langContainer.querySelectorAll('.lang-pill:not(.load-more-btn)').forEach(pill => {
      pill.addEventListener('click', () => {
        const code = pill.dataset.code;
        if (selectedLanguages.has(code)) {
          selectedLanguages.delete(code);
          pill.classList.remove('active');
        } else {
          selectedLanguages.add(code);
          pill.classList.add('active');
        }
      });
    });

    const loadMore = langContainer.querySelector('.load-more-btn');
    if (loadMore) {
      loadMore.addEventListener('click', () => {
        langLimit += 4;
        renderLangs();
      });
    }
  }

  renderGenres();
  renderLangs();
}

// ─── TALENT AUTOCOMPLETE TAG INPUT ───
function initTalentInput() {
  const input = document.getElementById('onboarding-talent-input');
  const suggestions = document.getElementById('onboarding-talent-suggestions');

  if (!input || !suggestions) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearTimeout(talentSuggestionsTimeout);

    if (val.length < 2) {
      suggestions.style.display = 'none';
      return;
    }

    talentSuggestionsTimeout = setTimeout(() => {
      if (TMDB_API_KEY) {
        fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(val)}`)
          .then(r => r.json())
          .then(data => {
            const results = (data.results || []).slice(0, 5);
            renderSuggestions(results);
          });
      } else {
        // Offline matches
        const matches = [];
        const seen = new Set();
        MOVIES.forEach(m => {
          const cast = (m.cast || '').split(',').map(x => x.trim());
          cast.forEach(actor => {
            if (actor.toLowerCase().includes(val.toLowerCase()) && !seen.has(actor.toLowerCase())) {
              seen.add(actor.toLowerCase());
              matches.push({ id: actor, name: actor, known_for_department: 'Acting' });
            }
          });
        });
        renderSuggestions(matches.slice(0, 5));
      }
    }, 250);
  });

  // Hide suggestions dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = 'none';
    }
  });

  function renderSuggestions(list) {
    if (list.length === 0) {
      suggestions.style.display = 'none';
      return;
    }

    suggestions.innerHTML = list.map(item => {
      const role = item.known_for_department === 'Directing' ? 'Director' : 'Actor';
      return `
        <div class="actor-suggestion-item" data-id="${item.id}" data-name="${item.name}" data-role="${role}">
          <i class="fa-solid ${role === 'Director' ? 'fa-video' : 'fa-user'}" style="color:var(--t3);font-size:11px"></i>
          <span>${item.name} <small style="color:var(--t3)">(${role})</small></span>
        </div>
      `;
    }).join('');

    suggestions.style.display = 'block';

    suggestions.querySelectorAll('.actor-suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        addTalentTag({
          id: item.dataset.id,
          name: item.dataset.name,
          role: item.dataset.role
        });
        input.value = '';
        suggestions.style.display = 'none';
      });
    });
  }
}

function addTalentTag(talent) {
  if (selectedTalents.find(t => String(t.id) === String(talent.id))) return;
  selectedTalents.push(talent);
  renderTalentTags();
}

function removeTalentTag(id) {
  selectedTalents = selectedTalents.filter(t => String(t.id) !== String(id));
  renderTalentTags();
}

function renderTalentTags() {
  const container = document.getElementById('onboarding-talent-tags');
  if (!container) return;

  container.innerHTML = selectedTalents.map(t => `
    <span class="talent-tag">
      <span>${t.name}</span>
      <i class="fa-solid fa-xmark" data-id="${t.id}"></i>
    </span>
  `).join('');

  container.querySelectorAll('i').forEach(icon => {
    icon.addEventListener('click', () => {
      removeTalentTag(icon.dataset.id);
    });
  });
}

// ─── SUBMIT TASTE PREFERENCES & START SWIPING ───
window.submitOnboardingPreferences = function() {
  // If nothing is selected, select action/drama/comedy and english/spanish as default fallback interest setup
  if (selectedGenres.size === 0) selectedGenres.add(28).add(18).add(35);
  if (selectedLanguages.size === 0) selectedLanguages.add('en');

  const setupView = document.getElementById('onboarding-setup-view');
  const swipeView = document.getElementById('onboarding-swipe-view');

  if (setupView) setupView.style.display = 'none';
  if (swipeView) swipeView.style.display = 'block';

  fetchOnboardingQueue(() => {
    swipedLikes = [];
    updateProgressBar();
    renderNextDeckCards();
  });
};

function fetchOnboardingQueue(callback) {
  swipeQueue = [];

  if (TMDB_API_KEY) {
    const genreStr = Array.from(selectedGenres).join(',');
    const langStr = Array.from(selectedLanguages).join('|');
    const peopleStr = selectedTalents.map(t => t.id).join(',');

    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1`;
    if (genreStr) url += `&with_genres=${genreStr}`;
    if (langStr) url += `&with_original_language=${langStr}`;
    if (peopleStr) url += `&with_people=${peopleStr}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          swipeQueue = data.results
            .filter(m => !m.release_date || new Date(m.release_date) <= new Date())
            .map(m => mapTmdbMovieToLocal(m));
        }
        fallbackIfQueueEmpty();
        callback();
      })
      .catch(() => {
        fallbackOfflineQueue();
        callback();
      });
  } else {
    fallbackOfflineQueue();
    callback();
  }
}

function fallbackIfQueueEmpty() {
  if (swipeQueue.length === 0) {
    swipeQueue = MOVIES.slice(0, 15);
  }
}

function fallbackOfflineQueue() {
  swipeQueue = MOVIES.filter(m => {
    let matchGenre = selectedGenres.size === 0;
    if (!matchGenre) {
      const activeGenreNames = Array.from(selectedGenres).map(id => {
        return ONBOARDING_GENRES.find(g => g.id === id)?.name || '';
      });
      matchGenre = activeGenreNames.some(gName => (m.genre || '').toLowerCase().includes(gName.toLowerCase()));
    }
    return matchGenre;
  }).map(m => {
    const genreNames = (m.genre || '').split('|').map(x => x.trim().toLowerCase());
    const gIds = ONBOARDING_GENRES.filter(g => genreNames.includes(g.name.toLowerCase())).map(g => g.id);
    return {
      ...m,
      genres: m.genre ? m.genre.split('|').join(' · ') : '',
      genreIds: gIds
    };
  });
  fallbackIfQueueEmpty();
}

function mapTmdbMovieToLocal(m) {
  const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1549032305-e816fabf0dd2?w=400&q=80';
  const backdrop = m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : poster;
  return {
    id: m.id,
    title: m.title,
    poster: poster,
    backdrop: backdrop,
    rating: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
    year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
    genres: (m.genre_ids || []).map(id => ONBOARDING_GENRES.find(g => g.id === id)?.name).filter(Boolean).join(' · '),
    genreIds: m.genre_ids || [],
    overview: m.overview || '',
    type: 'movie'
  };
}

// ─── RENDER CARDS ───
function renderNextDeckCards() {
  const stack = document.getElementById('onboarding-card-stack');
  if (!stack) return;

  stack.innerHTML = '';

  if (swipeQueue.length === 0) {
    // Reload a fallback batch if user swipes past everything
    swipeQueue = MOVIES.slice(0, 10);
  }

  const count = Math.min(3, swipeQueue.length);
  for (let i = count - 1; i >= 0; i--) {
    const movie = swipeQueue[i];
    const card = document.createElement('div');
    card.className = 'swipe-card';
    
    const scale = 1 - (i * 0.04);
    const translateY = i * 12;
    card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    card.style.zIndex = String(10 - i);
    card.style.opacity = String(1 - (i * 0.15));

    let displayPoster = movie.poster;
    if (displayPoster && displayPoster.includes('image.tmdb.org')) {
      displayPoster = `https://images.weserv.nl/?url=${encodeURIComponent(displayPoster)}`;
    }

    card.innerHTML = `
      <img src="${displayPoster}" alt="${movie.title}"/>
      <div class="swipe-card-overlay"></div>
      <div class="swipe-card-info">
        <h3 class="swipe-card-title">${movie.title}</h3>
        <div class="swipe-card-meta">
          <span class="swipe-card-badge">${movie.year}</span>
          <span>★ ${movie.rating}</span>
        </div>
      </div>
    `;

    stack.appendChild(card);

    if (i === 0) {
      setupCardGestures(card, movie);
    }
  }
}

// ─── CARD GESTURES ───
function setupCardGestures(cardEl, movie) {
  cardEl.addEventListener('mousedown', dragStart);
  cardEl.addEventListener('touchstart', dragStart, { passive: true });

  function dragStart(e) {
    if (isDragging) return;
    isDragging = true;
    dragCard = cardEl;
    dragCard.style.transition = 'none';

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  }

  function dragMove(e) {
    if (!isDragging || dragCard !== cardEl) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    currentX = clientX - startX;
    currentY = clientY - startY;

    const rotation = currentX * 0.08;
    dragCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
  }

  function dragEnd() {
    if (!isDragging || dragCard !== cardEl) return;
    isDragging = false;
    dragCard.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';

    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchend', dragEnd);

    const threshold = 120;

    if (currentX > threshold) {
      throwCard('right');
    } else if (currentX < -threshold) {
      throwCard('left');
    } else if (currentY < -threshold && Math.abs(currentX) < 100) {
      throwCard('up');
    } else {
      dragCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
      currentX = 0;
      currentY = 0;
    }
  }

  function throwCard(direction) {
    let targetTransform = '';
    if (direction === 'right') {
      targetTransform = `translate(${window.innerWidth}px, ${currentY}px) rotate(45deg)`;
      window.handleOnboardingSwipeAction('right');
    } else if (direction === 'left') {
      targetTransform = `translate(${-window.innerWidth}px, ${currentY}px) rotate(-45deg)`;
      window.handleOnboardingSwipeAction('left');
    } else if (direction === 'up') {
      targetTransform = `translate(${currentX}px, ${-window.innerHeight}px) rotate(0deg)`;
      window.handleOnboardingSwipeAction('skip');
    }

    // Decouple the card from the stack so it isn't destroyed when the stack re-renders
    const parentContainer = dragCard.closest('.swipe-deck-container');
    if (parentContainer) {
      const rect = dragCard.getBoundingClientRect();
      const parentRect = parentContainer.getBoundingClientRect();
      dragCard.style.position = 'absolute';
      dragCard.style.top = `${rect.top - parentRect.top}px`;
      dragCard.style.left = `${rect.left - parentRect.left}px`;
      dragCard.style.width = `${rect.width}px`;
      dragCard.style.height = `${rect.height}px`;
      dragCard.style.zIndex = '9999';
      parentContainer.appendChild(dragCard);
    }

    dragCard.style.transform = targetTransform;
    dragCard.style.opacity = '0';

    const cardToRemove = dragCard;
    setTimeout(() => {
      cardToRemove.remove();
    }, 450);

    currentX = 0;
    currentY = 0;
  }
}

// ─── PROGRAMMATIC SWIPE (BUTTONS) ───
window.triggerSwipeAnimation = function(direction) {
  const stack = document.getElementById('onboarding-card-stack');
  if (!stack || !stack.lastElementChild) return;
  
  const topCard = stack.lastElementChild;
  topCard.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
  
  let targetTransform = '';
  if (direction === 'right') {
    targetTransform = `translate(${window.innerWidth}px, 0px) rotate(45deg)`;
  } else if (direction === 'left') {
    targetTransform = `translate(${-window.innerWidth}px, 0px) rotate(-45deg)`;
  } else if (direction === 'skip') {
    targetTransform = `translate(0px, ${-window.innerHeight}px) rotate(0deg)`;
  }
  
  const parentContainer = topCard.closest('.swipe-deck-container');
  if (parentContainer) {
    const rect = topCard.getBoundingClientRect();
    const parentRect = parentContainer.getBoundingClientRect();
    topCard.style.position = 'absolute';
    topCard.style.top = `${rect.top - parentRect.top}px`;
    topCard.style.left = `${rect.left - parentRect.left}px`;
    topCard.style.width = `${rect.width}px`;
    topCard.style.height = `${rect.height}px`;
    topCard.style.zIndex = '9999';
    parentContainer.appendChild(topCard);
  }

  // Force reflow
  void topCard.offsetWidth;

  topCard.style.transform = targetTransform;
  topCard.style.opacity = '0';
  
  setTimeout(() => {
    topCard.remove();
  }, 450);

  window.handleOnboardingSwipeAction(direction);
};

// ─── SWIPE ACTIONS ───
window.handleOnboardingSwipeAction = function(action) {
  if (swipeQueue.length === 0) return;

  const movie = swipeQueue.shift();

  if (action === 'right') {
    swipedLikes.push(movie);
    // Mark movie as watched
    if (window.markMovieAsWatched) {
      window.markMovieAsWatched(movie);
    }

    // Learning feedback loop: fetch recommendations
    if (TMDB_API_KEY) {
      fetch(`https://api.themoviedb.org/3/movie/${movie.id}/recommendations?api_key=${TMDB_API_KEY}`)
        .then(r => r.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const list = data.results
              .filter(m => !m.release_date || new Date(m.release_date) <= new Date())
              .map(m => mapTmdbMovieToLocal(m))
              .filter(rec => {
              return !swipeQueue.find(q => q.id === rec.id) && !swipedLikes.find(l => l.id === rec.id) && !swipedDislikes.find(d => d.id === rec.id);
            });
            swipeQueue.push(...list.slice(0, 5));
          }
        });
    } else {
      // Local fallback matches
      const genreNames = (movie.genres || '').split('·').map(x => x.trim());
      const localMatches = MOVIES.filter(m => {
        const notInQueue = !swipeQueue.find(q => q.id === m.id) && !swipedLikes.find(l => l.id === m.id) && !swipedDislikes.find(d => d.id === m.id);
        const genreShares = genreNames.some(gName => (m.genre || '').includes(gName));
        return notInQueue && genreShares;
      });
      swipeQueue.push(...localMatches.slice(0, 5));
    }
  } else if (action === 'left') {
    swipedDislikes.push(movie);
    // Purge skipped/disliked ID from the queue
    swipeQueue = swipeQueue.filter(m => m.id !== movie.id);
  }

  updateProgressBar();

  if (swipedLikes.length >= 10) {
    completeOnboarding();
  } else {
    renderNextDeckCards();
  }
};

function updateProgressBar() {
  const text = document.getElementById('onboarding-progress-text');
  const bar = document.getElementById('onboarding-progress-bar');
  if (text) text.textContent = `Likes: ${swipedLikes.length} / 10`;
  if (bar) {
    const percent = Math.min(100, (swipedLikes.length / 10) * 100);
    bar.style.width = percent + '%';
  }
}

// ─── COMPLETE ONBOARDING & CURATE HOME rows ───
function completeOnboarding() {
  const swipeView = document.getElementById('onboarding-swipe-view');
  const loadingView = document.getElementById('onboarding-loading-view');
  const statusText = document.getElementById('onboarding-loading-status');

  if (swipeView) swipeView.style.display = 'none';
  if (loadingView) loadingView.style.display = 'block';

  // Calculate exclusions: find genres where dislikes > likes
  const genreLikesCount = {};
  const genreDislikesCount = {};

  swipedLikes.forEach(m => {
    (m.genreIds || []).forEach(id => {
      genreLikesCount[id] = (genreLikesCount[id] || 0) + 1;
    });
  });

  swipedDislikes.forEach(m => {
    (m.genreIds || []).forEach(id => {
      genreDislikesCount[id] = (genreDislikesCount[id] || 0) + 1;
    });
  });

  const excludedGenres = [];
  Object.keys(genreDislikesCount).forEach(id => {
    const dislikes = genreDislikesCount[id];
    const likes = genreLikesCount[id] || 0;
    if (dislikes > likes) {
      excludedGenres.push(Number(id));
    }
  });

  // Save selection states
  localStorage.setItem('swipe_onboarding_completed', 'true');
  localStorage.setItem('onboarding_genres', JSON.stringify(Array.from(selectedGenres)));
  localStorage.setItem('onboarding_languages', JSON.stringify(Array.from(selectedLanguages)));
  localStorage.setItem('onboarding_talents', JSON.stringify(selectedTalents));
  localStorage.setItem('onboarding_likes', JSON.stringify(swipedLikes.map(m => m.id)));
  localStorage.setItem('onboarding_dislikes', JSON.stringify(swipedDislikes.map(m => m.id)));
  localStorage.setItem('onboarding_excluded_genres', JSON.stringify(excludedGenres));

  // Simulate AI curation updates
  const statuses = [
    "Analyzing your taste markers...",
    "Curating custom rows for genres and languages...",
    "Highlighting favorite cast & directors spotlight...",
    "Synchronizing recommendations feed..."
  ];

  let step = 0;
  const interval = setInterval(() => {
    if (step < statuses.length) {
      if (statusText) statusText.textContent = statuses[step];
      step++;
    } else {
      clearInterval(interval);
      
      // Reload homepage recommendations dynamically
      if (window.renderHomeSections) {
        window.renderHomeSections();
      }

      // Hide Onboarding overlay
      window.checkOnboardingState();
    }
  }, 600);
}
