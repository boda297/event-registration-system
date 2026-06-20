// Global State
let state = {
    user: null,
    events: [],
    registrations: [],
    users: [],
    adminActiveSubTab: 'events',
    activeTab: 'all-events',
    filters: {
        search: '',
        sort: 'date-asc',
        onlyWithSpots: false
    }
};

const API_BASE = '/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();
    fetchEvents();
    if (state.user) {
        fetchRegistrations();
    }
    setupEventListeners();
    renderUI();
});

// Load auth from localStorage
function loadUserFromStorage() {
    const storedUser = localStorage.getItem('eventpass_user');
    const storedToken = localStorage.getItem('eventpass_token');
    if (storedUser && storedToken) {
        state.user = JSON.parse(storedUser);
        state.user.token = storedToken;
    }
}

// Save auth to localStorage
function saveUserToStorage(user, token) {
    localStorage.setItem('eventpass_user', JSON.stringify(user));
    localStorage.setItem('eventpass_token', token);
    state.user = { ...user, token };
}

// Clear auth from localStorage
function clearUserStorage() {
    localStorage.removeItem('eventpass_user');
    localStorage.removeItem('eventpass_token');
    state.user = null;
}

// Fetch Events
async function fetchEvents() {
    toggleLoader('events-loader', true);
    try {
        const res = await fetch(`${API_BASE}/events`);
        if (!res.ok) throw new Error('Failed to load events');
        state.events = await res.json();
        renderEvents();
        updateStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        toggleLoader('events-loader', false);
    }
}

