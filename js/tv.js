const API_KEY = 'e388f63b7dffb7485770ed8445c1f4a6';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

const tvGrid = document.getElementById('tv-grid');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalVideo = document.getElementById('modal-video');
const serverSelect = document.getElementById('server');
//const pageInfo = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const sortPopularBtn = document.getElementById('sort-popular');
const sortOldestBtn = document.getElementById('sort-oldest'); // This button doesn't exist in HTML, but keeping for now
const tvTitle = document.getElementById('tv-title');
const genreSelect = document.getElementById('genre-select');

const seasonEpisodeDiv = document.getElementById('season-episode-select');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');

const sortTopRatedBtn = document.getElementById('sort-top-rated');

// NEW: Search elements - Updated to match new HTML structure
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchGrid = document.getElementById('search-grid');
const searchSection = document.getElementById('search-section'); // The new section for search results


let genres = [];
let selectedGenre = '';


let currentPage = 1;
let totalPages = 1;
let sortBy = 'popularity.desc'; // or 'first_air_date.asc'
let currentItem = null;

// Toast
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Loading
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }

// NEW: Debounce function (copied from app.js)
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function updatePagination() {
  const container = document.getElementById('page-numbers');
  container.innerHTML = '';

  // Create a page button
  const makeBtn = (num) => {
    const btn = document.createElement('button');
    btn.className = 'page-number';
    btn.textContent = num;
    if(num === currentPage) btn.classList.add('active');
    
    btn.addEventListener('click', () => {
      if(num !== currentPage) {
        currentPage = num;
        if(window.location.pathname.includes('movies.html')) {
          fetchMovies(currentPage, sortBy);
        } else {
          fetchTV(currentPage, sortBy);
        }
      }
    });
    
    return btn;
  };

  // Always show first page
  container.appendChild(makeBtn(1));

  // Show left gap if needed
  if(currentPage > 3) {
    const dots = document.createElement('span');
    dots.className = 'dots';
    dots.textContent = '...';
    container.appendChild(dots);
  }

  // Middle pages (current-1 to current+1)
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for(let i = start; i <= end; i++) {
    container.appendChild(makeBtn(i));
  }

  // Show right gap if needed
  if(currentPage < totalPages - 2) {
    const dots = document.createElement('span');
    dots.className = 'dots';
    dots.textContent = '...';
    container.appendChild(dots);
  }

  // Show last page if different from first
  if(totalPages > 1) {
    container.appendChild(makeBtn(totalPages));
  }
}


function createPageNumber(number, currentPage) {
  const pageNumbers = document.getElementById('page-numbers');

  // Create a button for the page number
  const pageNumber = document.createElement('button');
  pageNumber.classList.add('page-number');

  // Set the active class if this is the current page
  if (number === currentPage) {
    pageNumber.classList.add('active');
  }

  pageNumber.textContent = number;

  // Add click event listener to change the page
  pageNumber.addEventListener('click', () => {
    // Update the current page
    currentPage = number;

  // TV shows for the selected page
      fetchTV(currentPage, sortBy);


    // Update the pagination to reflect the new current page
    updatePagination(currentPage, totalPages);
  });

  // Append the page number button to the pagination container
  pageNumbers.appendChild(pageNumber);
}


function createDots() {
  const pageNumbers = document.getElementById('page-numbers');
  const dots = document.createElement('span');
  dots.classList.add('dots');
  dots.textContent = '...';
  pageNumbers.appendChild(dots);
}

// Fetch TV shows (main grid)
async function fetchTV(page = 1, sort = 'popularity.desc') {
  try {
    showLoading();
    searchSection.style.display = 'none';
    tvGrid.style.display = 'grid';

    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';

    //PUTANGINA SAKIT MO SA ULO JS
    let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&page=${page}`;

    if (sort === 'popularity.desc') {
        url += `&sort_by=popularity.desc`;
    } else if (sort === 'top_rated_latest') {
        url += `&sort_by=vote_average.desc`;
        url += `&first_air_date.gte=1900-01-01&first_air_date.lte=2025-12-31`;
        url += `&sort_by=first_air_date.desc`;
        url += `&vote_count.gte=100`;
        url += `&vote_average.gte=6.0`;
    } else {
        url += `&sort_by=${sort}`;
    }

    if (selectedGenre) url += `&with_genres=${selectedGenre}`;
    
    console.log("Fetching TV shows from URL:", url); // Log the URL being fetched
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch TV shows');
    
    const data = await res.json();
    console.log("TV shows data:", data); // Log the response data

    totalPages = Math.min(data.total_pages, 500);
    displayItems(data.results, tvGrid);
    updatePagination(); // Call without parameters, as it uses global variables
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    if (data.results.length === 0) showToast('No TV shows found.');
  } catch (err) {
    console.error(err); // Log the error for debugging
    showToast('Error loading TV shows.');
    tvGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load TV shows.</p>';
  } finally {
    hideLoading();
  }
}


// NEW: Search TV shows function (adapted from app.js)
async function searchTV(query) {
  try {
    showLoading();
    // Hide main TV show grid and show search results grid
    tvGrid.style.display = 'none';
    searchSection.style.display = 'block';
    // Hide pagination for search results
    prevPageBtn.style.display = 'none';
    nextPageBtn.style.display = 'none';
    pageInfo.style.display = 'none';

    const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to search');
    const data = await res.json();
    displayItems(data.results, searchGrid); // Use displayItems for consistency
    if (data.results.length === 0) showToast('No results found.');
    else showToast(`Found ${data.results.length} result${data.results.length > 1 ? 's' : ''}.`);
  } catch (err) {
    showToast('Error searching. Please try again.');
    searchGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to search.</p>';
  } finally {
    hideLoading();
  }
}


async function fetchGenres() {
  try {
    const url = `${BASE_URL}/genre/tv/list?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch genres');
    const data = await res.json();
    genres = data.genres;
    genreSelect.innerHTML = `<option value="">All</option>` +
      genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  } catch (err) {
    showToast('Error loading genres.');
  }
}


