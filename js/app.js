const API_KEY = 'e388f63b7dffb7485770ed8445c1f4a6';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

const moviesGrid = document.getElementById('movies-grid');
const tvGrid = document.getElementById('tv-grid');
const searchGrid = document.getElementById('search-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

const moviesSection = document.getElementById('movies-section');
const tvSection = document.getElementById('tv-section');
const searchSection = document.getElementById('search-section');

const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalVideo = document.getElementById('modal-video');
const serverSelect = document.getElementById('server');

const loading = document.getElementById('loading'); // NEW
const toast = document.getElementById('toast'); // NEW

const seasonEpisodeDiv = document.getElementById('season-episode-select');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');


let currentItem = null;

let genres = [];
async function fetchGenres() {
  try {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch genres');
    const data = await res.json();
    genres = data.genres;
  } catch (err) {
    genres = [];
  }
}


// --- NEW: Toast notification ---
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// --- NEW: Loading spinner helpers ---
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }

// --- NEW: Debounce function ---
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Set random trending movie as banner background
let bannerMovie = null; // Store the movie for the Watch Now button

async function setRandomBanner() {
  try {
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
      bannerMovie = randomMovie; // Save for Watch Now
      const banner = document.getElementById('hero-banner');
      if (randomMovie.backdrop_path) {
        banner.style.backgroundImage = `url(${IMG_URL}${randomMovie.backdrop_path})`;
      } else if (randomMovie.poster_path) {
        banner.style.backgroundImage = `url(${IMG_URL}${randomMovie.poster_path})`;
      } else {
        banner.style.backgroundImage = '';
      }
      // Set title and description
      document.getElementById('banner-movie-title').textContent = randomMovie.title || '';
      document.getElementById('banner-movie-desc').textContent = randomMovie.overview || '';
      // Show Watch Now button if we have a movie
      const watchBtn = document.getElementById('banner-watch-btn');
      watchBtn.style.display = 'inline-block';
    }
  } catch (err) {
    // fallback: no image or info
    document.getElementById('banner-movie-title').textContent = '';
    document.getElementById('banner-movie-desc').textContent = '';
    document.getElementById('banner-watch-btn').style.display = 'none';
  }
}



// Fetch trending movies
async function fetchTrendingMovies() {
  try {
    showLoading();
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movies');
    const data = await res.json();
    data.results.forEach(item => item.media_type = "movie");
    displayItems(data.results, moviesGrid);
  } catch (err) {
    showToast('Error loading trending movies.');
    moviesGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load movies.</p>';
  } finally {
    hideLoading();
  }
}

