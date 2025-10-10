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
            await loadUserData();
            await loadCustomCategories();
            await loadUserTrips();
            showPrivateDashboard();
            updateNavigationBasedOnAuth(true);
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
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function loadUserData() {
    if (!currentUser) return;
    
    document.getElementById('user-name').textContent = currentUser.displayName || 'Traveler';
    document.getElementById('user-avatar').src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Traveler')}&background=4361ee&color=fff`;
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
        loadRecentCalculations();
        loadFuelTrackingData();
        
        // Add member expenditure statistics
        updateMemberExpenditureStats(userTrips);
        
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

function updateDashboardStats() {
    const totalTrips = userTrips.length;
    const today = new Date();
    
    // Count active trips (trips that are currently ongoing)
    const activeTrips = userTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        return startDate <= today && endDate >= today;
    }).length;
    
    // Calculate total spent across all trips - FIXED: Handle missing expenses array
    const totalSpent = userTrips.reduce((total, trip) => {
        const tripExpenses = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
        return total + tripExpenses;
    }, 0);
    
    // Calculate car-related expenses - FIXED: Handle missing expenses array
    const carExpenses = userTrips.reduce((total, trip) => {
        if (!trip.expenses) return total;
        
        const tripCarExpenses = trip.expenses.filter(expense => 
            expense.category === 'fuel' || 
            (expense.description && (
                expense.description.toLowerCase().includes('car') ||
                expense.description.toLowerCase().includes('fuel') ||
                expense.description.toLowerCase().includes('rental') ||
                expense.description.toLowerCase().includes('maintenance') ||
                expense.description.toLowerCase().includes('toll') ||
                expense.description.toLowerCase().includes('parking')
            ))
        ).reduce((sum, expense) => sum + expense.amount, 0);
        
        return total + tripCarExpenses;
    }, 0);
    
    // Update DOM elements
    document.getElementById('total-trips-count').textContent = totalTrips;
    document.getElementById('active-trips-count').textContent = activeTrips;
    document.getElementById('total-spent-amount').textContent = totalSpent.toFixed(2);
    document.getElementById('car-expenses-amount').textContent = carExpenses.toFixed(2);
    
    // Update car expense chart
    updateCarExpenseChart(userTrips);
}

