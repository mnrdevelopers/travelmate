let currentUser = null;
let userTrips = [];
let customCategories = [];
let carExpenseChart = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupDashboardEventListeners();
    initializeApp();
});

function setupDashboardEventListeners() {
    // Trip management - with null checks
    const createTripBtn = document.getElementById('create-trip-btn');
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    const joinTripBtn = document.getElementById('join-trip-btn');
    const saveTripBtn = document.getElementById('save-trip-btn');
    const updateTripBtn = document.getElementById('update-trip-btn');
    const confirmDeleteTripBtn = document.getElementById('confirm-delete-trip-btn');
    const joinTripCodeBtn = document.getElementById('join-trip-code-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const navProfile = document.getElementById('nav-profile');
    
    if (createTripBtn) createTripBtn.addEventListener('click', showCreateTripModal);
    if (createFirstTripBtn) createFirstTripBtn.addEventListener('click', showCreateTripModal);
    if (joinTripBtn) joinTripBtn.addEventListener('click', showJoinTripModal);
    if (saveTripBtn) saveTripBtn.addEventListener('click', saveTrip);
    if (updateTripBtn) updateTripBtn.addEventListener('click', updateTrip);
    if (confirmDeleteTripBtn) confirmDeleteTripBtn.addEventListener('click', deleteTrip);
    if (joinTripCodeBtn) joinTripCodeBtn.addEventListener('click', joinTripWithCode);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyTripCode);
    if (navProfile) navProfile.addEventListener('click', showProfileModal);
    
    // Distance calculation - updated for multiple stops
    const calculateDistance = document.getElementById('calculate-distance');
    const editCalculateDistance = document.getElementById('edit-calculate-distance');
    
    if (calculateDistance) {
        calculateDistance.addEventListener('change', function() {
            if (this.checked) {
                calculateDistanceWithStops();
            } else {
                const distanceResults = document.getElementById('distance-results');
                if (distanceResults) distanceResults.classList.add('d-none');
            }
        });
    }
    
    if (editCalculateDistance) {
        editCalculateDistance.addEventListener('change', function() {
            if (this.checked) {
                calculateEditDistanceWithStops();
            } else {
                const editDistanceResults = document.getElementById('edit-distance-results');
                if (editDistanceResults) editDistanceResults.classList.add('d-none');
            }
        });
    }
    
    // Profile operations
    setupProfileEventListeners();
    
    // Setup multiple stops functionality
    setupMultipleStops();
}

// Multiple stops functionality
function setupMultipleStops() {
    // Add stop button for create modal
    const addStopBtn = document.getElementById('add-stop-btn');
    const editAddStopBtn = document.getElementById('edit-add-stop-btn');
    
    if (addStopBtn) {
        addStopBtn.addEventListener('click', addIntermediateStop);
    }
    
    if (editAddStopBtn) {
        editAddStopBtn.addEventListener('click', addEditIntermediateStop);
    }
}

function addIntermediateStop() {
    const container = document.getElementById('intermediate-stops-container');
    if (!container) return;
    
    const stopIndex = container.children.length;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'route-stop mb-2 intermediate-stop';
    stopDiv.innerHTML = `
        <div class="input-group">
            <span class="input-group-text bg-warning text-dark">
                <i class="fas fa-map-marker-alt"></i>
            </span>
            <input type="text" class="form-control intermediate-location" placeholder="Stop ${stopIndex + 1} (City, Country)">
            <button type="button" class="btn btn-outline-danger remove-stop-btn" title="Remove stop">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(stopDiv);
    
    // Add event listener to remove button
    stopDiv.querySelector('.remove-stop-btn').addEventListener('click', function() {
        stopDiv.remove();
        renumberStops();
    });
}

function addEditIntermediateStop() {
    const container = document.getElementById('edit-intermediate-stops-container');
    if (!container) return;
    
    const stopIndex = container.children.length;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'route-stop mb-2 edit-intermediate-stop';
    stopDiv.innerHTML = `
        <div class="input-group">
            <span class="input-group-text bg-warning text-dark">
                <i class="fas fa-map-marker-alt"></i>
            </span>
            <input type="text" class="form-control edit-intermediate-location" placeholder="Stop ${stopIndex + 1} (City, Country)">
            <button type="button" class="btn btn-outline-danger remove-stop-btn" title="Remove stop">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(stopDiv);
    
    // Add event listener to remove button
    stopDiv.querySelector('.remove-stop-btn').addEventListener('click', function() {
        stopDiv.remove();
        renumberEditStops();
    });
}

function renumberStops() {
    const stops = document.querySelectorAll('.intermediate-stop');
    stops.forEach((stop, index) => {
        const input = stop.querySelector('.intermediate-location');
        if (input) {
            input.placeholder = `Stop ${index + 1} (City, Country)`;
        }
    });
}

function renumberEditStops() {
    const stops = document.querySelectorAll('.edit-intermediate-stop');
    stops.forEach((stop, index) => {
        const input = stop.querySelector('.edit-intermediate-location');
        if (input) {
            input.placeholder = `Stop ${index + 1} (City, Country)`;
        }
    });
}