function displayItems(items, grid) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = '<p style="color:#b3b3b3;">No TV shows found.</p>';
    return;
  }
  items.forEach(item => {
    const title = item.name || item.title;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
    const year = (item.first_air_date || '').slice(0,4);
    const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', title);
    card.innerHTML = `
      <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-meta">${year} &middot; ⭐ ${vote}</div>
      </div>
    `;
    card.onclick = () => openModal(item);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(item); };
    grid.appendChild(card);
  });
}

// Modal logic (same as index)
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

function closeModal() {
  modal.style.display = 'none';
  modalVideo.src = '';
  currentItem = null;
}
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
    } else if (server === "vidzee.wtf") {
      embedURL = `https://player.vidzee.wtf/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    }else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/tv/${tvId}-${seasonNum}-${episodeNum}`;
    }  else if (server === "autoembed.pro") {
      embedURL = `https://autoembed.pro/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    }
  } else {
    // Movie or TV show without season/episode
    const type = currentItem.media_type === "movie" ? "movie" : "tv"; // Ensure type is 'tv' for TV shows
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    } else if (server === "vidzee.wtf") {
      embedURL = `https://player.vidzee.wtf/embed/${type}/${currentItem.id}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
    } else if (server === "autoembed.pro") {
      embedURL = `https://autoembed.pro/embed/${type}/${currentItem.id}`;
    }
  }

  // Update the video source
  modalVideo.src = embedURL;
}

// Event listeners
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    fetchTV(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
nextPageBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchTV(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
sortPopularBtn.onclick = () => {
  sortBy = 'popularity.desc';
  tvTitle.textContent = 'Popular TV Shows';
  currentPage = 1;
  fetchTV(currentPage, sortBy);
  sortPopularBtn.classList.add('active');
  sortTopRatedBtn.classList.remove('active'); // Ensure other sort buttons are inactive
  // Show pagination and main grid
  prevPageBtn.style.display = '';
  nextPageBtn.style.display = '';
  pageInfo.style.display = '';
  tvGrid.style.display = 'grid';
  searchSection.style.display = 'none';
};


function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Event listeners
    sortTopRatedBtn.onclick = async () => {
      tvGrid.style.display = 'grid';
      searchSection.style.display = 'none';

      // NEW: Set sortBy to the specific value for Top Rated (Latest)
      sortBy = 'top_rated_latest';
      tvTitle.textContent = 'Top Rated TV Shows';
      currentPage = 1;

      await fetchTV(currentPage, sortBy); // Pass the new sortBy value

      sortTopRatedBtn.classList.add('active');
      sortPopularBtn.classList.remove('active');
    };

// NEW: Debounced search (on input)
searchInput.addEventListener('input', debounce(() => {
  const query = searchInput.value.trim();
  if (query) {
    searchTV(query);
  } else {
    // If search input is cleared, revert to showing popular TV shows
    tvTitle.textContent = 'Popular TV Shows';
    currentPage = 1;
    fetchTV(currentPage, sortBy);
    sortPopularBtn.classList.add('active');
    sortTopRatedBtn.classList.remove('active');
    // Show pagination and main grid
    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';
    pageInfo.style.display = '';
    tvGrid.style.display = 'grid';
    searchSection.style.display = 'none';
  }
}, 400));

// NEW: On submit (for pressing enter)
searchForm.onsubmit = (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    searchTV(query);
  } else {
    // If search input is cleared, revert to showing popular TV shows
    tvTitle.textContent = 'Popular TV Shows';
    currentPage = 1;
    fetchTV(currentPage, sortBy);
    sortPopularBtn.classList.add('active');
    sortTopRatedBtn.classList.remove('active');
    // Show pagination and main grid
    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';
    pageInfo.style.display = '';
    tvGrid.style.display = 'grid';
    searchSection.style.display = 'none';
  }
};


closeModalBtn.onclick = closeModal;
closeModalBtn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') closeModal(); };
window.onclick = (e) => { if (e.target === modal) closeModal(); };
window.addEventListener('keydown', (e) => {
  if (modal.style.display === 'flex' && e.key === 'Escape') closeModal();
});
serverSelect.onchange = changeServer;

genreSelect.onchange = () => {
  selectedGenre = genreSelect.value;
  currentPage = 1;
  fetchTV(currentPage, sortBy);
  // Ensure pagination is visible when filtering by genre
  prevPageBtn.style.display = '';
  nextPageBtn.style.display = '';
  pageInfo.style.display = '';
  tvGrid.style.display = 'grid';
  searchSection.style.display = 'none';
};

seasonSelect.onchange = async function() {
  currentSeason = parseInt(this.value);
  await setupEpisodes(currentItem.id, currentSeason);
};

episodeSelect.onchange = function() {
  currentEpisode = parseInt(this.value);
  changeServer();
};


// Initial load
sortPopularBtn.classList.add('active');
fetchGenres();
fetchTV(currentPage, sortBy);