// Update car expense chart
function updateCarExpenseChart(trips) {
    const ctx = document.getElementById('carExpenseChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (carExpenseChart) {
        carExpenseChart.destroy();
    }
    
    // Calculate car expense breakdown
    const expenseCategories = {
        fuel: 0,
        rental: 0,
        maintenance: 0,
        toll: 0,
        parking: 0,
        other: 0
    };
    
    // Calculate fuel efficiency from fill-ups
    let totalFuel = 0;
    let totalDistance = 0;
    let totalFuelCost = 0;
    
    trips.forEach(trip => {
        if (trip.expenses) {
            trip.expenses.forEach(expense => {
                const desc = expense.description.toLowerCase();
                const amount = expense.amount;
                
                if (expense.category === 'fuel' || desc.includes('fuel')) {
                    expenseCategories.fuel += amount;
                } else if (desc.includes('rental') || desc.includes('car rental')) {
                    expenseCategories.rental += amount;
                } else if (desc.includes('maintenance') || desc.includes('service')) {
                    expenseCategories.maintenance += amount;
                } else if (desc.includes('toll')) {
                    expenseCategories.toll += amount;
                } else if (desc.includes('parking')) {
                    expenseCategories.parking += amount;
                } else if (desc.includes('car') || desc.includes('vehicle')) {
                    expenseCategories.other += amount;
                }
            });
        }
        
        // Calculate fuel efficiency from fill-up data
        if (trip.fuelFillUps && trip.fuelFillUps.length >= 2) {
            for (let i = 1; i < trip.fuelFillUps.length; i++) {
                const distance = trip.fuelFillUps[i].odometer - trip.fuelFillUps[i-1].odometer;
                const fuel = trip.fuelFillUps[i].liters;
                const cost = trip.fuelFillUps[i].cost;
                
                totalDistance += distance;
                totalFuel += fuel;
                totalFuelCost += cost;
            }
        }
    });
    
    const averageMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 0;
    const averageCostPerKm = totalDistance > 0 ? (totalFuelCost / totalDistance).toFixed(2) : 0;
    
    // Filter out zero categories
    const labels = [];
    const data = [];
    const backgroundColors = [
        '#ff6b6b', // fuel - red
        '#4ecdc4', // rental - teal
        '#45b7d1', // maintenance - blue
        '#96ceb4', // toll - green
        '#feca57', // parking - yellow
        '#b8b8b8'  // other - gray
    ];
    
    Object.keys(expenseCategories).forEach((category, index) => {
        if (expenseCategories[category] > 0) {
            labels.push(category.charAt(0).toUpperCase() + category.slice(1));
            data.push(expenseCategories[category]);
        }
    });
    
    const totalCarExpenses = data.reduce((sum, value) => sum + value, 0);
    
    if (data.length === 0) {
        document.getElementById('car-expense-details').innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-car fa-3x mb-3"></i>
                <p>No car expenses recorded yet</p>
                ${averageMileage > 0 ? `
                    <div class="mt-3 p-3 bg-light rounded">
                        <h6 class="text-success">Fuel Efficiency</h6>
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">Average Mileage</small>
                                <div class="fw-bold">${averageMileage} km/L</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Cost per Km</small>
                                <div class="fw-bold">₹${averageCostPerKm}/km</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                <a href="car-calculations.html" class="btn btn-primary btn-sm mt-3">
                    <i class="fas fa-calculator me-1"></i>Calculate Car Expenses
                </a>
            </div>
        `;
        return;
    }
    
    // Create chart
    carExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Update expense details with fuel efficiency
    let fuelEfficiencyHtml = '';
    if (averageMileage > 0) {
        fuelEfficiencyHtml = `
            <div class="mt-3 p-3 bg-light rounded">
                <h6 class="text-success mb-3">
                    <i class="fas fa-chart-line me-2"></i>Fuel Efficiency
                </h6>
                <div class="row text-center">
                    <div class="col-md-4 mb-2">
                        <small class="text-muted d-block">Average Mileage</small>
                        <span class="fw-bold text-primary">${averageMileage} km/L</span>
                    </div>
                    <div class="col-md-4 mb-2">
                        <small class="text-muted d-block">Cost per Km</small>
                        <span class="fw-bold text-success">₹${averageCostPerKm}/km</span>
                    </div>
                    <div class="col-md-4 mb-2">
                        <small class="text-muted d-block">Total Distance</small>
                        <span class="fw-bold text-info">${totalDistance} km</span>
                    </div>
                </div>
                ${totalFuel > 0 ? `
                    <div class="row text-center mt-2">
                        <div class="col-md-6">
                            <small class="text-muted d-block">Total Fuel</small>
                            <span class="fw-bold text-warning">${totalFuel.toFixed(1)} L</span>
                        </div>
                        <div class="col-md-6">
                            <small class="text-muted d-block">Fuel Cost</small>
                            <span class="fw-bold text-danger">₹${totalFuelCost.toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    document.getElementById('car-expense-details').innerHTML = `
        <div class="text-center">
            <h4 class="text-primary"><span class="rupee-symbol">₹</span>${totalCarExpenses.toFixed(2)}</h4>
            <p class="text-muted mb-3">Total Car Expenses</p>
            
            ${labels.map((label, index) => `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small">${label}:</span>
                    <span class="fw-bold"><span class="rupee-symbol">₹</span>${data[index].toFixed(2)}</span>
                </div>
            `).join('')}
            
            ${fuelEfficiencyHtml}
            
            <a href="car-calculations.html" class="btn btn-primary btn-sm mt-3">
                <i class="fas fa-calculator me-1"></i>New Calculation
            </a>
        </div>
    `;
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
    
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    const remaining = trip.budget - totalSpent;
    
    // Calculate car expenses for this trip
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
                
                <!-- Budget Progress -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>Budget: <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</span>
                        <span>Spent: <span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</span>
                    </div>
                    <div class="progress mb-2" style="height: 10px;">
                        <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                
                <!-- Car Expense Info -->
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
        const originalText = logoutBtn.innerHTML;
        logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing out...';
        logoutBtn.disabled = true;
        
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
        logoutBtn.disabled = false;
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
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

function loadFuelTrackingData() {
    loadRecentFuelFillups();
    calculateFuelStatistics();
    renderFuelPriceChart();
}

function calculateFuelStatistics() {
    let totalFuel = 0;
    let totalFuelCost = 0;
    let totalDistance = 0;
    let allFillUps = [];

    // Collect all fuel fill-ups from all trips
    userTrips.forEach(trip => {
        if (trip.fuelFillUps && trip.fuelFillUps.length > 0) {
            allFillUps = allFillUps.concat(trip.fuelFillUps.map(fillUp => ({
                ...fillUp,
                tripName: trip.name
            })));
        }
    });

    // Calculate statistics
    if (allFillUps.length >= 2) {
        // Sort all fill-ups by odometer reading
        allFillUps.sort((a, b) => a.odometer - b.odometer);

        for (let i = 1; i < allFillUps.length; i++) {
            const distance = allFillUps[i].odometer - allFillUps[i-1].odometer;
            const fuel = allFillUps[i].liters;
            const cost = allFillUps[i].cost;

            totalDistance += distance;
            totalFuel += fuel;
            totalFuelCost += cost;
        }
    }

    // Also include fuel from expenses for total cost
    userTrips.forEach(trip => {
        if (trip.expenses) {
            trip.expenses.forEach(expense => {
                if (expense.category === 'fuel' || expense.description.toLowerCase().includes('fuel')) {
                    totalFuelCost += expense.amount;
                }
            });
        }
    });

    const averageMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 0;

    // Update DOM
    document.getElementById('total-fuel-filled').textContent = `${totalFuel.toFixed(1)} L`;
    document.getElementById('total-fuel-cost').textContent = totalFuelCost.toFixed(2);
    document.getElementById('average-mileage').textContent = `${averageMileage} km/L`;
    document.getElementById('total-fuel-distance').textContent = `${totalDistance} km`;
}

function loadRecentFuelFillups() {
    const recentFuelContainer = document.getElementById('recent-fuel-fillups');
    let allFillUps = [];

    // Collect all fuel fill-ups from all trips
    userTrips.forEach(trip => {
        if (trip.fuelFillUps && trip.fuelFillUps.length > 0) {
            // Filter out any invalid fill-ups
            const validFillUps = trip.fuelFillUps.filter(fillUp => 
                fillUp && 
                fillUp.odometer && 
                fillUp.liters && 
                fillUp.cost &&
                fillUp.odometer > 0 &&
                fillUp.liters > 0 &&
                fillUp.cost > 0
            );
            
            if (validFillUps.length > 0) {
                allFillUps = allFillUps.concat(validFillUps.map(fillUp => ({
                    ...fillUp,
                    tripName: trip.name,
                    tripCode: trip.code
                })));
            }
        }
    });

    // Sort by date (newest first) and filter out duplicates
    allFillUps.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Remove duplicates based on timestamp and odometer
    const uniqueFillUps = allFillUps.filter((fillUp, index, self) =>
        index === self.findIndex(f => 
            f.timestamp === fillUp.timestamp && 
            f.odometer === fillUp.odometer
        )
    );

    // Take only last 5 fill-ups
    const recentFillUps = uniqueFillUps.slice(0, 5);

    if (recentFillUps.length === 0) {
        recentFuelContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-gas-pump fa-2x mb-2"></i>
                <p>No fuel fill-ups recorded yet</p>
                <a href="car-calculations.html" class="btn btn-success btn-sm">
                    <i class="fas fa-plus me-1"></i>Add Fuel Fill-up
                </a>
            </div>
        `;
        return;
    }

    recentFuelContainer.innerHTML = recentFillUps.map(fillUp => {
        const date = new Date(fillUp.date).toLocaleDateString();
        const fuelPrice = fillUp.fuelPrice || (fillUp.cost / fillUp.liters).toFixed(2);
        
        return `
            <div class="card mb-2">
                <div class="card-body py-3">
                    <div class="row align-items-center">
                        <div class="col-md-2 text-center">
                            <i class="fas fa-gas-pump text-warning fa-2x"></i>
                        </div>
                        <div class="col-md-3">
                            <strong class="d-block">${fillUp.liters} L</strong>
                            <small class="text-muted">₹${fuelPrice}/L</small>
                        </div>
                        <div class="col-md-2">
                            <strong class="text-success">₹${fillUp.cost.toFixed(2)}</strong>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">
                                <i class="fas fa-road me-1"></i>${fillUp.odometer} km
                            </small>
                            <br>
                            <small class="text-muted">${date}</small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge bg-primary">${fillUp.tripName}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add "View All" button if there are more fill-ups
    if (uniqueFillUps.length > 5) {
        recentFuelContainer.innerHTML += `
            <div class="text-center mt-3">
                <button class="btn btn-outline-primary btn-sm" id="view-all-fillups-btn">
                    <i class="fas fa-list me-1"></i>View All ${uniqueFillUps.length} Fill-ups
                </button>
            </div>
        `;

        document.getElementById('view-all-fillups-btn').addEventListener('click', showAllFuelFillupsModal);
    }
}

function renderFuelPriceChart() {
    const ctx = document.getElementById('fuelPriceChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (fuelPriceChart) {
        fuelPriceChart.destroy();
    }

    let allFillUps = [];

    // Collect all fuel fill-ups
    userTrips.forEach(trip => {
        if (trip.fuelFillUps && trip.fuelFillUps.length > 0) {
            allFillUps = allFillUps.concat(trip.fuelFillUps);
        }
    });

    if (allFillUps.length < 2) {
        document.getElementById('fuelPriceChart').closest('.mt-4').innerHTML = `
            <h6><i class="fas fa-chart-line me-2"></i>Fuel Price Trend</h6>
            <div class="text-center text-muted py-4">
                <i class="fas fa-chart-line fa-2x mb-2"></i>
                <p>Not enough data for fuel price trend</p>
                <small>Add more fuel fill-ups to see the trend</small>
            </div>
        `;
        return;
    }

    // Sort by date
    allFillUps.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare chart data
    const labels = allFillUps.map(fillUp => {
        const date = new Date(fillUp.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const fuelPrices = allFillUps.map(fillUp => {
        return fillUp.fuelPrice || (fillUp.cost / fillUp.liters);
    });

    const fuelAmounts = allFillUps.map(fillUp => fillUp.liters);

    fuelPriceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Fuel Price (₹/L)',
                    data: fuelPrices,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Fuel Amount (L)',
                    data: fuelAmounts,
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Price (₹/L)'
                    },
                    min: Math.min(...fuelPrices) * 0.9,
                    max: Math.max(...fuelPrices) * 1.1
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Amount (L)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    min: 0,
                    max: Math.max(...fuelAmounts) * 1.2
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.label.includes('Price')) {
                                label += '₹' + context.parsed.y.toFixed(2) + '/L';
                            } else {
                                label += context.parsed.y.toFixed(1) + 'L';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function showAllFuelFillupsModal() {
    let allFillUps = [];

    // Collect all fuel fill-ups
    userTrips.forEach(trip => {
        if (trip.fuelFillUps && trip.fuelFillUps.length > 0) {
            allFillUps = allFillUps.concat(trip.fuelFillUps.map(fillUp => ({
                ...fillUp,
                tripName: trip.name,
                tripCode: trip.code
            })));
        }
    });

    // Sort by date (newest first)
    allFillUps.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="allFuelFillupsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-gas-pump me-2"></i>All Fuel Fill-ups
                            <span class="badge bg-primary ms-2">${allFillUps.length}</span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Odometer</th>
                                        <th>Fuel</th>
                                        <th>Price</th>
                                        <th>Cost</th>
                                        <th>Trip</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${allFillUps.map(fillUp => {
                                        const date = new Date(fillUp.date).toLocaleDateString();
                                        const fuelPrice = fillUp.fuelPrice || (fillUp.cost / fillUp.liters).toFixed(2);
                                        return `
                                            <tr>
                                                <td>${date}</td>
                                                <td>${fillUp.odometer} km</td>
                                                <td>${fillUp.liters} L</td>
                                                <td>₹${fuelPrice}/L</td>
                                                <td class="text-success fw-bold">₹${fillUp.cost.toFixed(2)}</td>
                                                <td><span class="badge bg-light text-dark">${fillUp.tripName}</span></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                                <tfoot>
                                    <tr class="table-primary">
                                        <td colspan="2"><strong>Total</strong></td>
                                        <td><strong>${allFillUps.reduce((sum, fill) => sum + fill.liters, 0).toFixed(1)} L</strong></td>
                                        <td></td>
                                        <td><strong>₹${allFillUps.reduce((sum, fill) => sum + fill.cost, 0).toFixed(2)}</strong></td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <a href="car-calculations.html" class="btn btn-success">
                            <i class="fas fa-plus me-1"></i>Add New Fill-up
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('allFuelFillupsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('allFuelFillupsModal'));
    modal.show();
}

// Function to clear fuel data from a specific trip
async function clearTripFuelData(tripId) {
    try {
        await db.collection('trips').doc(tripId).update({
            fuelFillUps: [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reload the dashboard data
        await loadUserTrips();
        showToast('Fuel data cleared successfully!', 'success');
    } catch (error) {
        console.error('Error clearing fuel data:', error);
        showToast('Error clearing fuel data', 'danger');
    }
}

// Add member expenditure statistics to dashboard
function updateMemberExpenditureStats(trips) {
    const memberStatsContainer = document.createElement('div');
    memberStatsContainer.className = 'row mb-4';
    memberStatsContainer.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-users me-2"></i>Member Expenditure Statistics</h5>
                </div>
                <div class="card-body">
                    <div id="member-expenditure-stats">
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-users fa-3x mb-3"></i>
                            <p>No expenditure data available yet</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert after car expense breakdown section
    const carExpenseSection = document.querySelector('.row.mb-4');
    if (carExpenseSection) {
        carExpenseSection.parentNode.insertBefore(memberStatsContainer, carExpenseSection.nextSibling);
    }

    calculateAndDisplayMemberExpenditure(trips);
}

async function calculateAndDisplayMemberExpenditure(trips) {
    const memberStatsElement = document.getElementById('member-expenditure-stats');
    
    if (!trips || trips.length === 0) {
        memberStatsElement.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>No expenditure data available</p>
            </div>
        `;
        return;
    }

    try {
        // Collect all unique members across all trips
        const allMembers = new Set();
        const memberExpenses = {};
        const memberTripCount = {};

        // Initialize member data
        for (const trip of trips) {
            if (trip.members) {
                trip.members.forEach(memberId => {
                    allMembers.add(memberId);
                    if (!memberExpenses[memberId]) {
                        memberExpenses[memberId] = 0;
                        memberTripCount[memberId] = 0;
                    }
                    memberTripCount[memberId]++;
                });
            }
        }

        // Calculate expenses for each member
        for (const trip of trips) {
            if (trip.expenses) {
                for (const expense of trip.expenses) {
                    if (memberExpenses[expense.addedBy] !== undefined) {
                        memberExpenses[expense.addedBy] += expense.amount;
                    }
                }
            }
        }

        // Get member names
        const memberData = [];
        for (const memberId of allMembers) {
            const memberName = await getMemberName(memberId);
            const totalSpent = memberExpenses[memberId] || 0;
            const tripsCount = memberTripCount[memberId] || 0;
            
            memberData.push({
                id: memberId,
                name: memberName,
                totalSpent: totalSpent,
                tripsCount: tripsCount,
                isCurrentUser: memberId === auth.currentUser.uid
            });
        }

        // Calculate equalization
        const equalizationData = calculateExpenseEqualization(memberData);

        // Sort by total spent (descending)
        memberData.sort((a, b) => b.totalSpent - a.totalSpent);

        // Calculate total across all members
        const totalAllExpenses = memberData.reduce((sum, member) => sum + member.totalSpent, 0);

        if (memberData.length === 0) {
            memberStatsElement.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-users fa-3x mb-3"></i>
                    <p>No expenditure data available</p>
                </div>
            `;
            return;
        }

        // Display member statistics with equalization
        memberStatsElement.innerHTML = `
            <div class="row">
                <div class="col-md-12 mb-4">
                    <div class="card border-warning">
                        <div class="card-header bg-warning text-dark">
                            <h6 class="mb-0"><i class="fas fa-balance-scale me-2"></i>Expense Equalization Summary</h6>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <h4 class="text-primary"><span class="rupee-symbol">₹</span>${totalAllExpenses.toFixed(2)}</h4>
                                            <small class="text-muted">Total Group Expenses</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <h4 class="text-success"><span class="rupee-symbol">₹</span>${equalizationData.averagePerPerson.toFixed(2)}</h4>
                                            <small class="text-muted">Average Per Person</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <h4 class="text-info">${allMembers.size}</h4>
                                            <small class="text-muted">Total Members</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <h4 class="${equalizationData.netBalance === 0 ? 'text-success' : 'text-warning'}">
                                                <span class="rupee-symbol">₹</span>${Math.abs(equalizationData.netBalance).toFixed(2)}
                                            </h4>
                                            <small class="text-muted">${equalizationData.netBalance === 0 ? 'Perfectly Balanced' : 'Net Balance'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${equalizationData.transactions.length > 0 ? `
                                <div class="mt-4">
                                    <h6 class="text-center mb-3"><i class="fas fa-exchange-alt me-2"></i>Payment Settlements Required</h6>
                                    <div class="row justify-content-center">
                                        ${equalizationData.transactions.map(transaction => `
                                            <div class="col-md-8 mb-2">
                                                <div class="alert ${transaction.amount > 0 ? 'alert-success' : 'alert-info'} py-2">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <span>
                                                            <strong>${transaction.from}</strong>
                                                            <i class="fas fa-arrow-right mx-2"></i>
                                                            <strong>${transaction.to}</strong>
                                                        </span>
                                                        <span class="fw-bold">
                                                            <span class="rupee-symbol">₹</span>${Math.abs(transaction.amount).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : `
                                <div class="text-center mt-3">
                                    <div class="alert alert-success">
                                        <i class="fas fa-check-circle me-2"></i>
                                        All expenses are perfectly balanced! No settlements needed.
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="fas fa-list me-2"></i>Detailed Member Breakdown</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Trips</th>
                                            <th>Total Spent</th>
                                            <th>Should Pay/Receive</th>
                                            <th>Balance</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${equalizationData.memberBalances.map(member => `
                                            <tr class="${member.isCurrentUser ? 'table-info' : ''}">
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <span class="badge ${member.isCurrentUser ? 'bg-info' : 'bg-primary'} me-2">
                                                            ${member.isCurrentUser ? 'You' : 'Member'}
                                                        </span>
                                                        ${member.name}
                                                    </div>
                                                </td>
                                                <td>${member.tripsCount}</td>
                                                <td class="fw-bold">
                                                    <span class="rupee-symbol">₹</span>${member.totalSpent.toFixed(2)}
                                                </td>
                                                <td class="fw-bold">
                                                    <span class="rupee-symbol">₹</span>${member.shouldHavePaid.toFixed(2)}
                                                </td>
                                                <td class="fw-bold ${member.balance > 0 ? 'text-success' : member.balance < 0 ? 'text-danger' : 'text-dark'}">
                                                    <span class="rupee-symbol">₹</span>${Math.abs(member.balance).toFixed(2)}
                                                    ${member.balance > 0 ? '<i class="fas fa-arrow-up ms-1"></i>' : 
                                                      member.balance < 0 ? '<i class="fas fa-arrow-down ms-1"></i>' : ''}
                                                </td>
                                                <td>
                                                    <span class="badge ${member.balance === 0 ? 'bg-success' : 
                                                                       member.balance > 0 ? 'bg-warning text-dark' : 
                                                                       'bg-info text-dark'}">
                                                        ${member.balance === 0 ? 'Balanced' :
                                                          member.balance > 0 ? 'To Receive' : 'To Pay'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot class="table-primary">
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td>${trips.length}</td>
                                            <td class="fw-bold">
                                                <span class="rupee-symbol">₹</span>${totalAllExpenses.toFixed(2)}
                                            </td>
                                            <td class="fw-bold">
                                                <span class="rupee-symbol">₹</span>${totalAllExpenses.toFixed(2)}
                                            </td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Expense Distribution</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="memberExpenseChart" height="250"></canvas>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fas fa-percentage me-2"></i>Balance Overview</h6>
                        </div>
                        <div class="card-body">
                            <div id="balance-summary">
                                ${equalizationData.memberBalances.map(member => `
                                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded ${member.isCurrentUser ? 'bg-light' : ''}">
                                        <div>
                                            <small class="fw-bold">${member.name}</small>
                                            <br>
                                            <small class="text-muted">${member.isCurrentUser ? '(You)' : ''}</small>
                                        </div>
                                        <div class="text-end">
                                            <span class="badge ${member.balance > 0 ? 'bg-warning text-dark' : 
                                                               member.balance < 0 ? 'bg-info text-dark' : 
                                                               'bg-success'}">
                                                ${member.balance > 0 ? 'Gets ₹' + Math.abs(member.balance).toFixed(2) :
                                                  member.balance < 0 ? 'Pays ₹' + Math.abs(member.balance).toFixed(2) :
                                                  'Settled'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render the pie chart
        renderMemberExpenseChart(equalizationData.memberBalances);

        // Generate settlement actions
        generateSettlementActions(equalizationData);

    } catch (error) {
        console.error('Error calculating member expenditure:', error);
        memberStatsElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading member statistics
            </div>
        `;
    }
}

// Add the expense equalization calculation function
function calculateExpenseEqualization(memberData) {
    // Calculate total expenses
    const totalExpenses = memberData.reduce((sum, member) => sum + member.totalSpent, 0);
    
    // Calculate average per person
    const averagePerPerson = totalExpenses / memberData.length;
    
    // Calculate each member's balance (positive = should receive, negative = should pay)
    const memberBalances = memberData.map(member => ({
        ...member,
        shouldHavePaid: averagePerPerson,
        balance: member.totalSpent - averagePerPerson
    }));
    
    // Sort members by balance (highest positive first, then highest negative)
    const receivers = memberBalances.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance);
    const payers = memberBalances.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance);
    
    // Calculate transactions to settle balances
    const transactions = [];
    
    let receiverIndex = 0;
    let payerIndex = 0;
    
    while (receiverIndex < receivers.length && payerIndex < payers.length) {
        const receiver = receivers[receiverIndex];
        const payer = payers[payerIndex];
        
        const amount = Math.min(receiver.balance, Math.abs(payer.balance));
        
        if (amount > 0.01) { // Only create transactions for amounts greater than 1 paisa
            transactions.push({
                from: payer.name,
                to: receiver.name,
                amount: amount
            });
            
            // Update balances
            receiver.balance -= amount;
            payer.balance += amount;
            
            // Move to next receiver/payer if balance is settled
            if (Math.abs(receiver.balance) < 0.01) receiverIndex++;
            if (Math.abs(payer.balance) < 0.01) payerIndex++;
        }
    }
    
    // Calculate net balance (should be very close to 0 due to rounding)
    const netBalance = memberBalances.reduce((sum, member) => sum + member.balance, 0);
    
    return {
        totalExpenses,
        averagePerPerson,
        memberBalances,
        transactions,
        netBalance
    };
}

function renderMemberExpenseChart(memberData) {
    const ctx = document.getElementById('memberExpenseChart').getContext('2d');
    
    const labels = memberData.map(member => 
        member.name.length > 15 ? member.name.substring(0, 15) + '...' : member.name
    );
    const data = memberData.map(member => member.totalSpent);
    
    // Generate distinct colors
    const backgroundColors = memberData.map((member, index) => {
        if (member.isCurrentUser) return '#17a2b8'; // Info color for current user
        const colors = ['#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'];
        return colors[index % colors.length];
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
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