function getStopsFromCreateForm() {
    const startLocation = document.getElementById('start-location');
    const destination = document.getElementById('trip-destination');
    
    const intermediateInputs = document.querySelectorAll('.intermediate-location');
    const intermediateStops = Array.from(intermediateInputs)
        .map(input => input.value.trim())
        .filter(stop => stop.length > 0);
    
    return {
        startLocation: startLocation ? startLocation.value : '',
        intermediateStops,
        destination: destination ? destination.value : ''
    };
}

function getStopsFromEditForm() {
    const startLocation = document.getElementById('edit-start-location');
    const destination = document.getElementById('edit-trip-destination');
    
    const intermediateInputs = document.querySelectorAll('.edit-intermediate-location');
    const intermediateStops = Array.from(intermediateInputs)
        .map(input => input.value.trim())
        .filter(stop => stop.length > 0);
    
    return {
        startLocation: startLocation ? startLocation.value : '',
        intermediateStops,
        destination: destination ? destination.value : ''
    };
}

function populateEditStops(trip) {
    const container = document.getElementById('edit-intermediate-stops-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (trip.intermediateStops && trip.intermediateStops.length > 0) {
        trip.intermediateStops.forEach((stop, index) => {
            addEditIntermediateStop();
            const stops = document.querySelectorAll('.edit-intermediate-location');
            if (stops[index]) {
                stops[index].value = stop;
            }
        });
    }
}

// Enhanced distance calculation for multiple stops
async function calculateDistanceWithStops() {
    const stopsData = getStopsFromCreateForm();
    
    if (!validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination)) {
        showAlert('Please enter valid start and destination locations', 'warning');
        return;
    }
    
    try {
        const distanceDetails = document.getElementById('distance-details');
        if (distanceDetails) {
            distanceDetails.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Calculating route with ${stopsData.intermediateStops.length + 1} segments...
                </div>
            `;
        }
        
        const distanceResults = document.getElementById('distance-results');
        if (distanceResults) distanceResults.classList.remove('d-none');
        
        const allStops = [stopsData.startLocation, ...stopsData.intermediateStops, stopsData.destination];
        const routeSegments = [];
        let totalDistance = 0;
        let totalDuration = 0;
        
        // Calculate distance for each segment
        for (let i = 0; i < allStops.length - 1; i++) {
            const from = allStops[i];
            const to = allStops[i + 1];
            
            try {
                const segmentData = await calculateRealDistance(from, to);
                routeSegments.push({
                    from,
                    to,
                    distance: segmentData.distance,
                    duration: segmentData.duration,
                    durationMinutes: parseDurationToMinutes(segmentData.duration)
                });
                
                totalDistance += parseFloat(segmentData.distance);
                totalDuration += segmentData.durationMinutes || parseDurationToMinutes(segmentData.duration);
                
            } catch (error) {
                console.error(`Error calculating segment ${i + 1}:`, error);
                routeSegments.push({
                    from,
                    to,
                    distance: 'Unknown',
                    duration: 'Unknown',
                    error: true
                });
            }
        }
        
        displayDistanceResultsWithStops(routeSegments, totalDistance, totalDuration);
        
    } catch (error) {
        console.error('Error calculating route with stops:', error);
        const distanceDetails = document.getElementById('distance-details');
        if (distanceDetails) {
            distanceDetails.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error calculating route. Please try again.
                </div>
            `;
        }
    }
}

async function calculateEditDistanceWithStops() {
    const stopsData = getStopsFromEditForm();
    
    if (!validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination)) {
        showAlert('Please enter valid start and destination locations', 'warning');
        return;
    }
    
    try {
        const editDistanceDetails = document.getElementById('edit-distance-details');
        if (editDistanceDetails) {
            editDistanceDetails.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Calculating route with ${stopsData.intermediateStops.length + 1} segments...
                </div>
            `;
        }
        
        const editDistanceResults = document.getElementById('edit-distance-results');
        if (editDistanceResults) editDistanceResults.classList.remove('d-none');
        
        const allStops = [stopsData.startLocation, ...stopsData.intermediateStops, stopsData.destination];
        const routeSegments = [];
        let totalDistance = 0;
        let totalDuration = 0;
        
        // Calculate distance for each segment
        for (let i = 0; i < allStops.length - 1; i++) {
            const from = allStops[i];
            const to = allStops[i + 1];
            
            try {
                const segmentData = await calculateRealDistance(from, to);
                routeSegments.push({
                    from,
                    to,
                    distance: segmentData.distance,
                    duration: segmentData.duration,
                    durationMinutes: parseDurationToMinutes(segmentData.duration)
                });
                
                totalDistance += parseFloat(segmentData.distance);
                totalDuration += segmentData.durationMinutes || parseDurationToMinutes(segmentData.duration);
                
            } catch (error) {
                console.error(`Error calculating segment ${i + 1}:`, error);
                routeSegments.push({
                    from,
                    to,
                    distance: 'Unknown',
                    duration: 'Unknown',
                    error: true
                });
            }
        }
        
        displayEditDistanceResultsWithStops(routeSegments, totalDistance, totalDuration);
        
    } catch (error) {
        console.error('Error calculating route with stops:', error);
        const editDistanceDetails = document.getElementById('edit-distance-details');
        if (editDistanceDetails) {
            editDistanceDetails.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error calculating route. Please try again.
                </div>
            `;
        }
    }
}