// Fetch user registrations
async function fetchRegistrations() {
    if (!state.user) return;
    toggleLoader('registrations-loader', true);
    try {
        const res = await fetch(`${API_BASE}/registrations/me`, {
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        if (!res.ok) throw new Error('Failed to fetch registrations');
        state.registrations = await res.json();
        renderRegistrations();
        updateStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        toggleLoader('registrations-loader', false);
    }
}

// Setup key event listeners for inputs
function setupEventListeners() {
    // Window click to close modals
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    };
}

// Update App stats top counts
function updateStats() {
    const activeEventsCount = state.events.length;
    document.getElementById('stat-total-events').textContent = activeEventsCount;
    
    if (state.user) {
        const activeRegistrations = state.registrations.filter(r => r.status === 'confirmed').length;
        document.getElementById('stat-my-registrations').textContent = activeRegistrations;
    } else {
        document.getElementById('stat-my-registrations').textContent = '-';
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    if (type === 'warning') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <span class="toast-icon"><i class="fa-solid ${iconClass}"></i></span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Modal Controllers
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function switchModal(closeId, openId) {
    closeModal(closeId);
    setTimeout(() => openModal(openId), 150);
}

// Render dynamic elements based on auth status
function renderUI() {
    const guestNav = document.getElementById('guest-nav');
    const authNav = document.getElementById('auth-nav');
    const tabMyReg = document.getElementById('tab-my-registrations');
    const adminElements = document.querySelectorAll('.admin-only');

    if (state.user) {
        guestNav.classList.add('hidden');
        authNav.classList.remove('hidden');
        document.getElementById('user-display-name').textContent = state.user.name;
        
        const roleBadge = document.getElementById('user-role-badge');
        roleBadge.textContent = state.user.role;
        if (state.user.role === 'admin') {
            roleBadge.className = 'badge admin';
            adminElements.forEach(el => el.classList.remove('hidden'));
            tabMyReg.classList.add('hidden');
        } else {
            roleBadge.className = 'badge';
            adminElements.forEach(el => el.classList.add('hidden'));
            tabMyReg.classList.remove('hidden');
        }
    } else {
        guestNav.classList.remove('hidden');
        authNav.classList.add('hidden');
        tabMyReg.classList.add('hidden');
        adminElements.forEach(el => el.classList.add('hidden'));
        if (state.activeTab !== 'all-events') {
            switchTab('all-events');
        }
    }
    
    // Refresh display
    renderEvents();
    if (state.user) {
        if (state.user.role === 'admin') {
            renderAdminEvents();
            renderAdminUsers();
        } else {
            renderRegistrations();
        }
    }
    updateStats();
}

// Handle Register Submit
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = 'user';

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        
        saveUserToStorage(data.user, data.token);
        closeModal('register-modal');
        e.target.reset();
        showToast('Account created successfully!', 'success');
        
        renderUI();
        fetchRegistrations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Handle Login Submit
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Login failed');
        
        saveUserToStorage(data.user, data.token);
        closeModal('login-modal');
        e.target.reset();
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        
        renderUI();
        if (data.user.role !== 'admin') {
            fetchRegistrations();
        } else {
            renderAdminEvents();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Logout
function handleLogout() {
    clearUserStorage();
    state.activeTab = 'all-events';
    showToast('Logged out successfully', 'success');
    renderUI();
}

// Tab switcher
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update Tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    
    if (tabId === 'all-events') {
        document.getElementById('tab-all-events').classList.add('active');
        document.getElementById('view-all-events').classList.remove('hidden');
    } else if (tabId === 'my-registrations') {
        document.getElementById('tab-my-registrations').classList.add('active');
        document.getElementById('view-my-registrations').classList.remove('hidden');
        fetchRegistrations();
    } else if (tabId === 'admin-dashboard') {
        document.getElementById('tab-admin-dashboard').classList.add('active');
        document.getElementById('view-admin-dashboard').classList.remove('hidden');
        renderAdminEvents();
        fetchUsers();
    }
}

// Helper to filter events
function filterEvents() {
    state.filters.search = document.getElementById('search-input').value.toLowerCase();
    state.filters.sort = document.getElementById('sort-select').value;
    state.filters.onlyWithSpots = document.getElementById('filter-spots').checked;
    
    renderEvents();
}

// Clear filters
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('sort-select').value = 'date-asc';
    document.getElementById('filter-spots').checked = false;
    
    filterEvents();
}

// Render dynamic event cards list
function renderEvents() {
    const grid = document.getElementById('events-grid');
    const emptyState = document.getElementById('events-empty');
    
    let filtered = [...state.events];
    
    // 1. Search Filter
    if (state.filters.search) {
        filtered = filtered.filter(event => 
            event.title.toLowerCase().includes(state.filters.search) || 
            (event.description && event.description.toLowerCase().includes(state.filters.search)) ||
            (event.location && event.location.toLowerCase().includes(state.filters.search))
        );
    }
    
    // 2. Spots Filter
    if (state.filters.onlyWithSpots) {
        filtered = filtered.filter(event => 
            event.capacity === 0 || (event.capacity - (event.registeredCount || 0) > 0)
        );
    }
    
    // 3. Sorting
    filtered.sort((a, b) => {
        if (state.filters.sort === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (state.filters.sort === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (state.filters.sort === 'title-asc') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });

    // Check empty state
    if (filtered.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    
    filtered.forEach(event => {
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const isRegistered = state.user && state.registrations.some(r => r.event && r.event._id === event._id && r.status === 'confirmed');
        
        let capacityText = 'Unlimited';
        let progressPercent = 0;
        let isFull = false;
        
        if (event.capacity > 0) {
            const registered = event.registeredCount || 0;
            capacityText = `${registered} / ${event.capacity} Spots`;
            progressPercent = Math.min(100, (registered / event.capacity) * 100);
            isFull = registered >= event.capacity;
        }
        
        const isAdmin = state.user && state.user.role === 'admin';
        const capacityHtml = isAdmin ? `
                <div class="capacity-container">
                    <div class="capacity-text">
                        <span>Capacity</span>
                        <span><strong>${capacityText}</strong></span>
                    </div>
                    <div class="capacity-bar">
                        <div class="capacity-progress ${isFull ? 'full' : ''}" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
        ` : '';
        
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-card-body">
                <div class="event-card-header">
                    <h3 class="event-title">${escapeHTML(event.title)}</h3>
                </div>
                <p class="event-desc">${escapeHTML(event.description || 'No description provided.')}</p>
                
                <div class="event-details">
                    <div class="event-detail-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="event-detail-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHTML(event.location || 'TBA')}</span>
                    </div>
                </div>
                
                ${capacityHtml}
                
                <div class="event-card-actions">
                    ${renderActionButton(event, isRegistered, isFull)}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderActionButton(event, isRegistered, isFull) {
    if (!state.user) {
        return `<button class="btn btn-secondary btn-block" onclick="openModal('login-modal')"><i class="fa-solid fa-right-to-bracket"></i> Login to Register</button>`;
    }
    
    if (state.user.role === 'admin') {
        return `<button class="btn btn-secondary btn-block" onclick="switchTab('admin-dashboard')"><i class="fa-solid fa-gears"></i> Manage Event</button>`;
    }
    
    if (isRegistered) {
        // Find registration object
        const reg = state.registrations.find(r => r.event && r.event._id === event._id && r.status === 'confirmed');
        return `<button class="btn btn-logout btn-block" onclick="cancelRegistration('${reg._id}')"><i class="fa-solid fa-xmark"></i> Cancel Booking</button>`;
    }
    
    if (isFull) {
        return `<button class="btn btn-secondary btn-block" disabled><i class="fa-solid fa-ban"></i> Fully Booked</button>`;
    }
    
    return `<button class="btn btn-primary btn-block" onclick="registerForEvent('${event._id}')"><i class="fa-solid fa-plus"></i> Reserve Spot</button>`;
}

// Render dynamic registrations
function renderRegistrations() {
    const grid = document.getElementById('registrations-grid');
    const emptyState = document.getElementById('registrations-empty');
    
    const activeRegs = state.registrations.filter(r => r.status === 'confirmed' && r.event);
    
    if (activeRegs.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    
    activeRegs.forEach(reg => {
        const event = reg.event;
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-card-body">
                <div class="event-card-header">
                    <h3 class="event-title">${escapeHTML(event.name || event.title || 'Untitled Event')}</h3>
                    <span class="badge">Booked</span>
                </div>
                
                <div class="event-details" style="margin-top: 1rem;">
                    <div class="event-detail-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                
                <div class="event-card-actions">
                    <button class="btn btn-logout btn-block" onclick="cancelRegistration('${reg._id}')"><i class="fa-solid fa-xmark"></i> Cancel Reservation</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Render Admin dashboard events list table
function renderAdminEvents() {
    const tbody = document.getElementById('admin-events-table-body');
    tbody.innerHTML = '';
    
    state.events.forEach(event => {
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const registered = event.registeredCount || 0;
        const capacityText = event.capacity > 0 ? `${registered} / ${event.capacity}` : `${registered} / Unlimited`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHTML(event.title)}</td>
            <td>${formattedDate}</td>
            <td>
                <div style="font-size: 0.9rem;">${capacityText}</div>
                <div class="capacity-bar" style="width: 100px; height: 5px; margin-top: 0.25rem;">
                    <div class="capacity-progress" style="width: ${event.capacity > 0 ? Math.min(100, (registered / event.capacity) * 100) : 0}%"></div>
                </div>
            </td>
            <td>${escapeHTML(event.location || 'TBA')}</td>
            <td class="admin-actions-cell">
                <button class="btn-icon edit" onclick="openEditEventModal('${event._id}')" title="Edit Event"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteEvent('${event._id}')" title="Delete Event"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Register for an event
async function registerForEvent(eventId) {
    if (!state.user) {
        openModal('login-modal');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/registrations/${eventId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.user.token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to register');
        
        showToast('Successfully registered for event!', 'success');
        await fetchEvents();
        await fetchRegistrations();
        renderUI();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Cancel Booking/Registration
async function cancelRegistration(registrationId) {
    try {
        const res = await fetch(`${API_BASE}/registrations/${registrationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to cancel registration');
        
        showToast('Registration cancelled successfully', 'success');
        await fetchEvents();
        await fetchRegistrations();
        renderUI();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Admin form actions
function openCreateEventModal() {
    document.getElementById('event-modal-title').textContent = 'Create New Event';
    document.getElementById('event-submit-btn').textContent = 'Publish Event';
    document.getElementById('event-id').value = '';
    document.getElementById('event-form').reset();
    openModal('event-modal');
}

function openEditEventModal(eventId) {
    const event = state.events.find(e => e._id === eventId);
    if (!event) return;
    
    document.getElementById('event-modal-title').textContent = 'Edit Event Details';
    document.getElementById('event-submit-btn').textContent = 'Save Changes';
    document.getElementById('event-id').value = event._id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description || '';
    
    // Format date for datetime-local value (YYYY-MM-DDTHH:MM)
    const dateObj = new Date(event.date);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
    document.getElementById('event-date').value = localISOTime;
    
    document.getElementById('event-capacity').value = event.capacity;
    document.getElementById('event-location').value = event.location || '';
    
    openModal('event-modal');
}

// Handle create/update submit
async function handleEventSubmit(e) {
    e.preventDefault();
    const eventId = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const date = document.getElementById('event-date').value;
    const capacity = parseInt(document.getElementById('event-capacity').value) || 0;
    const location = document.getElementById('event-location').value;

    const url = eventId ? `${API_BASE}/events/${eventId}` : `${API_BASE}/events`;
    const method = eventId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.user.token}`
            },
            body: JSON.stringify({ title, description, date, capacity, location })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Operation failed');
        
        showToast(eventId ? 'Event details updated!' : 'Event published successfully!', 'success');
        closeModal('event-modal');
        await fetchEvents();
        renderUI();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Delete Event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to permanently delete this event? This will also remove any bookings.')) return;
    
    try {
        const res = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Failed to delete event');
        
        showToast('Event deleted successfully', 'success');
        await fetchEvents();
        renderUI();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Helper: Toggle loader spinner
function toggleLoader(loaderId, show) {
    const loader = document.getElementById(loaderId);
    if (!loader) return;
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// Helper: Escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Switch between admin events and admin users subtabs
function switchAdminSubTab(subTab) {
    state.adminActiveSubTab = subTab;
    
    document.querySelectorAll('.admin-sub-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (subTab === 'events') {
        document.getElementById('btn-admin-sub-events').classList.add('active');
        document.getElementById('admin-events-panel').classList.remove('hidden');
    } else if (subTab === 'users') {
        document.getElementById('btn-admin-sub-users').classList.add('active');
        document.getElementById('admin-users-panel').classList.remove('hidden');
        fetchUsers();
    }
}

// Fetch users list
async function fetchUsers() {
    if (!state.user || state.user.role !== 'admin') return;
    try {
        const res = await fetch(`${API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        state.users = await res.json();
        renderAdminUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Render users list in admin dashboard
function renderAdminUsers() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    state.users.forEach(u => {
        const isSelf = state.user && state.user.email === u.email;
        const deleteButton = isSelf 
            ? `<button class="btn-icon delete" disabled title="You cannot delete yourself" style="opacity: 0.4; cursor: not-allowed;"><i class="fa-solid fa-trash-can"></i></button>`
            : `<button class="btn-icon delete" onclick="deleteUser('${u._id}')" title="Delete User"><i class="fa-solid fa-trash-can"></i></button>`;
            
        const roleBadge = u.role === 'admin' 
            ? `<span class="badge admin">Admin</span>` 
            : `<span class="badge">User</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHTML(u.name)}</td>
            <td>${escapeHTML(u.email)}</td>
            <td>${roleBadge}</td>
            <td class="admin-actions-cell">
                ${deleteButton}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Delete user account
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user account?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Failed to delete user');
        
        showToast('User account deleted successfully', 'success');
        fetchUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Open modal to add admin user
function openCreateAdminModal() {
    document.getElementById('admin-create-form').reset();
    openModal('admin-create-modal');
}

// Submit handler to create new admin user
async function handleCreateAdminSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('admin-create-name').value;
    const email = document.getElementById('admin-create-email').value;
    const password = document.getElementById('admin-create-password').value;

    try {
        const res = await fetch(`${API_BASE}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.user.token}`
            },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Failed to create admin user');
        
        showToast(`Admin user '${name}' created successfully!`, 'success');
        closeModal('admin-create-modal');
        fetchUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
