// ===========================
// State Management
// ===========================

let cocktails = [];
let registrations = [];
let favorites = [];
let currentCocktailId = null;
let confirmationCallback = null;
const ADMIN_PASSWORD = 'cocktailnight2026';
const EVENT_DATE = new Date('2026-12-24T20:00:00').getTime();

// ===========================
// Initialization
// ===========================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCocktails();
        loadRegistrations();
        loadFavorites();
        renderCocktails();
        updateRegistrationsDisplay();
        initializeCountdown();
        setupEventListeners();
        setupScrollAnimation();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error loading application data', 'error');
    }
});

// ===========================
// Load Data
// ===========================

async function loadCocktails() {
    try {
        const response = await fetch('cocktails.json');
        if (!response.ok) throw new Error('Failed to load cocktails');
        cocktails = await response.json();
    } catch (error) {
        console.error('Error loading cocktails:', error);
        showToast('Failed to load cocktail menu', 'error');
    }
}

function loadRegistrations() {
    const stored = localStorage.getItem('cocktailRegistrations');
    registrations = stored ? JSON.parse(stored) : [];
}

function loadFavorites() {
    const stored = localStorage.getItem('cocktailFavorites');
    favorites = stored ? JSON.parse(stored) : [];
}

function saveRegistrations() {
    localStorage.setItem('cocktailRegistrations', JSON.stringify(registrations));
}

function saveFavorites() {
    localStorage.setItem('cocktailFavorites', JSON.stringify(favorites));
}

// ===========================
// Render Cocktails
// ===========================

function renderCocktails() {
    const grid = document.getElementById('cocktailsGrid');
    grid.innerHTML = '';

    const filtered = getFilteredCocktails();

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <p style="color: var(--text-secondary);">No cocktails match your filters.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(cocktail => {
        const registration = registrations.find(r => r.cocktailId === cocktail.id);
        const isFavorite = favorites.includes(cocktail.id);
        const isReserved = !!registration;

        const card = document.createElement('div');
        card.className = `cocktail-card ${isReserved ? 'reserved' : ''}`;
        card.innerHTML = `
            <div class="cocktail-image">
                ${cocktail.emoji}
                ${isReserved ? `<div class="cocktail-badge reserved">RESERVED</div>` : ''}
                ${isFavorite ? `<div class="cocktail-badge favorite">★ FAVORITE</div>` : ''}
            </div>
            <div class="cocktail-content">
                <h3 class="cocktail-name">${cocktail.name}</h3>
                <p class="cocktail-description">${cocktail.description}</p>
                
                <div class="cocktail-meta">
                    <span class="meta-item difficulty-${cocktail.difficulty.toLowerCase()}">
                        📊 ${cocktail.difficulty}
                    </span>
                    <span class="meta-item">⏱️ ${cocktail.prepTime} min</span>
                    <span class="meta-item">🍷 ${cocktail.alcohol}</span>
                </div>

                <div class="cocktail-ingredients">
                    <span class="ingredients-label">Ingredients</span>
                    <div class="ingredients-list">
                        ${cocktail.ingredients.map(ing => 
                            `<span class="ingredient-tag">${ing}</span>`
                        ).join('')}
                    </div>
                </div>

                ${isReserved ? `
                    <div class="reserved-by">
                        <span class="reserved-by-name">✓ ${registration.name}</span>
                        ${registration.message ? `<p class="reserved-by-message">"${registration.message}"</p>` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="cocktail-actions">
                <button class="btn btn-claim btn-${isReserved ? 'secondary' : 'primary'}" 
                    ${isReserved ? 'disabled' : ''}
                    onclick="claimCocktail(${cocktail.id}, event)">
                    ${isReserved ? '✓ Reserved' : 'Claim'}
                </button>
                <button class="btn btn-favorite ${isFavorite ? 'active' : ''}" 
                    onclick="toggleFavorite(${cocktail.id}, event)"
                    title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    ★
                </button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn')) {
                openDetailModal(cocktail.id);
            }
        });

        grid.appendChild(card);
    });
}