function displayDistanceResultsWithStops(segments, totalDistance, totalDuration) {
    const distanceDetails = document.getElementById('distance-details');
    if (!distanceDetails) return;
    
    let html = `
        <div class="route-summary mb-3 p-3 bg-light rounded">
            <h6 class="mb-2">Route Summary</h6>
            <p class="mb-1"><strong>Total Distance:</strong> ${totalDistance.toFixed(1)} km</p>
            <p class="mb-0"><strong>Total Travel Time:</strong> ${formatMinutesToDuration(totalDuration)}</p>
        </div>
        <h6 class="mb-2">Route Segments:</h6>
    `;
    
    segments.forEach((segment, index) => {
        html += `
            <div class="route-segment mb-2 p-2 border rounded ${segment.error ? 'bg-warning' : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Segment ${index + 1}</small>
                        <div class="small">${segment.from} → ${segment.to}</div>
                    </div>
                    <div class="text-end">
                        <div class="small">${segment.distance}</div>
                        <div class="small text-muted">${segment.duration}</div>
                    </div>
                </div>
                ${segment.error ? '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Calculation failed</small>' : ''}
            </div>
        `;
    });
    
    html += `
        <div class="alert alert-success mt-2">
            <small><i class="fas fa-check-circle me-1"></i>Route calculated with ${segments.length} segments using OpenRouteService API</small>
        </div>
    `;
    
    distanceDetails.innerHTML = html;
}

function displayEditDistanceResultsWithStops(segments, totalDistance, totalDuration) {
    const distanceDetails = document.getElementById('edit-distance-details');
    if (!distanceDetails) return;
    
    let html = `
        <div class="route-summary mb-3 p-3 bg-light rounded">
            <h6 class="mb-2">Route Summary</h6>
            <p class="mb-1"><strong>Total Distance:</strong> ${totalDistance.toFixed(1)} km</p>
            <p class="mb-0"><strong>Total Travel Time:</strong> ${formatMinutesToDuration(totalDuration)}</p>
        </div>
        <h6 class="mb-2">Route Segments:</h6>
    `;
    
    segments.forEach((segment, index) => {
        html += `
            <div class="route-segment mb-2 p-2 border rounded ${segment.error ? 'bg-warning' : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Segment ${index + 1}</small>
                        <div class="small">${segment.from} → ${segment.to}</div>
                    </div>
                    <div class="text-end">
                        <div class="small">${segment.distance}</div>
                        <div class="small text-muted">${segment.duration}</div>
                    </div>
                </div>
                ${segment.error ? '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Calculation failed</small>' : ''}
            </div>
        `;
    });
    
    html += `
        <div class="alert alert-success mt-2">
            <small><i class="fas fa-check-circle me-1"></i>Route calculated with ${segments.length} segments using OpenRouteService API</small>
        </div>
    `;
    
    distanceDetails.innerHTML = html;
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
    
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileUserId = document.getElementById('profile-userid');
    const profileAvatar = document.getElementById('profile-avatar');
    
    if (profileName) profileName.value = user.displayName || '';
    if (profileEmail) profileEmail.value = user.email || '';
    if (profileUserId) profileUserId.value = user.uid;
    if (profileAvatar) profileAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4361ee&color=fff`;
    
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        const modal = new bootstrap.Modal(profileModal);
        modal.show();
    }
}

async function saveProfile() {
    const nameInput = document.getElementById('profile-name');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    
    if (!name) {
        showAlert('Please enter a display name', 'warning');
        return;
    }
    
    try {
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.disabled = true;
            saveProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        }
        
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
        
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            const modal = bootstrap.Modal.getInstance(profileModal);
            if (modal) modal.hide();
        }
        
        showAlert('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'danger');
    } finally {
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.disabled = false;
            saveProfileBtn.innerHTML = 'Save Changes';
        }
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
        const leaveAllTripsBtn = document.getElementById('leave-all-trips-btn');
        if (leaveAllTripsBtn) {
            leaveAllTripsBtn.disabled = true;
            leaveAllTripsBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Leaving...';
        }
        
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
        const leaveAllTripsBtn = document.getElementById('leave-all-trips-btn');
        if (leaveAllTripsBtn) {
            leaveAllTripsBtn.disabled = false;
            leaveAllTripsBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Leave All Trips';
        }
    }
}

function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    const editStartDate = document.getElementById('edit-start-date');
    const editEndDate = document.getElementById('edit-end-date');
    
    if (startDate) startDate.min = today;
    if (endDate) endDate.min = today;
    if (editStartDate) editStartDate.min = today;
    if (editEndDate) editEndDate.min = today;
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loadUserData();
            await loadCustomCategories();
            loadUserTrips();
        } else {
            navigateTo('auth.html');
        }
    });
}

function loadUserData() {
    if (!currentUser) return;
    
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userName) userName.textContent = currentUser.displayName || 'Traveler';
    if (userAvatar) userAvatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Traveler')}&background=4361ee&color=fff`;
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
        
    } catch (error) {
        console.error('Error loading trips:', error);
        showError('Failed to load trips. Please refresh the page.');
    } finally {
        showLoadingState(false);
    }
}

