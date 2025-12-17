// --- Configuration ---
// REPLACE THIS WITH YOUR PUBLISHED GOOGLE SHEET CSV URL
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1WST5VYXVBtAnAGZeUQ_W2rYz9UOoQBAu7ZxDcDx8ijACKtWr2KZp-e8h998HIiqdr3tGFL-CyWMu/pub?output=csv';

// --- Global Variables ---
let allJobs = []; // Stores the original fetched data
let currentFilter = 'All'; // Tracks the active category filter

// --- DOM Elements ---
const jobCardsContainer = document.getElementById('job-cards-container');
const filterCategoriesDiv = document.getElementById('filter-categories');
const jobSearchInput = document.getElementById('job-search');
const noResultsDiv = document.getElementById('no-results');

// --- Helper Functions ---

/**
 * Parses the CSV text from Google Sheets into an array of job objects.
 * Assumes the first row is the header.
 * @param {string} csvText - The CSV content as a string.
 * @returns {Array<Object>} Array of job objects.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Assumes header row is the first line
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Convert all headers to a common format (e.g., camelCase for easy JS use)
    // Example: 'Job Title' -> 'jobTitle'
    const keys = headers.map(header => {
        const words = header.toLowerCase().split(' ');
        if (words.length > 1) {
            return words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        }
        return header.toLowerCase();
    });

    const jobs = [];
    for (let i = 1; i < lines.length; i++) {
        // Simple split by comma for basic CSV. For complex CSV (with commas in fields), a proper library is needed.
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const job = {};
        keys.forEach((key, index) => {
            job[key] = values[index];
        });
        jobs.push(job);
    }
    return jobs;
}


/**
 * Generates the HTML for a single job card.
 * @param {Object} job - A single job object.
 * @returns {string} The HTML string for the job card.
 */
function createJobCardHTML(job) {
    const icon = job.type.toLowerCase().includes('wfh') ? 'fas fa-home' :
                 job.type.toLowerCase().includes('data entry') ? 'fas fa-keyboard' :
                 job.type.toLowerCase().includes('telecalling') ? 'fas fa-phone-alt' :
                 'fas fa-briefcase'; // Default icon

    return `
        <div class="job-card">
            <h3 title="${job.jobTitle}">${job.jobTitle}</h3>
            <span class="company">${job.company}</span>
            <div class="meta">
                <span><i class="${icon}"></i> ${job.type}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary || 'Competitive'}</span>
            </div>
            <p>${job.description.substring(0, 100)}...</p>
            <a href="${job.applyLink}" target="_blank" class="apply-btn">Apply Now <i class="fas fa-arrow-right"></i></a>
        </div>
    `;
}

/**
 * Renders the job cards to the DOM.
 * @param {Array<Object>} jobsToRender - The array of jobs to display.
 */
function renderJobs(jobsToRender) {
    jobCardsContainer.innerHTML = ''; // Clear previous listings
    
    if (jobsToRender.length === 0) {
        noResultsDiv.style.display = 'block';
    } else {
        noResultsDiv.style.display = 'none';
        const html = jobsToRender.map(createJobCardHTML).join('');
        jobCardsContainer.innerHTML = html;
    }
}

/**
 * Creates and attaches the category filter buttons.
 */
function setupFilters() {
    // Collect unique job types from all jobs
    const jobTypes = [...new Set(allJobs.map(job => job.type.trim()))];
    
    // Add 'All' as the first filter option
    const filters = ['All', ...jobTypes];

    filterCategoriesDiv.innerHTML = filters.map(type => `
        <button class="filter-btn ${type === 'All' ? 'active' : ''}" data-type="${type}">
            ${type}
        </button>
    `).join('');

    // Attach click listener to the container (Event Delegation)
    filterCategoriesDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            currentFilter = e.target.dataset.type;
            filterAndSearchJobs();
        }
    });
}

/**
 * Main function to filter and search the job list based on current UI state.
 */
