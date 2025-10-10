let currentUser = null;
let userTrips = [];
let customCategories = [];
let carExpenseChart = null;
let fuelPriceChart = null;

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing dashboard...');
    
    // Initially hide both dashboards until auth state is determined
    document.getElementById('public-dashboard').classList.add('d-none');
    const privateDashboard = document.querySelector('.container.mt-4');
    if (privateDashboard) {
        privateDashboard.classList.add('d-none');
    }

    // Set up event listeners (with null checks)
    setupDashboardEventListeners();

    // Protect navigation items
    setupProtectedNavigation();

    // Check auth state (this will show the appropriate dashboard)
    checkAuthState();

    // Initialize app
    initializeApp();
});

    // Protect car calculations link
    const carCalcLink = document.querySelector('a[href="car-calculations.html"]');
    if (carCalcLink) {
        carCalcLink.addEventListener('click', function (e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }

    // Protect "Create First Trip" button
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    if (createFirstTripBtn) {
        createFirstTripBtn.addEventListener('click', function (e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }

function setupDashboardEventListeners() {
    // Trip management - check if elements exist first
    const createTripBtn = document.getElementById('create-trip-btn');
    const joinTripBtn = document.getElementById('join-trip-btn');
    const saveTripBtn = document.getElementById('save-trip-btn');
    const updateTripBtn = document.getElementById('update-trip-btn');
    const deleteTripBtn = document.getElementById('confirm-delete-trip-btn');
    const joinTripCodeBtn = document.getElementById('join-trip-code-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const navProfile = document.getElementById('nav-profile');
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    
    // Only add event listeners if elements exist
    if (createTripBtn) createTripBtn.addEventListener('click', showCreateTripModal);
    if (joinTripBtn) joinTripBtn.addEventListener('click', showJoinTripModal);
    if (saveTripBtn) saveTripBtn.addEventListener('click', saveTrip);
    if (updateTripBtn) updateTripBtn.addEventListener('click', updateTrip);
    if (deleteTripBtn) deleteTripBtn.addEventListener('click', deleteTrip);
    if (joinTripCodeBtn) joinTripCodeBtn.addEventListener('click', joinTripWithCode);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyTripCode);
    if (navProfile) navProfile.addEventListener('click', showProfileModal);
    if (createFirstTripBtn) createFirstTripBtn.addEventListener('click', showCreateTripModal);
    
    // Distance calculation - check if elements exist
    const calculateDistance = document.getElementById('calculate-distance');
    const editCalculateDistance = document.getElementById('edit-calculate-distance');
    
    if (calculateDistance) {
        calculateDistance.addEventListener('change', function() {
            if (this.checked) {
                calculateDistance();
            } else {
                document.getElementById('distance-results').classList.add('d-none');
            }
        });
    }
    
    if (editCalculateDistance) {
        editCalculateDistance.addEventListener('change', function() {
            if (this.checked) {
                calculateEditDistance();
            } else {
                document.getElementById('edit-distance-results').classList.add('d-none');
            }
        });
    }
    
    // Profile operations
    setupProfileEventListeners();
    
    // Protect any other navigation links
    const protectedLinks = document.querySelectorAll('.nav-link[href="#"]');
    protectedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    });
}

function setupProfileEventListeners() {
    const navProfile = document.getElementById('nav-profile');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    const leaveAllTripsBtn = document.getElementById('leave-all-trips-btn');
    
    if (navProfile) navProfile.addEventListener('click', showProfileModal);
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    if (avatarUpload) avatarUpload.addEventListener('change', handleAvatarUpload);
    if (leaveAllTripsBtn) leaveAllTripsBtn.addEventListener('click', leaveAllTrips);
}

// Add the missing profile functions
function showProfileModal() {
    const user = auth.currentUser;
    if (!user) return;
    
    document.getElementById('profile-name').value = user.displayName || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-userid').value = user.uid;
    document.getElementById('profile-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4361ee&color=fff`;
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

async function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    
    if (!name) {
        showAlert('Please enter a display name', 'warning');
        return;
    }
    
    try {
        document.getElementById('save-profile-btn').disabled = true;
        document.getElementById('save-profile-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        await auth.currentUser.updateProfile({
            displayName: name
        });
        
        // Update user document in Firestore
        await db.collection('users').doc(auth.currentUser.uid).update({
            name: name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update UI
        loadUserData();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
        
        showAlert('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'danger');
    } finally {
        document.getElementById('save-profile-btn').disabled = false;
        document.getElementById('save-profile-btn').innerHTML = 'Save Changes';
    }
}

async function loadCustomCategories() {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            customCategories = userData.customCategories || [];
        }
    } catch (error) {
        console.error('Error loading custom categories:', error);
        customCategories = [];
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Note: Firebase Storage would be needed for full avatar upload functionality
    // For now, we'll just show a message
    showAlert('Avatar upload requires Firebase Storage setup. Display name updated successfully!', 'info');
}

async function leaveAllTrips() {
    if (!confirm('Are you sure you want to leave all trips? This action cannot be undone.')) {
        return;
    }
    
    try {
        document.getElementById('leave-all-trips-btn').disabled = true;
        document.getElementById('leave-all-trips-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Leaving...';
        
        // Remove user from all trips
        const batch = db.batch();
        
        for (const trip of userTrips) {
            if (trip.createdBy !== auth.currentUser.uid) {
                const tripRef = db.collection('trips').doc(trip.id);
                batch.update(tripRef, {
                    members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        await batch.commit();
        
        // Reload trips
        await loadUserTrips();
        
        showAlert('Left all trips successfully!', 'success');
        
    } catch (error) {
        console.error('Error leaving all trips:', error);
        showAlert('Error leaving trips', 'danger');
    } finally {
        document.getElementById('leave-all-trips-btn').disabled = false;
        document.getElementById('leave-all-trips-btn').innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Leave All Trips';
    }
}

function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').min = today;
    document.getElementById('end-date').min = today;
    document.getElementById('edit-start-date').min = today;
    document.getElementById('edit-end-date').min = today;
}

function checkAuthState() {
    showLoadingOverlay();
    
    // Set a timeout as fallback (5 seconds)
    const authTimeout = setTimeout(() => {
        console.warn('Auth check timeout, showing public dashboard');
        showPublicDashboard();
        updateNavigationBasedOnAuth(false);
        hideLoadingOverlay();
    }, 5000);
    
    auth.onAuthStateChanged(async (user) => {
        // Clear the timeout since we got a response
        clearTimeout(authTimeout);
        
        if (user) {
            console.log('User is logged in');
            currentUser = user;
            
            try {
                await loadUserData();
                await loadCustomCategories();
                await loadUserTrips();
                showPrivateDashboard();
                updateNavigationBasedOnAuth(true);
                
                // Show welcome back message if this is a login
                if (sessionStorage.getItem('justLoggedIn')) {
                    showToast(`Welcome back, ${user.displayName || 'Traveler'}!`, 'success');
                    sessionStorage.removeItem('justLoggedIn');
                }
                
            } catch (error) {
                console.error('Error loading user data:', error);
                showPublicDashboard();
                updateNavigationBasedOnAuth(false);
            }
        } else {
            console.log('User is not logged in, showing public dashboard');
            showPublicDashboard();
            updateNavigationBasedOnAuth(false);
            currentUser = null;
            userTrips = [];
        }
        
        hideLoadingOverlay();
    }, (error) => {
        clearTimeout(authTimeout);
        console.error('Auth state error:', error);
        showPublicDashboard();
        updateNavigationBasedOnAuth(false);
        hideLoadingOverlay();
    });
}

function showLoadingOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        // Create loading overlay if it doesn't exist
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
                <p class="mt-3">Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
    }
}

function loadUserData() {
    if (!currentUser) return;
    
    // Only update these elements if they exist (private dashboard)
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar');
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.displayName || 'Traveler';
    }
    
    if (userAvatarElement) {
        userAvatarElement.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Traveler')}&background=4361ee&color=fff`;
    }
}

async function loadUserTrips() {
    try {
        showLoadingState(true);
        
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        userTrips = [];
        tripsSnapshot.forEach(doc => {
            const tripData = doc.data();
            userTrips.push({
                id: doc.id,
                ...tripData
            });
        });
        
        userTrips.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return dateB - dateA;
        });
        
        displayTrips();
        updateDashboardStats();
        loadUpcomingTrips();
        
    } catch (error) {
        console.error('Error loading trips:', error);
        showError('Failed to load trips. Please refresh the page.');
    } finally {
        showLoadingState(false);
    }
}

async function loadRecentCalculations() {
    const recentCalculationsList = document.getElementById('recent-calculations-list');
    
    try {
        // Load from localStorage (you can modify this to use Firestore)
        const templates = JSON.parse(localStorage.getItem('carCalculationTemplates') || '[]');
        const recentCalculations = templates.slice(-3).reverse(); // Show last 3 calculations
        
        if (recentCalculations.length === 0) {
            recentCalculationsList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-calculator fa-2x mb-3"></i>
                    <p>No recent calculations</p>
                    <a href="car-calculations.html" class="btn btn-primary btn-sm">
                        <i class="fas fa-calculator me-1"></i>Create Calculation
                    </a>
                </div>
            `;
            return;
        }
        
        recentCalculationsList.innerHTML = recentCalculations.map(calc => {
            const date = new Date(calc.timestamp).toLocaleDateString();
            
            return `
                <div class="card mb-2">
                    <div class="card-body py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${calc.vehicleType === 'rental' ? 'Rental Car' : 'Self Owned'} Calculation</h6>
                                <small class="text-muted">
                                    <i class="fas fa-route me-1"></i>${calc.tripDistance} km
                                </small>
                                <br>
                                <small class="text-muted">
                                    <i class="fas fa-gas-pump me-1"></i>${calc.fuelConsumed} L
                                </small>
                            </div>
                            <div class="text-end">
                                <h6 class="text-success mb-0"><span class="rupee-symbol">₹</span>${calc.totalCost.toFixed(2)}</h6>
                                <small class="text-muted">${date}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent calculations:', error);
        recentCalculationsList.innerHTML = `
            <div class="text-center text-muted py-3">
                <p>Error loading calculations</p>
            </div>
        `;
    }
}



function loadUpcomingTrips() {
    const upcomingTripsList = document.getElementById('upcoming-trips-list');
    const today = new Date();
    
    const upcomingTrips = userTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        return startDate > today;
    }).slice(0, 5); // Show only next 5 upcoming trips
    
    if (upcomingTrips.length === 0) {
        upcomingTripsList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-calendar-times fa-2x mb-3"></i>
                <p>No upcoming trips</p>
                <button class="btn btn-primary btn-sm" id="create-trip-from-upcoming">
                    <i class="fas fa-plus me-1"></i>Create New Trip
                </button>
            </div>
        `;
        
        document.getElementById('create-trip-from-upcoming').addEventListener('click', showCreateTripModal);
        return;
    }
    
    upcomingTripsList.innerHTML = upcomingTrips.map(trip => {
        const startDate = new Date(trip.startDate);
        const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="card mb-2">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${trip.name}</h6>
                            <small class="text-muted">
                                <i class="fas fa-map-marker-alt me-1"></i>${trip.startLocation} → ${trip.destination}
                            </small>
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${startDate.toLocaleDateString()}
                            </small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-primary">In ${daysUntil} days</span>
                            <div class="mt-1">
                                <small class="text-muted trip-code">${trip.code}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// In dashboard.js, update the statistics section to be more descriptive
function updateDashboardStats() {
    const totalTrips = userTrips.length;
    const today = new Date();

    // Count active trips
    const activeTrips = userTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        return startDate <= today && endDate >= today;
    }).length;

    // Count upcoming and completed trips
    const upcomingTrips = userTrips.filter(trip => new Date(trip.startDate) > today).length;
    const completedTrips = userTrips.filter(trip => new Date(trip.endDate) < today).length;

    // Update DOM elements
    document.getElementById('total-trips-count').textContent = totalTrips;
    document.getElementById('active-trips-count').textContent = activeTrips;
    document.getElementById('total-spent-amount').textContent = upcomingTrips;
    document.getElementById('car-expenses-amount').textContent = completedTrips;
}

function showLoadingState(show) {
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    if (show) {
        tripsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading your trips...</p>
            </div>
        `;
        emptyTrips.classList.add('d-none');
    }
}

function showError(message) {
    const tripsContainer = document.getElementById('trips-container');
    tripsContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                    <strong>Error loading trips</strong>
                    <div class="small">${message}</div>
                </div>
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-primary" onclick="loadUserTrips()">
                    <i class="fas fa-redo me-2"></i>Try Again
                </button>
            </div>
        </div>
    `;
}

function displayTrips() {
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    if (userTrips.length === 0) {
        tripsContainer.innerHTML = '';
        emptyTrips.classList.remove('d-none');
        return;
    }
    
    emptyTrips.classList.add('d-none');
    tripsContainer.innerHTML = '';
    
    userTrips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripsContainer.appendChild(tripCard);
    });
}

function createTripCard(trip) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const today = new Date();
    
    // Calculate trip-specific statistics
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    const remaining = trip.budget - totalSpent;
    
    // Calculate car expenses for THIS trip only
    const carExpenses = trip.expenses ? trip.expenses.filter(expense => 
        expense.category === 'fuel' || 
        expense.description.toLowerCase().includes('car') ||
        expense.description.toLowerCase().includes('fuel') ||
        expense.description.toLowerCase().includes('rental') ||
        expense.description.toLowerCase().includes('maintenance') ||
        expense.description.toLowerCase().includes('toll') ||
        expense.description.toLowerCase().includes('parking')
    ).reduce((sum, expense) => sum + expense.amount, 0) : 0;
    
    let progressBarClass = 'bg-success';
    if (remaining < 0) progressBarClass = 'bg-danger';
    else if (remaining < trip.budget * 0.2) progressBarClass = 'bg-warning';
    
    // Trip status badge
    let statusBadge = '';
    if (startDate > today) {
        statusBadge = '<span class="badge bg-info">Upcoming</span>';
    } else if (endDate < today) {
        statusBadge = '<span class="badge bg-secondary">Completed</span>';
    } else {
        statusBadge = '<span class="badge bg-success">Active</span>';
    }
    
    const isCreator = trip.createdBy === currentUser.uid;
    
    col.innerHTML = `
        <div class="card trip-card h-100" data-trip-id="${trip.id}">
            <div class="trip-card-header">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="card-title mb-1">${trip.name}</h5>
                        <p class="card-text mb-1">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
                        ${statusBadge}
                    </div>
                    ${isCreator ? `
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item edit-trip-btn" href="#" data-trip-id="${trip.id}">
                                    <i class="fas fa-edit me-2"></i>Edit Trip
                                </a></li>
                                <li><a class="dropdown-item text-danger delete-trip-btn" href="#" data-trip-id="${trip.id}" data-trip-name="${trip.name}">
                                    <i class="fas fa-trash me-2"></i>Delete Trip
                                </a></li>
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-body">
                <p class="card-text">
                    <i class="fas fa-map-marker-alt me-2"></i>${trip.startLocation} → ${trip.destination}
                </p>
                
                <!-- Trip-specific Budget Progress -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small>Budget: <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</small>
                        <small>Spent: <span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</small>
                    </div>
                    <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${progressPercent.toFixed(1)}% used</small>
                        <small class="${remaining < 0 ? 'text-danger' : 'text-success'}">
                            ${remaining < 0 ? 'Over budget' : 'Remaining: ₹' + remaining.toFixed(2)}
                        </small>
                    </div>
                </div>
                
                <!-- Trip-specific Car Expense Info -->
                ${carExpenses > 0 ? `
                <div class="mb-3 p-2 bg-light rounded">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-car me-1"></i>Car Expenses:
                        </small>
                        <small class="fw-bold text-primary">
                            <span class="rupee-symbol">₹</span>${carExpenses.toFixed(2)}
                        </small>
                    </div>
                </div>
                ` : ''}
                
                <!-- Trip-specific Expense Summary -->
                <div class="mb-3">
                    <div class="row text-center">
                        <div class="col-6">
                            <small class="text-muted d-block">Total Expenses</small>
                            <strong class="text-primary"><span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">Expense Count</small>
                            <strong class="text-info">${trip.expenses ? trip.expenses.length : 0}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                    <button class="btn btn-outline-primary btn-sm view-trip-btn">
                        <i class="fas fa-eye me-1"></i>View Details
                    </button>
                    <div class="d-flex align-items-center">
                        <div class="member-avatar me-2" title="${trip.members.length} members">
                            <i class="fas fa-users"></i>
                            <small class="ms-1">${trip.members.length}</small>
                        </div>
                        <span class="trip-code">${trip.code}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    col.querySelector('.view-trip-btn').addEventListener('click', () => {
        setCurrentTrip(trip);
        navigateTo('trip-details.html');
    });
    
    // Add event listeners for edit and delete buttons
    if (isCreator) {
        col.querySelector('.edit-trip-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showEditTripModal(trip);
        });
        
        col.querySelector('.delete-trip-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showDeleteTripModal(trip);
        });
    }
    
    return col;
}

function showCreateTripModal() {
    if (!auth.currentUser) {
        showAuthModal();
        return;
    }
    
    // Original create trip modal code...
    document.getElementById('create-trip-form').reset();
    document.getElementById('distance-results').classList.add('d-none');
    document.getElementById('calculate-distance').checked = false;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('start-date').value = today.toISOString().split('T')[0];
    document.getElementById('end-date').value = tomorrow.toISOString().split('T')[0];
    
    const modal = new bootstrap.Modal(document.getElementById('createTripModal'));
    modal.show();
}

function showEditTripModal(trip) {
    document.getElementById('edit-trip-id').value = trip.id;
    document.getElementById('edit-trip-name').value = trip.name;
    document.getElementById('edit-start-location').value = trip.startLocation;
    document.getElementById('edit-trip-destination').value = trip.destination;
    document.getElementById('edit-start-date').value = trip.startDate;
    document.getElementById('edit-end-date').value = trip.endDate;
    document.getElementById('edit-trip-budget').value = trip.budget;
    
    document.getElementById('edit-distance-results').classList.add('d-none');
    document.getElementById('edit-calculate-distance').checked = false;
    
    // If route already exists, show it
    if (trip.route) {
        document.getElementById('edit-distance-results').classList.remove('d-none');
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Current Distance:</strong> ${trip.route.distance}</p>
            <p><strong>Current Travel Time:</strong> ${trip.route.duration}</p>
            <div class="alert alert-info mt-2">
                <small><i class="fas fa-info-circle me-1"></i>Check the box above to recalculate with updated locations</small>
            </div>
        `;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

function showDeleteTripModal(trip) {
    document.getElementById('delete-trip-id').value = trip.id;
    document.getElementById('delete-trip-name').textContent = trip.name;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteTripModal'));
    modal.show();
}

function showJoinTripModal() {
    if (!auth.currentUser) {
        showAuthModal();
        return;
    }
    
    // Original join trip modal code...
    document.getElementById('join-trip-message').classList.add('d-none');
    document.getElementById('trip-code').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

async function calculateDistance() {
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    
    if (!validateLocation(startLocation) || !validateLocation(destination)) {
        showAlert('Please enter valid locations', 'warning');
        return;
    }
    
    try {
        document.getElementById('distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        
        const routeData = await calculateRealDistance(startLocation, destination);
        
        displayDistanceResults(routeData.distance, routeData.duration);
        
    } catch (error) {
        console.error('Error calculating distance:', error);
        const errorMessage = handleRouteCalculationError(error);
        document.getElementById('distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;
    }
}

async function calculateEditDistance() {
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    
    if (!validateLocation(startLocation) || !validateLocation(destination)) {
        showAlert('Please enter valid locations', 'warning');
        return;
    }
    
    try {
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('edit-distance-results').classList.remove('d-none');
        
        const routeData = await calculateRealDistance(startLocation, destination);
        
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Distance:</strong> ${routeData.distance}</p>
            <p><strong>Estimated Travel Time:</strong> ${routeData.duration}</p>
            <div class="alert alert-success mt-2">
                <small><i class="fas fa-check-circle me-1"></i>Distance calculated using OpenRouteService API</small>
            </div>
        `;
        
    } catch (error) {
        console.error('Error calculating distance:', error);
        const errorMessage = handleRouteCalculationError(error);
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;
    }
}

function displayDistanceResults(distance, duration) {
    const distanceDetails = document.getElementById('distance-details');
    
    distanceDetails.innerHTML = `
        <p><strong>Distance:</strong> ${distance}</p>
        <p><strong>Estimated Travel Time:</strong> ${duration}</p>
        <div class="alert alert-success mt-2">
            <small><i class="fas fa-check-circle me-1"></i>Distance calculated using OpenRouteService API</small>
        </div>
    `;
}

async function saveTrip() {
    const name = document.getElementById('trip-name').value;
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value);
    const calculateDistance = document.getElementById('calculate-distance').checked;
    
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'warning');
        return;
    }
    
    const code = generateTripCode();
    
    // Create trip data with proper structure
    const tripData = {
        name: name.trim(),
        startLocation: startLocation.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        budget,
        code,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        // Initialize as empty objects instead of arrays, or omit them entirely
        expenses: [], // This should work as it's a top-level array
        itinerary: [], // This should work as it's a top-level array
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistance) {
        try {
            document.getElementById('save-trip-btn').disabled = true;
            document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            
            const routeData = await calculateRealDistance(startLocation, destination);
            tripData.route = {
                distance: routeData.distance,
                duration: routeData.duration,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Route calculated during trip creation:', routeData);
            
        } catch (error) {
            console.error('Error calculating route during trip creation:', error);
            // Continue without route data if calculation fails
            showAlert('Trip created but route calculation failed. You can calculate it later.', 'warning');
        }
    }
    
    try {
        document.getElementById('save-trip-btn').disabled = true;
        document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        // Add the new trip to the local array with proper date handling
        const newTrip = {
            ...tripData,
            createdAt: new Date() // Use current date for local display
        };
        userTrips.unshift(newTrip);
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTripModal'));
        modal.hide();
        
        document.getElementById('share-trip-code').textContent = code;
        const shareModal = new bootstrap.Modal(document.getElementById('shareTripModal'));
        shareModal.show();
        
    } catch (error) {
        console.error('Error creating trip:', error);
        showAlert('Error creating trip. Please try again.', 'danger');
        
        // Log the exact error and trip data for debugging
        console.error('Full error details:', error);
        console.error('Trip data that caused error:', tripData);
    } finally {
        document.getElementById('save-trip-btn').disabled = false;
        document.getElementById('save-trip-btn').innerHTML = 'Create Trip';
    }
}

async function updateTrip() {
    const tripId = document.getElementById('edit-trip-id').value;
    const name = document.getElementById('edit-trip-name').value;
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = parseFloat(document.getElementById('edit-trip-budget').value);
    const recalculateDistance = document.getElementById('edit-calculate-distance').checked;
    
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'warning');
        return;
    }
    
    try {
        document.getElementById('update-trip-btn').disabled = true;
        document.getElementById('update-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        
        const updateData = {
            name: name.trim(),
            startLocation: startLocation.trim(),
            destination: destination.trim(),
            startDate,
            endDate,
            budget,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Recalculate route if requested
        if (recalculateDistance) {
            try {
                const routeData = await calculateRealDistance(startLocation, destination);
                updateData.route = {
                    distance: routeData.distance,
                    duration: routeData.duration,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } catch (error) {
                console.error('Error recalculating route:', error);
            }
        }
        
        await db.collection('trips').doc(tripId).update(updateData);
        
        // Update local trip data
        const tripIndex = userTrips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            userTrips[tripIndex] = {
                ...userTrips[tripIndex],
                ...updateData
            };
        }
        
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTripModal'));
        modal.hide();
        
        showAlert('Trip updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating trip:', error);
        showAlert('Error updating trip. Please try again.', 'danger');
    } finally {
        document.getElementById('update-trip-btn').disabled = false;
        document.getElementById('update-trip-btn').innerHTML = 'Update Trip';
    }
}

async function deleteTrip() {
    const tripId = document.getElementById('delete-trip-id').value;
    
    try {
        document.getElementById('confirm-delete-trip-btn').disabled = true;
        document.getElementById('confirm-delete-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Deleting...';
        
        await db.collection('trips').doc(tripId).delete();
        
        // Remove from local array
        userTrips = userTrips.filter(trip => trip.id !== tripId);
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTripModal'));
        modal.hide();
        
        showAlert('Trip deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting trip:', error);
        showAlert('Error deleting trip. Please try again.', 'danger');
    } finally {
        document.getElementById('confirm-delete-trip-btn').disabled = false;
        document.getElementById('confirm-delete-trip-btn').innerHTML = '<i class="fas fa-trash me-1"></i>Delete Trip';
    }
}

async function joinTripWithCode() {
    const code = document.getElementById('trip-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('join-trip-message');
    
    if (!code || code.length < 6 || code.length > 8) {
        showMessage(messageEl, 'Please enter a valid 6-8 character trip code', 'warning');
        return;
    }
    
    try {
        document.getElementById('join-trip-code-btn').disabled = true;
        document.getElementById('join-trip-code-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Joining...';
        
        const tripsSnapshot = await db.collection('trips')
            .where('code', '==', code)
            .get();
        
        if (tripsSnapshot.empty) {
            showMessage(messageEl, 'Invalid trip code. Please check the code and try again.', 'warning');
            return;
        }
        
        const tripDoc = tripsSnapshot.docs[0];
        const trip = tripDoc.data();
        const tripId = tripDoc.id;
        
        if (trip.members.includes(currentUser.uid)) {
            showMessage(messageEl, 'You are already a member of this trip.', 'info');
            return;
        }
        
        await db.collection('trips').doc(tripId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const joinedTrip = { id: tripId, ...trip };
        userTrips.unshift(joinedTrip);
        displayTrips();
        
        showMessage(messageEl, 'Successfully joined the trip! Redirecting...', 'success');
        
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('joinTripModal'));
            modal.hide();
            setCurrentTrip(joinedTrip);
            navigateTo('trip-details.html');
        }, 2000);
        
    } catch (error) {
        console.error('Error joining trip:', error);
        showMessage(messageEl, 'Error joining trip. Please try again.', 'danger');
    } finally {
        document.getElementById('join-trip-code-btn').disabled = false;
        document.getElementById('join-trip-code-btn').innerHTML = 'Join Trip';
    }
}

function showMessage(messageEl, message, type) {
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
}

function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

function copyTripCode() {
    const code = document.getElementById('share-trip-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const copySuccess = document.getElementById('copy-success');
        copySuccess.classList.remove('d-none');
        setTimeout(() => copySuccess.classList.add('d-none'), 3000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
        showAlert('Failed to copy code. Please copy it manually.', 'warning');
    });
}

async function handleLogout() {
    try {
        // Show loading state
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const originalText = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing out...';
            logoutBtn.disabled = true;
        }
        
        // Show loading overlay during logout
        showLoadingOverlay();
        
        await auth.signOut();
        
        // Show success message
        showToast('Signed out successfully!', 'success');
        
        // The auth state listener will automatically show public dashboard
        // No need to navigate away
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error during sign out', 'danger');
    } finally {
        // Reset button state
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
        }
        
        // Ensure loading overlay is hidden
        hideLoadingOverlay();
    }
}

// Simple test function that shows results in alert
function testRouteCalculation() {
    const testStart = "New Delhi";
    const testDest = "Mumbai";
    
    console.log("Testing route calculation...");
    
    calculateRealDistance(testStart, testDest)
        .then(result => {
            console.log("Test result:", result);
            showAlert(`Test: ${testStart} to ${testDest} - ${result.distance} in ${result.duration}`, 'info');
        })
        .catch(error => {
            console.error("Test failed:", error);
            showAlert('Test failed: ' + error.message, 'danger');
        });
}

function validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
        showAlert('Start date cannot be in the past', 'warning');
        return false;
    }
    if (end <= start) {
        showAlert('End date must be after start date', 'warning');
        return false;
    }
    return true;
}

// Add getMemberName function to dashboard.js
// Enhanced getMemberName function
async function getMemberName(memberId) {
    try {
        if (memberId === auth.currentUser.uid) return 'You';
        
        const userDoc = await db.collection('users').doc(memberId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.name || userData.displayName || userData.email || 'Traveler';
        }
        
        return 'Traveler';
    } catch (error) {
        console.error('Error getting member name:', error);
        return 'Traveler';
    }
}

// Public Dashboard functionality
function showPublicDashboard() {
    // Hide loading overlay
    hideLoadingOverlay();
    
    // Show public dashboard
    document.getElementById('public-dashboard').classList.remove('d-none');
    
    // Hide private dashboard
    const privateDashboard = document.querySelector('.container.mt-4');
    if (privateDashboard) {
        privateDashboard.classList.add('d-none');
    }
    
    // Show navigation for public view but update its content
    const nav = document.querySelector('nav');
    if (nav) {
        nav.classList.remove('d-none');
        
        // Update navigation content for public view
        const navbarNav = nav.querySelector('.navbar-nav');
        if (navbarNav) {
            navbarNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link active" href="dashboard.html">
                        <i class="fas fa-home me-1"></i>Home
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#features">
                        <i class="fas fa-star me-1"></i>Features
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#how-it-works">
                        <i class="fas fa-play-circle me-1"></i>How It Works
                    </a>
                </li>
            `;
        }
    }
    
    // Update auth section for public view
    updateNavigationBasedOnAuth(false);
}

function showPrivateDashboard() {
    // Hide loading overlay
    hideLoadingOverlay();
    
    // Hide public dashboard
    document.getElementById('public-dashboard').classList.add('d-none');
    
    // Show private dashboard
    const privateDashboard = document.querySelector('.container.mt-4');
    if (privateDashboard) {
        privateDashboard.classList.remove('d-none');
    }
    
    // Show navigation for private view with full menu
    const nav = document.querySelector('nav');
    if (nav) {
        nav.classList.remove('d-none');
        
        // Update navigation content for private view
        const navbarNav = nav.querySelector('.navbar-nav');
        if (navbarNav) {
            navbarNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link active" href="dashboard.html">
                        <i class="fas fa-home me-1"></i>Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="car-calculations.html">
                        <i class="fas fa-calculator me-1"></i>Car Calculator
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" id="nav-profile">
                        <i class="fas fa-user me-1"></i>Profile
                    </a>
                </li>
            `;
            
            // Re-attach profile event listener
            setTimeout(() => {
                const navProfile = document.getElementById('nav-profile');
                if (navProfile) {
                    navProfile.addEventListener('click', showProfileModal);
                }
            }, 100);
        }
    }
    
    // Update auth section for private view
    updateNavigationBasedOnAuth(true);
}

function showAuthModal() {
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
}

function redirectToAuth() {
    navigateTo('auth.html');
}

function updateNavigationBasedOnAuth(isLoggedIn) {
    const navAuthSection = document.getElementById('nav-auth-section');
    
    if (!navAuthSection) return;
    
    if (isLoggedIn && currentUser) {
        // User is logged in
        navAuthSection.innerHTML = `
            <img id="user-avatar" class="user-avatar me-2" src="${currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=4361ee&color=fff`}" alt="User Avatar">
            <span class="me-3" id="user-name">${currentUser.displayName || 'User'}</span>
            <button class="btn btn-outline-primary btn-sm" id="logout-btn">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </button>
        `;
        
        // Re-attach logout event listener
        setTimeout(() => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        }, 100);
        
    } else {
        // User is not logged in
        navAuthSection.innerHTML = `
            <button class="btn btn-primary btn-sm" id="login-btn">
                <i class="fas fa-sign-in-alt me-1"></i>Sign In
            </button>
        `;
        
        // Attach login event listener
        setTimeout(() => {
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.addEventListener('click', showAuthModal);
            }
        }, 100);
    }
}

function setupProtectedNavigation() {
    // Update car calculator link to handle auth
    const carCalcLink = document.querySelector('a[href="car-calculations.html"]');
    if (carCalcLink) {
        carCalcLink.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }
    
    // Update create first trip button
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    if (createFirstTripBtn) {
        createFirstTripBtn.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }
    
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas ${getToastIcon(type)} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        if (toast.parentNode) {
            toast.remove();
        }
    });
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-triangle';
        case 'warning': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}