async function loadRecentCalculations() {
    const recentCalculationsList = document.getElementById('recent-calculations-list');
    if (!recentCalculationsList) return;
    
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
    if (!upcomingTripsList) return;
    
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
        
        const createTripBtn = document.getElementById('create-trip-from-upcoming');
        if (createTripBtn) {
            createTripBtn.addEventListener('click', showCreateTripModal);
        }
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
    const totalTripsCount = document.getElementById('total-trips-count');
    const activeTripsCount = document.getElementById('active-trips-count');
    const totalSpentAmount = document.getElementById('total-spent-amount');
    const carExpensesAmount = document.getElementById('car-expenses-amount');
    
    if (!totalTripsCount || !activeTripsCount || !totalSpentAmount || !carExpensesAmount) return;
    
    const totalTrips = userTrips.length;
    const today = new Date();
    
    // Count active trips (trips that are currently ongoing)
    const activeTrips = userTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        return startDate <= today && endDate >= today;
    }).length;
    
    // Calculate total spent across all trips
    const totalSpent = userTrips.reduce((total, trip) => {
        const tripExpenses = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
        return total + tripExpenses;
    }, 0);
    
    // Calculate car-related expenses
    const carExpenses = userTrips.reduce((total, trip) => {
        if (!trip.expenses) return total;
        
        const tripCarExpenses = trip.expenses.filter(expense => 
            expense.category === 'fuel' || 
            expense.description.toLowerCase().includes('car') ||
            expense.description.toLowerCase().includes('fuel') ||
            expense.description.toLowerCase().includes('rental') ||
            expense.description.toLowerCase().includes('maintenance') ||
            expense.description.toLowerCase().includes('toll') ||
            expense.description.toLowerCase().includes('parking')
        ).reduce((sum, expense) => sum + expense.amount, 0);
        
        return total + tripCarExpenses;
    }, 0);
    
    // Update DOM elements
    totalTripsCount.textContent = totalTrips;
    activeTripsCount.textContent = activeTrips;
    totalSpentAmount.textContent = totalSpent.toFixed(2);
    carExpensesAmount.textContent = carExpenses.toFixed(2);
    
    // Update car expense chart
    updateCarExpenseChart(userTrips);
}

// Update car expense chart
function updateCarExpenseChart(trips) {
    const ctx = document.getElementById('carExpenseChart');
    if (!ctx) return;
    
    const ctx2d = ctx.getContext('2d');
    if (!ctx2d) return;
    
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
    });
    
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
    
    const carExpenseDetails = document.getElementById('car-expense-details');
    if (carExpenseDetails) {
        if (data.length === 0) {
            carExpenseDetails.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-car fa-3x mb-3"></i>
                    <p>No car expenses recorded yet</p>
                    <a href="car-calculations.html" class="btn btn-primary btn-sm">
                        <i class="fas fa-calculator me-1"></i>Calculate Car Expenses
                    </a>
                </div>
            `;
            return;
        }
    }
    
    // Create chart
    carExpenseChart = new Chart(ctx2d, {
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
    
    // Update expense details
    const totalCarExpenses = data.reduce((sum, value) => sum + value, 0);
    if (carExpenseDetails) {
        carExpenseDetails.innerHTML = `
            <div class="text-center">
                <h4 class="text-primary"><span class="rupee-symbol">₹</span>${totalCarExpenses.toFixed(2)}</h4>
                <p class="text-muted mb-3">Total Car Expenses</p>
                ${labels.map((label, index) => `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="small">${label}:</span>
                        <span class="fw-bold"><span class="rupee-symbol">₹</span>${data[index].toFixed(2)}</span>
                    </div>
                `).join('')}
                <a href="car-calculations.html" class="btn btn-primary btn-sm mt-3">
                    <i class="fas fa-calculator me-1"></i>New Calculation
                </a>
            </div>
        `;
    }
}

function showLoadingState(show) {
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    if (show) {
        if (tripsContainer) {
            tripsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading your trips...</p>
                </div>
            `;
        }
        if (emptyTrips) emptyTrips.classList.add('d-none');
    }
}