// ===========================
// Filter Functions
// ===========================

function getFilteredCocktails() {
    let filtered = [...cocktails];

    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            c.description.toLowerCase().includes(searchTerm) ||
            c.ingredients.some(i => i.toLowerCase().includes(searchTerm))
        );
    }

    // Difficulty filter
    const difficulty = document.getElementById('difficultyFilter').value;
    if (difficulty) {
        filtered = filtered.filter(c => c.difficulty === difficulty);
    }

    // Time filter
    const timeFilter = document.getElementById('timeFilter').value;
    if (timeFilter) {
        filtered = filtered.filter(c => {
            if (timeFilter === 'quick') return c.prepTime <= 5;
            if (timeFilter === 'medium') return c.prepTime > 5 && c.prepTime <= 10;
            if (timeFilter === 'slow') return c.prepTime > 10;
            return true;
        });
    }

    return filtered;
}

// ===========================
// Modal Functions
// ===========================

function openDetailModal(cocktailId) {
    currentCocktailId = cocktailId;
    const cocktail = cocktails.find(c => c.id === cocktailId);
    if (!cocktail) return;

    const content = document.getElementById('detailContent');
    const registration = registrations.find(r => r.cocktailId === cocktailId);

    content.innerHTML = `
        <div class="detail-header">
            <div class="detail-image">${cocktail.emoji}</div>
            <h2 class="detail-title">${cocktail.name}</h2>
            <p class="detail-description">${cocktail.description}</p>
        </div>

        <div class="detail-section">
            <h3>Details</h3>
            <div class="detail-stat">
                <span class="detail-stat-label">Difficulty</span>
                <span class="detail-stat-value">${cocktail.difficulty}</span>
            </div>
            <div class="detail-stat">
                <span class="detail-stat-label">Preparation Time</span>
                <span class="detail-stat-value">${cocktail.prepTime} minutes</span>
            </div>
            <div class="detail-stat">
                <span class="detail-stat-label">Alcohol Content</span>
                <span class="detail-stat-value">${cocktail.alcohol}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Ingredients</h3>
            <div class="detail-ingredients">
                ${cocktail.ingredients.map(ing => 
                    `<span class="ingredient-tag">${ing}</span>`
                ).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>Instructions</h3>
            <p>${cocktail.instructions}</p>
        </div>

        ${registration ? `
            <div class="detail-section">
                <h3>Reserved By</h3>
                <p><strong>${registration.name}</strong></p>
                ${registration.message ? `<p style="font-style: italic; color: var(--text-secondary);">"${registration.message}"</p>` : ''}
            </div>
        ` : ''}

        <div class="detail-actions">
            ${!registration ? `
                <button class="btn btn-primary" onclick="claimCocktail(${cocktailId})">
                    Claim This Cocktail
                </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="closeDetailModal()">
                Close
            </button>
        </div>
    `;

    document.getElementById('detailModal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
    currentCocktailId = null;
}

function openRegistrationModal() {
    document.getElementById('registrationForm').reset();
    document.getElementById('registrationModal').classList.add('show');
}

function closeRegistrationModal() {
    document.getElementById('registrationModal').classList.remove('show');
}

function openAdminModal() {
    document.getElementById('adminForm').reset();
    document.getElementById('adminModal').classList.add('show');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('show');
    document.getElementById('adminPassword').value = '';
}

// ===========================
// Claim Cocktail
// ===========================

function claimCocktail(cocktailId, event) {
    if (event) event.stopPropagation();

    const cocktail = cocktails.find(c => c.id === cocktailId);
    const existing = registrations.find(r => r.cocktailId === cocktailId);

    if (existing) {
        showToast('This cocktail is already reserved!', 'info');
        return;
    }

    currentCocktailId = cocktailId;
    closeDetailModal();
    openRegistrationModal();
}

function submitRegistration(event) {
    event.preventDefault();

    if (!currentCocktailId) return;

    const name = document.getElementById('guestName').value.trim();
    const message = document.getElementById('guestMessage').value.trim();

    if (!name) {
        showToast('Please enter your name', 'error');
        return;
    }

    const existing = registrations.find(r => r.cocktailId === currentCocktailId);
    if (existing) {
        showToast('This cocktail is already reserved!', 'error');
        return;
    }

    registrations.push({
        cocktailId: currentCocktailId,
        name,
        message,
        date: new Date().toISOString()
    });

    saveRegistrations();
    renderCocktails();
    updateRegistrationsDisplay();
    closeRegistrationModal();
    playConfetti();

    const cocktail = cocktails.find(c => c.id === currentCocktailId);
    showToast(`🎉 ${cocktail.name} claimed by ${name}!`, 'success');

    currentCocktailId = null;
}

// ===========================
// Favorites
// ===========================

function toggleFavorite(cocktailId, event) {
    event.stopPropagation();

    const index = favorites.indexOf(cocktailId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(cocktailId);
    }

    saveFavorites();
    renderCocktails();
}

// ===========================
// Registrations Display
// ===========================

function updateRegistrationsDisplay() {
    const container = document.getElementById('registrationsContainer');

    if (registrations.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🍹</div>
                <p>No reservations yet. Be the first to claim a cocktail!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = registrations.map(reg => {
        const cocktail = cocktails.find(c => c.id === reg.cocktailId);
        if (!cocktail) return '';

        return `
            <div class="registration-card">
                <div class="registration-icon">${cocktail.emoji}</div>
                <div class="registration-title">${cocktail.name}</div>
                <div class="registration-name">by ${reg.name}</div>
                ${reg.message ? `<div class="registration-message">"${reg.message}"</div>` : ''}
            </div>
        `;
    }).join('');
}

// ===========================
// Random Cocktail
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('randomCocktailBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            const available = cocktails.filter(c => 
                !registrations.find(r => r.cocktailId === c.id)
            );

            if (available.length === 0) {
                showToast('All cocktails are reserved!', 'info');
                return;
            }

            const random = available[Math.floor(Math.random() * available.length)];
            openDetailModal(random.id);
            document.querySelector('#detailModal').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// ===========================
// Admin Functions
// ===========================

function openAdminMode() {
    openAdminModal();
}

function submitAdminLogin(event) {
    event.preventDefault();

    const password = document.getElementById('adminPassword').value;

    if (password === ADMIN_PASSWORD) {
        closeAdminModal();
        document.getElementById('adminDashboard').classList.add('show');
        updateAdminDashboard();
        showToast('Admin mode activated', 'success');
    } else {
        showToast('Invalid password', 'error');
        document.getElementById('adminPassword').value = '';
    }
}

function exitAdminMode() {
    document.getElementById('adminDashboard').classList.remove('show');
    showToast('Admin mode closed', 'info');
}

function updateAdminDashboard() {
    const reserved = registrations.length;
    const available = cocktails.length - reserved;

    document.getElementById('totalRegistrations').textContent = reserved;
    document.getElementById('availableCocktails').textContent = available;
    document.getElementById('reservedCocktails').textContent = reserved;

    const tbody = document.getElementById('adminRegistrationsTable');
    tbody.innerHTML = registrations.map(reg => {
        const cocktail = cocktails.find(c => c.id === reg.cocktailId);
        const date = new Date(reg.date).toLocaleDateString();

        return `
            <tr>
                <td>${cocktail?.name || 'Unknown'}</td>
                <td>${reg.name}</td>
                <td>${reg.message ? `"${reg.message}"` : '—'}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-danger btn-small" 
                        onclick="removeRegistration(${reg.cocktailId})">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function removeRegistration(cocktailId) {
    showConfirmation(
        'Remove Registration?',
        'Are you sure you want to remove this registration?',
        () => {
            registrations = registrations.filter(r => r.cocktailId !== cocktailId);
            saveRegistrations();
            renderCocktails();
            updateRegistrationsDisplay();
            updateAdminDashboard();
            showToast('Registration removed', 'success');
        }
    );
}

function confirmResetAll() {
    showConfirmation(
        'Reset All Reservations?',
        'This will clear all reservations. This action cannot be undone!',
        () => {
            registrations = [];
            saveRegistrations();
            renderCocktails();
            updateRegistrationsDisplay();
            updateAdminDashboard();
            showToast('All reservations have been reset', 'success');
        }
    );
}

function exportAsJSON() {
    const data = {
        exportedAt: new Date().toISOString(),
        cocktails: cocktails,
        registrations: registrations
    };

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'cocktail-night-data.json', 'application/json');
    showToast('Data exported as JSON', 'success');
}