// Fetch trending TV shows
async function fetchTrendingTV() {
  try {
    showLoading();
    const url = `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch TV shows');
    const data = await res.json();
    data.results.forEach(item => item.media_type = "tv");
    displayItems(data.results, tvGrid);
  } catch (err) {
    showToast('Error loading trending TV shows.');
    tvGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load TV shows.</p>';
  } finally {
    hideLoading();
  }
}

// Search movies/TV shows
async function searchMovies(query) {
  try {
    showLoading();
    const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to search');
    const data = await res.json();
    const filtered = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
    displayItems(filtered, searchGrid);
    if (filtered.length === 0) showToast('No results found.');
    else showToast(`Found ${filtered.length} result${filtered.length > 1 ? 's' : ''}.`);
  } catch (err) {
    showToast('Error searching. Please try again.');
    searchGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to search.</p>';
  } finally {
    hideLoading();
  }
}

// Display items (movies or TV shows)
function displayItems(items, grid) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = '<p style="color:#b3b3b3;">No results found.</p>';
    return;
  }
  items.forEach(item => {
    const title = item.title || item.name;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
    const year = (item.release_date || item.first_air_date || '').slice(0,4);
    const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0'); // NEW: keyboard nav
    card.setAttribute('role', 'button'); // NEW: ARIA
    card.setAttribute('aria-label', title); // NEW: ARIA
    card.innerHTML = `
      <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-meta">${year} &middot; ⭐ ${vote}</div>
      </div>
    `;
    card.onclick = () => openModal(item);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(item); }; // NEW: keyboard
    grid.appendChild(card);
  });
}

// Modal logic
async function openModal(item) {
  currentItem = item;
  modalTitle.textContent = item.name || item.title;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';

  // Set genres
  let genreNames = [];
  if (item.genre_ids && genres.length > 0) {
    genreNames = item.genre_ids.map(id => {
      const genre = genres.find(g => g.id === id);
      return genre ? genre.name : '';
    }).filter(Boolean);
  } else if (item.genres && Array.isArray(item.genres)) {
    genreNames = item.genres.map(g => g.name);
  }
  document.getElementById('modal-genres').textContent = genreNames.length > 0 ? `Genres: ${genreNames.join(', ')}` : 'No genres available.';

  // If it's a TV show, fetch seasons and episodes
  if (item.media_type === "tv" || item.first_air_date) {
    await setupSeasonsAndEpisodes(item.id);
    seasonEpisodeDiv.style.display = '';
  } else {
    seasonEpisodeDiv.style.display = 'none';
  }

  serverSelect.value = "vidsrc.cc";
  changeServer();
  modal.style.display = 'flex';
  closeModalBtn.focus();
}

let currentSeason = 1;
let currentEpisode = 1;
let totalSeasons = 1;
let episodesList = [];

async function setupSeasonsAndEpisodes(tvId) {
  // Fetch TV show details to get seasons
  const url = `${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  totalSeasons = data.seasons.length;
  // Populate season select
  seasonSelect.innerHTML = '';
  data.seasons.forEach(season => {
    if (season.season_number === 0) return; // skip specials
    const opt = document.createElement('option');
    opt.value = season.season_number;
    opt.textContent = `Season ${season.season_number}`;
    seasonSelect.appendChild(opt);
  });
  currentSeason = data.seasons[0].season_number;
  await setupEpisodes(tvId, currentSeason);
}

async function setupEpisodes(tvId, seasonNumber) {
  // Fetch episodes for the selected season
  const url = `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  episodesList = data.episodes || [];
  episodeSelect.innerHTML = '';
  episodesList.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep.episode_number;
    opt.textContent = `Ep ${ep.episode_number}: ${ep.name}`;
    episodeSelect.appendChild(opt);
  });
  currentEpisode = episodesList[0]?.episode_number || 1;
  changeServer(); // Update player for first episode
}



document.getElementById('banner-watch-btn').onclick = function() {
  if (bannerMovie) {
    openModal(bannerMovie);
  }
};


function closeModal() {
  modal.style.display = 'none';
  modalVideo.src = '';
  currentItem = null;
}

// Change streaming server
// Change streaming server
function changeServer() {
  if (!currentItem) return;
  const server = serverSelect.value;
  let embedURL = "";

  if ((currentItem.media_type === "tv" || currentItem.first_air_date) && seasonEpisodeDiv.style.display !== 'none') {
    // TV show with season/episode
    const tvId = currentItem.id;
    const seasonNum = parseInt(seasonSelect.value) || 1;
    const episodeNum = parseInt(episodeSelect.value) || 1; // Keep the current episode number

    // Construct the embed URL based on the selected server
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/tv/?tmdb=${tvId}&season=${seasonNum}&episode=${episodeNum}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/tv/${tvId}-${seasonNum}-${episodeNum}`;
    } else if (server === "server1.com") {
      embedURL = `https://server2.com/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    } else if (server === "server2.com") {
      embedURL = `https://server2.com/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    }
  } else {
    // Movie or TV show without season/episode
    const type = currentItem.media_type === "movie" ? "movie" : "tv";
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
    } else if (server === "server1.com") {
      embedURL = `https://player.vidzee.wtf/embed/${type}/${currentItem.id}`;
    } else if (server === "server2.com") {
      embedURL = `https://autoembed.pro/embed/${type}/${currentItem.id}`;
    }
  }

  // Update the video source
  modalVideo.src = embedURL;
}

// --- Event listeners ---

// Debounced search (on input)
searchInput.addEventListener('input', debounce(() => {
  const query = searchInput.value.trim();
  if (query) {
    moviesSection.style.display = 'none';
    tvSection.style.display = 'none';
    searchSection.style.display = '';
    searchMovies(query);
  } else {
    moviesSection.style.display = '';
    tvSection.style.display = '';
    searchSection.style.display = 'none';
    fetchTrendingMovies();
    fetchTrendingTV();
  }
}, 400));

// On submit (for pressing enter)
searchForm.onsubmit = (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    moviesSection.style.display = 'none';
    tvSection.style.display = 'none';
    searchSection.style.display = '';
    searchMovies(query);
  } else {
    moviesSection.style.display = '';
    tvSection.style.display = '';
    searchSection.style.display = 'none';
    fetchTrendingMovies();
    fetchTrendingTV();
  }
};

closeModalBtn.onclick = closeModal;
closeModalBtn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') closeModal(); }; // NEW: keyboard

window.onclick = (e) => {
  if (e.target === modal) closeModal();
};

// NEW: Close modal on Escape key
window.addEventListener('keydown', (e) => {
  if (modal.style.display === 'flex' && e.key === 'Escape') {
    closeModal();
  }
});


serverSelect.onchange = changeServer;

seasonSelect.onchange = async function() {
  currentSeason = parseInt(this.value);
  await setupEpisodes(currentItem.id, currentSeason);
};

episodeSelect.onchange = function() {
  currentEpisode = parseInt(this.value);
  changeServer();
};


// Initial load
moviesSection.style.display = '';
tvSection.style.display = '';
searchSection.style.display = 'none';
fetchTrendingMovies();
fetchTrendingTV();


setRandomBanner();

fetchGenres();