function showError(message) {
    const tripsContainer = document.getElementById('trips-container');
    if (!tripsContainer) return;
    
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
    
    if (!tripsContainer || !emptyTrips) return;
    
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
            <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="card-title mb-1">${trip.name}</h5>
                        <div class="d-flex align-items-center">
                            <small class="text-light-opacity trip-code">${trip.code}</small>
                            ${isCreator ? '<span class="badge bg-warning text-dark ms-2">Owner</span>' : ''}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
            </div>
            <div class="card-body">
                <div class="route-info mb-3">
                    <div class="d-flex align-items-center text-muted small mb-2">
                        <i class="fas fa-map-marker-alt text-danger me-1"></i>
                        <span>${trip.startLocation}</span>
                        <i class="fas fa-arrow-right mx-2 text-muted"></i>
                        <i class="fas fa-map-marker-alt text-success me-1"></i>
                        <span>${trip.destination}</span>
                    </div>
                    ${trip.intermediateStops && trip.intermediateStops.length > 0 ? `
                        <div class="mt-1">
                            <small class="text-muted">
                                <i class="fas fa-dot-circle text-warning me-1"></i>
                                ${trip.intermediateStops.length} stop${trip.intermediateStops.length > 1 ? 's' : ''}
                            </small>
                        </div>
                    ` : ''}
                </div>
                
                <div class="trip-dates mb-3">
                    <div class="d-flex justify-content-between text-muted small">
                        <span><i class="fas fa-calendar me-1"></i>${startDate.toLocaleDateString()}</span>
                        <span><i class="fas fa-arrow-right mx-1 text-muted"></i></span>
                        <span><i class="fas fa-calendar me-1"></i>${endDate.toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div class="budget-progress mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted">Budget Progress</small>
                        <small class="text-muted"><span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)} / <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</small>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progressPercent}%;" 
                             aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-1">
                        <small class="${remaining >= 0 ? 'text-success' : 'text-danger'}">
                            ${remaining >= 0 ? 'Remaining: ' : 'Overspent: '}
                            <span class="rupee-symbol">₹</span>${Math.abs(remaining).toFixed(2)}
                        </small>
                        <small class="text-muted">${progressPercent.toFixed(1)}%</small>
                    </div>
                </div>
                
                ${carExpenses > 0 ? `
                <div class="car-expenses mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-car me-1"></i>Car Expenses
                        </small>
                        <small class="fw-bold text-primary">
                            <span class="rupee-symbol">₹</span>${carExpenses.toFixed(2)}
                        </small>
                    </div>
                </div>
                ` : ''}
                
                ${trip.route ? `
                    <div class="route-info mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-route me-1"></i>Distance
                            </small>
                            <small class="fw-bold">
                                ${trip.route.totalDistance || trip.route.distance || 'N/A'}
                            </small>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="card-footer bg-transparent">
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm flex-fill view-trip-btn">
                        <i class="fas fa-eye me-1"></i>View
                    </button>
                    ${isCreator ? `
                        <button class="btn btn-outline-secondary btn-sm edit-trip-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm delete-trip-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-outline-danger btn-sm leave-trip-btn">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewBtn = col.querySelector('.view-trip-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => viewTrip(trip.id));
    }
    
    if (isCreator) {
        const editBtn = col.querySelector('.edit-trip-btn');
        const deleteBtn = col.querySelector('.delete-trip-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', () => showEditTripModal(trip));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => showDeleteConfirmation(trip));
        }
    } else {
        const leaveBtn = col.querySelector('.leave-trip-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => leaveTrip(trip.id));
        }
    }
    
    return col;
}

function showCreateTripModal() {
    const createTripForm = document.getElementById('create-trip-form');
    const distanceResults = document.getElementById('distance-results');
    const calculateDistance = document.getElementById('calculate-distance');
    const intermediateStopsContainer = document.getElementById('intermediate-stops-container');
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    
    if (createTripForm) createTripForm.reset();
    if (distanceResults) distanceResults.classList.add('d-none');
    if (calculateDistance) calculateDistance.checked = false;
    if (intermediateStopsContainer) intermediateStopsContainer.innerHTML = '';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (startDate) startDate.value = today.toISOString().split('T')[0];
    if (endDate) endDate.value = tomorrow.toISOString().split('T')[0];
    
    const createTripModal = document.getElementById('createTripModal');
    if (createTripModal) {
        const modal = new bootstrap.Modal(createTripModal);
        modal.show();
    }
}

function showEditTripModal(trip) {
    const editTripId = document.getElementById('edit-trip-id');
    const editTripName = document.getElementById('edit-trip-name');
    const editStartLocation = document.getElementById('edit-start-location');
    const editTripDestination = document.getElementById('edit-trip-destination');
    const editStartDate = document.getElementById('edit-start-date');
    const editEndDate = document.getElementById('edit-end-date');
    const editTripBudget = document.getElementById('edit-trip-budget');
    const editDistanceResults = document.getElementById('edit-distance-results');
    const editCalculateDistance = document.getElementById('edit-calculate-distance');
    
    // Only set values if elements exist
    if (editTripId) editTripId.value = trip.id;
    if (editTripName) editTripName.value = trip.name || '';
    if (editStartLocation) editStartLocation.value = trip.startLocation || '';
    if (editTripDestination) editTripDestination.value = trip.destination || '';
    if (editStartDate) editStartDate.value = trip.startDate || '';
    if (editEndDate) editEndDate.value = trip.endDate || '';
    if (editTripBudget) editTripBudget.value = trip.budget || '';
    
    // Populate intermediate stops
    populateEditStops(trip);
    
    if (editDistanceResults) editDistanceResults.classList.add('d-none');
    if (editCalculateDistance) editCalculateDistance.checked = false;
    
    // If route already exists, show it
    if (trip.route && editDistanceResults) {
        editDistanceResults.classList.remove('d-none');
        const editDistanceDetails = document.getElementById('edit-distance-details');
        if (editDistanceDetails) {
            editDistanceDetails.innerHTML = `
                <p><strong>Current Distance:</strong> ${trip.route.totalDistance || trip.route.distance || 'N/A'}</p>
                <p><strong>Current Travel Time:</strong> ${trip.route.totalDuration || trip.route.duration || 'N/A'}</p>
                ${trip.route.segments ? `
                    <div class="mt-2">
                        <small><strong>Route with ${trip.route.segments.length} segments</strong></small>
                    </div>
                ` : ''}
                <div class="alert alert-info mt-2">
                    <small><i class="fas fa-info-circle me-1"></i>Check the box above to recalculate with updated locations</small>
                </div>
            `;
        }
    }
    
    const editTripModal = document.getElementById('editTripModal');
    if (editTripModal) {
        const modal = new bootstrap.Modal(editTripModal);
        modal.show();
    }
}