function filterAndSearchJobs() {
    let filteredJobs = [...allJobs];
    const searchTerm = jobSearchInput.value.toLowerCase().trim();

    // 1. Filter by Category Type
    if (currentFilter !== 'All') {
        filteredJobs = filteredJobs.filter(job => job.type.trim() === currentFilter);
    }

    // 2. Search by Keyword (applies to the category-filtered list)
    if (searchTerm) {
        filteredJobs = filteredJobs.filter(job => 
            job.jobTitle.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm) ||
            job.location.toLowerCase().includes(searchTerm) ||
            job.type.toLowerCase().includes(searchTerm)
        );
    }

    renderJobs(filteredJobs);
}


// --- Main Execution Logic ---

/**
 * Fetches the CSV data from the Google Sheet and initializes the board.
 */
async function initJobBoard() {
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        allJobs = parseCSV(csvText);
        
        // Remove jobs where essential data is missing or is just the header repeated
        allJobs = allJobs.filter(job => job.jobTitle && job.jobTitle.toLowerCase() !== 'jobtitle');

        if (allJobs.length === 0) {
             throw new Error("No valid job data found after parsing.");
        }

        setupFilters();
        renderJobs(allJobs);

    } catch (error) {
        console.error("Error fetching or processing job data:", error);
        jobCardsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: red; padding: 50px; background: #ffebeb; border-radius: 8px;">
                <h2>Data Loading Error!</h2>
                <p>Please check the <code>GOOGLE_SHEET_CSV_URL</code> in the script and ensure the Google Sheet is correctly published to the web as a CSV.</p>
                <p>Error details: ${error.message}</p>
            </div>
        `;
    }
}

// Attach event listener for real-time search filtering
jobSearchInput.addEventListener('input', filterAndSearchJobs);

// Start the application
document.addEventListener('DOMContentLoaded', initJobBoard);
/**
 * Generates the HTML for a single job card.
 * @param {Object} job - A single job object.
 * @returns {string} The HTML string for the job card.
 */
function createJobCardHTML(job) {
    const icon = job.type.toLowerCase().includes('wfh') ? 'fas fa-home' :
                 job.type.toLowerCase().includes('data entry') ? 'fas fa-keyboard' :
                 job.type.toLowerCase().includes('telecalling') ? 'fas fa-phone-alt' :
                 'fas fa-briefcase'; // Default icon

    const jobStatus = job.status ? job.status.trim() : 'Active'; // Read the Status column, default to Active
    
    // Determine the badge class and whether the Apply button should be active
    let badgeClass = '';
    let isApplyActive = true;
    
    if (jobStatus === 'Expired' || jobStatus === 'Filled') {
        badgeClass = 'status-closed';
        isApplyActive = false;
    } else {
        // Assume 'Active' or any other non-closing status
        badgeClass = 'status-active';
    }

    // Determine the content and color of the Apply button
    const applyButtonHTML = isApplyActive
        ? `<a href="${job.applyLink}" target="_blank" class="apply-btn">Apply Now <i class="fas fa-arrow-right"></i></a>`
        : `<button class="apply-btn disabled">Application ${jobStatus}</button>`;


    return `
        <div class="job-card">
            
            <span class="job-status-tag ${badgeClass}">${jobStatus.toUpperCase()}</span>
            
            <h3 title="${job.jobTitle}">${job.jobTitle}</h3>
            <span class="company">${job.company}</span>
            <div class="meta">
                <span><i class="${icon}"></i> ${job.type}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary || 'Competitive'}</span>
            </div>
            <p>${job.description.substring(0, 100)}...</p>
            
            ${applyButtonHTML}

        </div>
    `;
}

// --- Mobile Menu Toggle Logic ---
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    // Toggles the 'active' class on the navigation menu
    navMenu.classList.toggle('active');
    
    // Optional: Change the menu icon from bars to close (X)
    const icon = menuToggle.querySelector('i');
    if (navMenu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});