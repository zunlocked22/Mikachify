const API_KEY = 'e388f63b7dffb7485770ed8445c1f4a6';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

const moviesGrid = document.getElementById('movies-grid');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalVideo = document.getElementById('modal-video');
const serverSelect = document.getElementById('server');
const pageInfo = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const sortPopularBtn = document.getElementById('sort-popular');
const sortOldestBtn = document.getElementById('sort-oldest'); // This button doesn't exist in HTML, but keeping for now
const moviesTitle = document.getElementById('movies-title');
const genreSelect = document.getElementById('genre-select');

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
let sortBy = 'popularity.desc'; // or 'release_date.asc'
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

// Fetch movies (main grid)
async function fetchMovies(page = 1, sort = 'popularity.desc') {
  try {
    showLoading();
    searchSection.style.display = 'none';
    moviesGrid.style.display = 'grid';

    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';
    pageInfo.style.display = '';

    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${page}`;

    if (sort === 'popularity.desc') {
        url += `&sort_by=popularity.desc`;
    } else if (sort === 'top_rated_latest') {
        url += `&sort_by=vote_average.desc`; // Primary sort by vote average
        url += `&primary_release_date.gte=1900-01-01&primary_release_date.lte=2025-12-31`; // Date range
        url += `&sort_by=primary_release_date.desc`; // Secondary sort by latest release date

        // NEW: Filters to exclude N/A ratings and ensure sufficient votes
        url += `&vote_count.gte=100`; // Only include movies with at least 100 votes
        url += `&vote_average.gte=6.0`; // Only include movies with an average rating of 6.0 or higher
    } else {
        url += `&sort_by=${sort}`;
    }

    if (selectedGenre) url += `&with_genres=${selectedGenre}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movies');
    const data = await res.json();
    totalPages = Math.min(data.total_pages, 500);
    displayItems(data.results, moviesGrid);
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    if (data.results.length === 0) showToast('No movies found.');
  } catch (err) {
    showToast('Error loading movies.');
    moviesGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load movies.</p>';
  } finally {
    hideLoading();
  }
}

    

// NEW: Search movies function (adapted from app.js)
async function searchMovies(query) {
  try {
    showLoading();
    // Hide main movie grid and show search results grid
    moviesGrid.style.display = 'none';
    searchSection.style.display = 'block';
    // Hide pagination for search results
    prevPageBtn.style.display = 'none';
    nextPageBtn.style.display = 'none';
    pageInfo.style.display = 'none';


    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
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
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
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

// Renamed from displayMovies to displayItems for reusability with searchGrid
function displayItems(items, grid) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = '<p style="color:#b3b3b3;">No movies found.</p>';
    return;
  }
  items.forEach(item => {
    const title = item.title || item.name;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
    const year = (item.release_date || '').slice(0,4);
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
function openModal(item) {
  currentItem = item;
  modalTitle.textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';

  // Set genres
  const genreNames = item.genre_ids.map(id => {
    const genre = genres.find(g => g.id === id);
    return genre ? genre.name : '';
  }).filter(Boolean);
  document.getElementById('modal-genres').textContent = genreNames.length > 0 ? `Genres: ${genreNames.join(', ')}` : 'No genres available.';

  serverSelect.value = "vidsrc.cc";
  changeServer();
  modal.style.display = 'flex';
  closeModalBtn.focus();
}

function closeModal() {
  modal.style.display = 'none';
  modalVideo.src = '';
  currentItem = null;
}
function changeServer() {
  if (!currentItem) return;
  const server = serverSelect.value;
  const type = "movie";
  let embedURL = "";
  if (server === "vidsrc.cc") {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  } else if (server === "vidzee.wtf") {
    embedURL = `https://player.vidzee.wtf/embed/${type}/${currentItem.id}`;
  }else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }else if (server === "autoembed.pro") {
    embedURL = `https://autoembed.pro/embed/${type}/${currentItem.id}`;
  }
  modalVideo.src = embedURL;
}

// Event listeners
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    fetchMovies(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
nextPageBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchMovies(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
sortPopularBtn.onclick = () => {
  sortBy = 'popularity.desc';
  moviesTitle.textContent = 'Popular Movies';
  currentPage = 1;
  fetchMovies(currentPage, sortBy);
  sortPopularBtn.classList.add('active');
  sortTopRatedBtn.classList.remove('active'); // Ensure other sort buttons are inactive
  // Show pagination and main grid
  prevPageBtn.style.display = '';
  nextPageBtn.style.display = '';
  pageInfo.style.display = '';
  moviesGrid.style.display = 'grid';
  searchSection.style.display = 'none';
};

//top rated button
    sortTopRatedBtn.onclick = async () => {
      moviesGrid.style.display = 'grid';
      searchSection.style.display = 'none';

      // NEW: Set sortBy to the specific value for Top Rated (Latest)
      sortBy = 'top_rated_latest';
      moviesTitle.textContent = 'Top Rated Movies';
      currentPage = 1;

      await fetchMovies(currentPage, sortBy); // Pass the new sortBy value

      sortTopRatedBtn.classList.add('active');
      sortPopularBtn.classList.remove('active');
    };
    
function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// NEW: Debounced search (on input)
searchInput.addEventListener('input', debounce(() => {
  const query = searchInput.value.trim();
  if (query) {
    searchMovies(query);
  } else {
    // If search input is cleared, revert to showing popular movies
    moviesTitle.textContent = 'Popular Movies';
    currentPage = 1;
    fetchMovies(currentPage, sortBy);
    sortPopularBtn.classList.add('active');
    sortTopRatedBtn.classList.remove('active');
    // Show pagination and main grid
    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';
    pageInfo.style.display = '';
    moviesGrid.style.display = 'grid';
    searchSection.style.display = 'none';
  }
}, 400));

// NEW: On submit (for pressing enter)
searchForm.onsubmit = (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    searchMovies(query);
  } else {
    // If search input is cleared, revert to showing popular movies
    moviesTitle.textContent = 'Popular Movies';
    currentPage = 1;
    fetchMovies(currentPage, sortBy);
    sortPopularBtn.classList.add('active');
    sortTopRatedBtn.classList.remove('active');
    // Show pagination and main grid
    prevPageBtn.style.display = '';
    nextPageBtn.style.display = '';
    pageInfo.style.display = '';
    moviesGrid.style.display = 'grid';
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
  fetchMovies(currentPage, sortBy);
  // Ensure pagination is visible when filtering by genre
  prevPageBtn.style.display = '';
  nextPageBtn.style.display = '';
  pageInfo.style.display = '';
  moviesGrid.style.display = 'grid';
  searchSection.style.display = 'none';
};

// Initial load
sortPopularBtn.classList.add('active');
fetchGenres();
fetchMovies(currentPage, sortBy);