function showDeleteConfirmation(trip) {
    const deleteTripName = document.getElementById('delete-trip-name');
    const deleteTripId = document.getElementById('delete-trip-id');
    
    if (deleteTripName) deleteTripName.textContent = trip.name;
    if (deleteTripId) deleteTripId.value = trip.id;
    
    const deleteTripModal = document.getElementById('deleteTripModal');
    if (deleteTripModal) {
        const modal = new bootstrap.Modal(deleteTripModal);
        modal.show();
    }
}

function showJoinTripModal() {
    const joinTripForm = document.getElementById('join-trip-form');
    if (joinTripForm) joinTripForm.reset();
    
    const joinTripModal = document.getElementById('joinTripModal');
    if (joinTripModal) {
        const modal = new bootstrap.Modal(joinTripModal);
        modal.show();
    }
}

// Update the saveTrip function to handle multiple stops:
async function saveTrip() {
    const name = document.getElementById('trip-name');
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    const budget = document.getElementById('trip-budget');
    const calculateDistance = document.getElementById('calculate-distance');
    
    if (!name || !startDate || !endDate || !budget || !calculateDistance) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Get stops data
    const stopsData = getStopsFromCreateForm();
    
    if (!name.value || !validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination) || !startDate.value || !endDate.value || !budget.value) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    const budgetValue = parseFloat(budget.value);
    if (isNaN(budgetValue) || budgetValue <= 0) {
        showAlert('Budget must be a number greater than 0', 'warning');
        return;
    }
    
    if (!validateDates(startDate.value, endDate.value)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    const code = generateTripCode();
    
    // Create trip data with multiple stops
    const tripData = {
        name: name.value.trim(),
        startLocation: stopsData.startLocation.trim(),
        destination: stopsData.destination.trim(),
        intermediateStops: stopsData.intermediateStops,
        startDate: startDate.value,
        endDate: endDate.value,
        budget: budgetValue,
        code,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        expenses: [],
        itinerary: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistance.checked) {
        try {
            const saveTripBtn = document.getElementById('save-trip-btn');
            if (saveTripBtn) {
                saveTripBtn.disabled = true;
                saveTripBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            }
            
            const allStops = [stopsData.startLocation, ...stopsData.intermediateStops, stopsData.destination];
            const routeSegments = [];
            let totalDistance = 0;
            let totalDuration = 0;
            
            // Calculate distance for each segment
            for (let i = 0; i < allStops.length - 1; i++) {
                const from = allStops[i];
                const to = allStops[i + 1];
                
                try {
                    const segmentData = await calculateRealDistance(from, to);
                    routeSegments.push({
                        from,
                        to,
                        distance: segmentData.distance,
                        duration: segmentData.duration,
                        durationMinutes: parseDurationToMinutes(segmentData.duration)
                    });
                    
                    totalDistance += parseFloat(segmentData.distance);
                    totalDuration += segmentData.durationMinutes || parseDurationToMinutes(segmentData.duration);
                    
                } catch (error) {
                    console.error(`Error calculating segment ${i + 1}:`, error);
                    routeSegments.push({
                        from,
                        to,
                        distance: 'Unknown',
                        duration: 'Unknown',
                        error: true
                    });
                }
            }
            
            tripData.route = {
                segments: routeSegments,
                totalDistance: `${totalDistance.toFixed(1)} km`,
                totalDuration: formatMinutesToDuration(totalDuration),
                totalDurationMinutes: totalDuration,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
        } catch (error) {
            console.error('Error calculating route during trip creation:', error);
            showAlert('Trip created but route calculation failed. You can calculate it later.', 'warning');
        }
    }
    
    try {
        const saveTripBtn = document.getElementById('save-trip-btn');
        if (saveTripBtn) {
            saveTripBtn.disabled = true;
            saveTripBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        }
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        // Add the new trip to the local array
        const newTrip = {
            ...tripData,
            createdAt: new Date()
        };
        userTrips.unshift(newTrip);
        displayTrips();
        
        const createTripModal = document.getElementById('createTripModal');
        if (createTripModal) {
            const modal = bootstrap.Modal.getInstance(createTripModal);
            if (modal) modal.hide();
        }
        
        const shareTripCode = document.getElementById('share-trip-code');
        if (shareTripCode) shareTripCode.textContent = code;
        
        const shareTripModal = document.getElementById('shareTripModal');
        if (shareTripModal) {
            const modal = new bootstrap.Modal(shareTripModal);
            modal.show();
        }
        
    } catch (error) {
        console.error('Error creating trip:', error);
        showAlert('Error creating trip. Please try again.', 'danger');
    } finally {
        const saveTripBtn = document.getElementById('save-trip-btn');
        if (saveTripBtn) {
            saveTripBtn.disabled = false;
            saveTripBtn.innerHTML = 'Create Trip';
        }
    }
}

async function updateTrip() {
    const tripId = document.getElementById('edit-trip-id');
    const name = document.getElementById('edit-trip-name');
    const startDate = document.getElementById('edit-start-date');
    const endDate = document.getElementById('edit-end-date');
    const budget = document.getElementById('edit-trip-budget');
    const calculateDistance = document.getElementById('edit-calculate-distance');
    
    if (!tripId || !name || !startDate || !endDate || !budget || !calculateDistance) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Get stops data
    const stopsData = getStopsFromEditForm();
    
    if (!name.value || !validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination) || !startDate.value || !endDate.value || !budget.value) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    const budgetValue = parseFloat(budget.value);
    if (isNaN(budgetValue) || budgetValue <= 0) {
        showAlert('Budget must be a number greater than 0', 'warning');
        return;
    }
    
    if (!validateDates(startDate.value, endDate.value)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    const updateData = {
        name: name.value.trim(),
        startLocation: stopsData.startLocation.trim(),
        destination: stopsData.destination.trim(),
        intermediateStops: stopsData.intermediateStops,
        startDate: startDate.value,
        endDate: endDate.value,
        budget: budgetValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistance.checked) {
        try {
            const updateTripBtn = document.getElementById('update-trip-btn');
            if (updateTripBtn) {
                updateTripBtn.disabled = true;
                updateTripBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            }
            
            const allStops = [stopsData.startLocation, ...stopsData.intermediateStops, stopsData.destination];
            const routeSegments = [];
            let totalDistance = 0;
            let totalDuration = 0;
            
            // Calculate distance for each segment
            for (let i = 0; i < allStops.length - 1; i++) {
                const from = allStops[i];
                const to = allStops[i + 1];
                
                try {
                    const segmentData = await calculateRealDistance(from, to);
                    routeSegments.push({
                        from,
                        to,
                        distance: segmentData.distance,
                        duration: segmentData.duration,
                        durationMinutes: parseDurationToMinutes(segmentData.duration)
                    });
                    
                    totalDistance += parseFloat(segmentData.distance);
                    totalDuration += segmentData.durationMinutes || parseDurationToMinutes(segmentData.duration);
                    
                } catch (error) {
                    console.error(`Error calculating segment ${i + 1}:`, error);
                    routeSegments.push({
                        from,
                        to,
                        distance: 'Unknown',
                        duration: 'Unknown',
                        error: true
                    });
                }
            }
            
            updateData.route = {
                segments: routeSegments,
                totalDistance: `${totalDistance.toFixed(1)} km`,
                totalDuration: formatMinutesToDuration(totalDuration),
                totalDurationMinutes: totalDuration,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
        } catch (error) {
            console.error('Error calculating route during trip update:', error);
            showAlert('Trip updated but route calculation failed. You can calculate it later.', 'warning');
        }
    }
    
    try {
        const updateTripBtn = document.getElementById('update-trip-btn');
        if (updateTripBtn) {
            updateTripBtn.disabled = true;
            updateTripBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        }
        
        await db.collection('trips').doc(tripId.value).update(updateData);
        
        // Update the local trip data
        const tripIndex = userTrips.findIndex(trip => trip.id === tripId.value);
        if (tripIndex !== -1) {
            userTrips[tripIndex] = {
                ...userTrips[tripIndex],
                ...updateData
            };
            displayTrips();
        }
        
        const editTripModal = document.getElementById('editTripModal');
        if (editTripModal) {
            const modal = bootstrap.Modal.getInstance(editTripModal);
            if (modal) modal.hide();
        }
        
        showAlert('Trip updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating trip:', error);
        showAlert('Error updating trip. Please try again.', 'danger');
    } finally {
        const updateTripBtn = document.getElementById('update-trip-btn');
        if (updateTripBtn) {
            updateTripBtn.disabled = false;
            updateTripBtn.innerHTML = 'Update Trip';
        }
    }
}

async function deleteTrip() {
    const tripId = document.getElementById('delete-trip-id');
    if (!tripId) return;
    
    try {
        const confirmDeleteTripBtn = document.getElementById('confirm-delete-trip-btn');
        if (confirmDeleteTripBtn) {
            confirmDeleteTripBtn.disabled = true;
            confirmDeleteTripBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Deleting...';
        }
        
        await db.collection('trips').doc(tripId.value).delete();
        
        // Remove from local array
        userTrips = userTrips.filter(trip => trip.id !== tripId.value);
        displayTrips();
        
        const deleteTripModal = document.getElementById('deleteTripModal');
        if (deleteTripModal) {
            const modal = bootstrap.Modal.getInstance(deleteTripModal);
            if (modal) modal.hide();
        }
        
        showAlert('Trip deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting trip:', error);
        showAlert('Error deleting trip. Please try again.', 'danger');
    } finally {
        const confirmDeleteTripBtn = document.getElementById('confirm-delete-trip-btn');
        if (confirmDeleteTripBtn) {
            confirmDeleteTripBtn.disabled = false;
            confirmDeleteTripBtn.innerHTML = 'Delete Trip';
        }
    }
}

async function joinTripWithCode() {
    const tripCode = document.getElementById('trip-code');
    if (!tripCode) return;
    
    const code = tripCode.value.trim().toUpperCase();
    
    if (!code) {
        showAlert('Please enter a trip code', 'warning');
        return;
    }
    
    try {
        const joinTripCodeBtn = document.getElementById('join-trip-code-btn');
        if (joinTripCodeBtn) {
            joinTripCodeBtn.disabled = true;
            joinTripCodeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Joining...';
        }
        
        // Find trip by code
        const tripsSnapshot = await db.collection('trips')
            .where('code', '==', code)
            .get();
        
        if (tripsSnapshot.empty) {
            showAlert('Invalid trip code. Please check and try again.', 'warning');
            return;
        }
        
        const tripDoc = tripsSnapshot.docs[0];
        const tripData = tripDoc.data();
        
        // Check if user is already a member
        if (tripData.members.includes(currentUser.uid)) {
            showAlert('You are already a member of this trip', 'info');
            return;
        }
        
        // Add user to trip members
        await db.collection('trips').doc(tripDoc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reload trips
        await loadUserTrips();
        
        const joinTripModal = document.getElementById('joinTripModal');
        if (joinTripModal) {
            const modal = bootstrap.Modal.getInstance(joinTripModal);
            if (modal) modal.hide();
        }
        
        showAlert(`Successfully joined trip: ${tripData.name}`, 'success');
        
    } catch (error) {
        console.error('Error joining trip:', error);
        showAlert('Error joining trip. Please try again.', 'danger');
    } finally {
        const joinTripCodeBtn = document.getElementById('join-trip-code-btn');
        if (joinTripCodeBtn) {
            joinTripCodeBtn.disabled = false;
            joinTripCodeBtn.innerHTML = 'Join Trip';
        }
    }
}

async function leaveTrip(tripId) {
    const trip = userTrips.find(t => t.id === tripId);
    
    if (!trip) return;
    
    if (!confirm(`Are you sure you want to leave the trip "${trip.name}"?`)) {
        return;
    }
    
    try {
        // Remove user from trip members
        await db.collection('trips').doc(tripId).update({
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Remove from local array
        userTrips = userTrips.filter(t => t.id !== tripId);
        displayTrips();
        
        showAlert(`Successfully left trip: ${trip.name}`, 'success');
        
    } catch (error) {
        console.error('Error leaving trip:', error);
        showAlert('Error leaving trip. Please try again.', 'danger');
    }
}

function viewTrip(tripId) {
    // Store the trip ID in localStorage and navigate to trip details page
    localStorage.setItem('currentTripId', tripId);
    navigateTo('trip-details.html');
}

function copyTripCode() {
    const shareTripCode = document.getElementById('share-trip-code');
    if (!shareTripCode) return;
    
    const code = shareTripCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        const copyBtn = document.getElementById('copy-code-btn');
        if (copyBtn) {
            const originalHtml = copyBtn.innerHTML;
            
            copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
            copyBtn.classList.remove('btn-outline-primary');
            copyBtn.classList.add('btn-success');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
                copyBtn.classList.remove('btn-success');
                copyBtn.classList.add('btn-outline-primary');
            }, 2000);
        }
    });
}

function generateTripCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function validateDates(startDate, endDate) {
    return new Date(endDate) > new Date(startDate);
}

function validateLocation(location) {
    return location && location.trim().length > 0;
}

function showAlert(message, type) {
    // Create alerts container if it doesn't exist
    let alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) {
        alertsContainer = document.createElement('div');
        alertsContainer.id = 'alerts-container';
        alertsContainer.className = 'position-fixed top-0 end-0 p-3';
        alertsContainer.style.zIndex = '9999';
        document.body.appendChild(alertsContainer);
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertsContainer.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function navigateTo(page) {
    window.location.href = page;
}

function handleLogout() {
    auth.signOut().then(() => {
        navigateTo('auth.html');
    }).catch((error) => {
        console.error('Error signing out:', error);
        showAlert('Error signing out. Please try again.', 'danger');
    });
}

// Utility functions for distance calculation
function parseDurationToMinutes(duration) {
    if (!duration) return 0;
    
    if (typeof duration === 'number') {
        return duration;
    }
    
    // Handle "X hours Y mins" format
    const hoursMatch = duration.match(/(\d+)\s*hours?/);
    const minsMatch = duration.match(/(\d+)\s*mins?/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    
    return hours * 60 + mins;
}

function formatMinutesToDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
        return `${mins} mins`;
    } else if (mins === 0) {
        return `${hours} hours`;
    } else {
        return `${hours} hours ${mins} mins`;
    }
}

// Add favicon to prevent 404 error
function addFavicon() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚗</text></svg>';
    document.head.appendChild(link);
}

// Add rupee symbol support
document.addEventListener('DOMContentLoaded', function() {
    // Add favicon
    addFavicon();
    
    // Add rupee symbol to elements with rupee-symbol class
    document.querySelectorAll('.rupee-symbol').forEach(element => {
        element.innerHTML = '₹';
    });
});