function exportAsCSV() {
    let csv = 'Cocktail,Guest Name,Message,Date\\n';

    registrations.forEach(reg => {
        const cocktail = cocktails.find(c => c.id === reg.cocktailId);
        const date = new Date(reg.date).toLocaleDateString();
        const message = reg.message ? `"${reg.message.replace(/"/g, '""')}"` : '';

        csv += `"${cocktail?.name || 'Unknown'}","${reg.name}",${message},"${date}"\\n`;
    });

    downloadFile(csv, 'cocktail-night-registrations.csv', 'text/csv');
    showToast('Data exported as CSV', 'success');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===========================
// Confirmation Dialog
// ===========================

function showConfirmation(title, message, callback) {
    document.getElementById('confirmationTitle').textContent = title;
    document.getElementById('confirmationMessage').textContent = message;
    confirmationCallback = callback;
    document.getElementById('confirmationDialog').classList.add('show');
}

function closeConfirmation() {
    document.getElementById('confirmationDialog').classList.remove('show');
    confirmationCallback = null;
}

function executeConfirmation() {
    if (confirmationCallback) {
        confirmationCallback();
    }
    closeConfirmation();
}

// ===========================
// Toast Notifications
// ===========================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===========================
// Countdown Timer
// ===========================

function initializeCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance < 0) {
        document.getElementById('days').textContent = '0';
        document.getElementById('hours').textContent = '0';
        document.getElementById('minutes').textContent = '0';
        document.getElementById('seconds').textContent = '0';
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// ===========================
// Confetti Animation
// ===========================

function playConfetti() {
    const container = document.getElementById('confetti-container');
    const emojis = ['🍹', '🎉', '✨', '🎊', '⭐', '🌟'];

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.animation = `confettiFall ${2 + Math.random() * 1}s ease-in forwards`;

            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// ===========================
// Back to Top Button
// ===========================

window.addEventListener('scroll', () => {
    const btn = document.getElementById('backToTopBtn');
    if (window.pageYOffset > 300) {
        btn.classList.add('show');
    } else {
        btn.classList.remove('show');
    }
});

document.getElementById('backToTopBtn')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===========================
// Setup Event Listeners
// ===========================

function setupEventListeners() {
    // Admin toggle
    document.querySelector('.admin-toggle')?.addEventListener('click', openAdminMode);

    // Search and filters
    document.getElementById('searchInput')?.addEventListener('input', renderCocktails);
    document.getElementById('difficultyFilter')?.addEventListener('change', renderCocktails);
    document.getElementById('timeFilter')?.addEventListener('change', renderCocktails);

    // Modal close on background click
    document.getElementById('registrationModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'registrationModal') closeRegistrationModal();
    });

    document.getElementById('detailModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') closeDetailModal();
    });

    document.getElementById('adminModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'adminModal') closeAdminModal();
    });

    document.getElementById('confirmationDialog')?.addEventListener('click', (e) => {
        if (e.target.id === 'confirmationDialog') closeConfirmation();
    });
}

// ===========================
// Scroll Animations
// ===========================

function setupScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.menu-section, .registrations-section').forEach(el => {
        observer.observe(el);
    });
}
