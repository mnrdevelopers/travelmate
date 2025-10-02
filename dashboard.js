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
    // Trip management
    document.getElementById('create-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('create-first-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('join-trip-btn').addEventListener('click', showJoinTripModal);
    document.getElementById('save-trip-btn').addEventListener('click', saveTrip);
    document.getElementById('update-trip-btn').addEventListener('click', updateTrip);
    document.getElementById('confirm-delete-trip-btn').addEventListener('click', deleteTrip);
    document.getElementById('join-trip-code-btn').addEventListener('click', joinTripWithCode);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('copy-code-btn').addEventListener('click', copyTripCode);
    document.getElementById('nav-profile').addEventListener('click', showProfileModal);
    
    // Distance calculation - updated for multiple stops
    document.getElementById('calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateDistanceWithStops(); // Changed from calculateDistance
        } else {
            document.getElementById('distance-results').classList.add('d-none');
        }
    });
    
    document.getElementById('edit-calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateEditDistanceWithStops(); // Changed from calculateEditDistance
        } else {
            document.getElementById('edit-distance-results').classList.add('d-none');
        }
    });
    
    // Profile operations
    setupProfileEventListeners();
    
    // Setup multiple stops functionality
    setupMultipleStops();
}

// Multiple stops functionality
function setupMultipleStops() {
    // Add stop button for create modal
    document.getElementById('add-stop-btn').addEventListener('click', addIntermediateStop);
    
    // Add stop button for edit modal
    document.getElementById('edit-add-stop-btn').addEventListener('click', addEditIntermediateStop);
}

function addIntermediateStop() {
    const container = document.getElementById('intermediate-stops-container');
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
        input.placeholder = `Stop ${index + 1} (City, Country)`;
    });
}

function renumberEditStops() {
    const stops = document.querySelectorAll('.edit-intermediate-stop');
    stops.forEach((stop, index) => {
        const input = stop.querySelector('.edit-intermediate-location');
        input.placeholder = `Stop ${index + 1} (City, Country)`;
    });
}

function getStopsFromCreateForm() {
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    
    const intermediateInputs = document.querySelectorAll('.intermediate-location');
    const intermediateStops = Array.from(intermediateInputs)
        .map(input => input.value.trim())
        .filter(stop => stop.length > 0);
    
    return {
        startLocation,
        intermediateStops,
        destination
    };
}

function getStopsFromEditForm() {
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    
    const intermediateInputs = document.querySelectorAll('.edit-intermediate-location');
    const intermediateStops = Array.from(intermediateInputs)
        .map(input => input.value.trim())
        .filter(stop => stop.length > 0);
    
    return {
        startLocation,
        intermediateStops,
        destination
    };
}

function populateEditStops(trip) {
    const container = document.getElementById('edit-intermediate-stops-container');
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
        document.getElementById('distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating route with ${stopsData.intermediateStops.length + 1} segments...
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        
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
        document.getElementById('distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error calculating route. Please try again.
            </div>
        `;
    }
}

async function calculateEditDistanceWithStops() {
    const stopsData = getStopsFromEditForm();
    
    if (!validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination)) {
        showAlert('Please enter valid start and destination locations', 'warning');
        return;
    }
    
    try {
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating route with ${stopsData.intermediateStops.length + 1} segments...
            </div>
        `;
        document.getElementById('edit-distance-results').classList.remove('d-none');
        
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
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error calculating route. Please try again.
            </div>
        `;
    }
}

function displayDistanceResultsWithStops(segments, totalDistance, totalDuration) {
    const distanceDetails = document.getElementById('distance-details');
    
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
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loadUserData();
            await loadCustomCategories(); // Add this line
            loadUserTrips();
        } else {
            navigateTo('auth.html');
        }
    });
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
    
    if (data.length === 0) {
        document.getElementById('car-expense-details').innerHTML = `
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
    
    // Update expense details
    const totalCarExpenses = data.reduce((sum, value) => sum + value, 0);
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
                        <div class="d-flex align-items-center mb-2">
                            <small class="text-muted trip-code">${trip.code}</small>
                            ${isCreator ? '<span class="badge bg-primary ms-2">Owner</span>' : ''}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="route-info">
                    <div class="d-flex align-items-center text-muted small">
                        <i class="fas fa-map-marker-alt text-danger me-1"></i>
                        <span>${trip.startLocation}</span>
                        <i class="fas fa-arrow-right mx-2"></i>
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
            </div>
            
            <div class="card-body">
                <div class="trip-dates mb-3">
                    <div class="d-flex justify-content-between text-muted small">
                        <span><i class="fas fa-calendar me-1"></i>${startDate.toLocaleDateString()}</span>
                        <span><i class="fas fa-arrow-right mx-1"></i></span>
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
                    <button class="btn btn-primary btn-sm flex-fill view-trip-btn" data-trip-id="${trip.id}">
                        <i class="fas fa-eye me-1"></i>View
                    </button>
                    ${isCreator ? `
                        <button class="btn btn-outline-secondary btn-sm edit-trip-btn" data-trip-id="${trip.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm delete-trip-btn" data-trip-id="${trip.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-outline-danger btn-sm leave-trip-btn" data-trip-id="${trip.id}">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    col.querySelector('.view-trip-btn').addEventListener('click', () => viewTrip(trip.id));
    
    if (isCreator) {
        col.querySelector('.edit-trip-btn').addEventListener('click', () => showEditTripModal(trip));
        col.querySelector('.delete-trip-btn').addEventListener('click', () => showDeleteConfirmation(trip));
    } else {
        col.querySelector('.leave-trip-btn').addEventListener('click', () => leaveTrip(trip.id));
    }
    
    return col;
}

function showCreateTripModal() {
    document.getElementById('create-trip-form').reset();
    document.getElementById('distance-results').classList.add('d-none');
    document.getElementById('calculate-distance').checked = false;
    
    // Clear intermediate stops
    document.getElementById('intermediate-stops-container').innerHTML = '';
    
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
    
    // Populate route stops
    document.getElementById('edit-start-location').value = trip.startLocation;
    document.getElementById('edit-trip-destination').value = trip.destination;
    
    // Populate intermediate stops
    populateEditStops(trip);
    
    document.getElementById('edit-start-date').value = trip.startDate;
    document.getElementById('edit-end-date').value = trip.endDate;
    document.getElementById('edit-trip-budget').value = trip.budget;
    
    document.getElementById('edit-distance-results').classList.add('d-none');
    document.getElementById('edit-calculate-distance').checked = false;
    
    // If route already exists, show it
    if (trip.route) {
        document.getElementById('edit-distance-results').classList.remove('d-none');
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Current Distance:</strong> ${trip.route.totalDistance || trip.route.distance}</p>
            <p><strong>Current Travel Time:</strong> ${trip.route.totalDuration || trip.route.duration}</p>
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
    
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

function showDeleteConfirmation(trip) {
    document.getElementById('delete-trip-name').textContent = trip.name;
    document.getElementById('delete-trip-id').value = trip.id;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteTripModal'));
    modal.show();
}

function showJoinTripModal() {
    document.getElementById('join-trip-form').reset();
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

// Update the saveTrip function to handle multiple stops:
async function saveTrip() {
    const name = document.getElementById('trip-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value);
    const calculateDistance = document.getElementById('calculate-distance').checked;
    
    // Get stops data
    const stopsData = getStopsFromCreateForm();
    
    if (!name || !validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination) || !startDate || !endDate || !budget) {
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
    
    // Create trip data with multiple stops
    const tripData = {
        name: name.trim(),
        startLocation: stopsData.startLocation.trim(),
        destination: stopsData.destination.trim(),
        intermediateStops: stopsData.intermediateStops,
        startDate,
        endDate,
        budget,
        code,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        expenses: [],
        itinerary: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistance) {
        try {
            document.getElementById('save-trip-btn').disabled = true;
            document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            
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
        document.getElementById('save-trip-btn').disabled = true;
        document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        // Add the new trip to the local array
        const newTrip = {
            ...tripData,
            createdAt: new Date()
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
    } finally {
        document.getElementById('save-trip-btn').disabled = false;
        document.getElementById('save-trip-btn').innerHTML = 'Create Trip';
    }
}

async function updateTrip() {
    const tripId = document.getElementById('edit-trip-id').value;
    const name = document.getElementById('edit-trip-name').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = parseFloat(document.getElementById('edit-trip-budget').value);
    const calculateDistance = document.getElementById('edit-calculate-distance').checked;
    
    // Get stops data
    const stopsData = getStopsFromEditForm();
    
    if (!name || !validateLocation(stopsData.startLocation) || !validateLocation(stopsData.destination) || !startDate || !endDate || !budget) {
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
    
    const updateData = {
        name: name.trim(),
        startLocation: stopsData.startLocation.trim(),
        destination: stopsData.destination.trim(),
        intermediateStops: stopsData.intermediateStops,
        startDate,
        endDate,
        budget,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistance) {
        try {
            document.getElementById('update-trip-btn').disabled = true;
            document.getElementById('update-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            
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
        document.getElementById('update-trip-btn').disabled = true;
        document.getElementById('update-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        
        await db.collection('trips').doc(tripId).update(updateData);
        
        // Update the local trip data
        const tripIndex = userTrips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            userTrips[tripIndex] = {
                ...userTrips[tripIndex],
                ...updateData
            };
            displayTrips();
        }
        
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
        document.getElementById('confirm-delete-trip-btn').innerHTML = 'Delete Trip';
    }
}

async function joinTripWithCode() {
    const code = document.getElementById('trip-code').value.trim().toUpperCase();
    
    if (!code) {
        showAlert('Please enter a trip code', 'warning');
        return;
    }
    
    try {
        document.getElementById('join-trip-code-btn').disabled = true;
        document.getElementById('join-trip-code-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Joining...';
        
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
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('joinTripModal'));
        modal.hide();
        
        showAlert(`Successfully joined trip: ${tripData.name}`, 'success');
        
    } catch (error) {
        console.error('Error joining trip:', error);
        showAlert('Error joining trip. Please try again.', 'danger');
    } finally {
        document.getElementById('join-trip-code-btn').disabled = false;
        document.getElementById('join-trip-code-btn').innerHTML = 'Join Trip';
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
    const code = document.getElementById('share-trip-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const copyBtn = document.getElementById('copy-code-btn');
        const originalHtml = copyBtn.innerHTML;
        
        copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
        copyBtn.classList.remove('btn-outline-primary');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-primary');
        }, 2000);
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
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.getElementById('alerts-container');
    container.appendChild(alertDiv);
    
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

// Add rupee symbol support
document.addEventListener('DOMContentLoaded', function() {
    // Add rupee symbol to elements with rupee-symbol class
    document.querySelectorAll('.rupee-symbol').forEach(element => {
        element.innerHTML = '₹';
    });
});
