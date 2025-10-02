let currentUser = null;
let userTrips = [];

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
    
    // Distance calculation
    document.getElementById('calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateDistance();
        } else {
            document.getElementById('distance-results').classList.add('d-none');
        }
    });
    
    document.getElementById('edit-calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateEditDistance();
        } else {
            document.getElementById('edit-distance-results').classList.add('d-none');
        }
    });
    
    // Profile operations
    setupProfileEventListeners();
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
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData();
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
        
    } catch (error) {
        console.error('Error loading trips:', error);
        showError('Failed to load trips. Please refresh the page.');
    } finally {
        showLoadingState(false);
    }
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
    col.className = 'col-md-6 col-lg-4';
    
    const startDate = new Date(trip.startDate).toLocaleDateString();
    const endDate = new Date(trip.endDate).toLocaleDateString();
    
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    const remaining = trip.budget - totalSpent;
    
    let progressBarClass = 'bg-success';
    if (remaining < 0) progressBarClass = 'bg-danger';
    else if (remaining < trip.budget * 0.2) progressBarClass = 'bg-warning';
    
    // Fix for createdAt date handling
    let createdDate = 'Recently';
    if (trip.createdAt) {
        if (typeof trip.createdAt.toDate === 'function') {
            createdDate = trip.createdAt.toDate().toLocaleDateString();
        } else if (trip.createdAt instanceof Date) {
            createdDate = trip.createdAt.toLocaleDateString();
        } else if (trip.createdAt.seconds) {
            createdDate = new Date(trip.createdAt.seconds * 1000).toLocaleDateString();
        } else {
            createdDate = new Date(trip.createdAt).toLocaleDateString();
        }
    }
    
    const isCreator = trip.createdBy === currentUser.uid;
    
    col.innerHTML = `
        <div class="card trip-card" data-trip-id="${trip.id}">
            <div class="trip-card-header">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="card-title mb-1">${trip.name}</h5>
                        <p class="card-text mb-0">${startDate} - ${endDate}</p>
                    </div>
                    ${isCreator ? `
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
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
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Budget: <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</span>
                    <span>Spent: <span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</span>
                </div>
                <div class="progress mb-3" style="height: 10px;">
                    <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progressPercent}%"></div>
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
                <div class="mt-2">
                    <small class="text-muted">Created: ${createdDate}</small>
                    ${isCreator ? '<span class="badge bg-primary ms-2"><i class="fas fa-crown me-1"></i>Creator</span>' : ''}
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
    const transportType = document.getElementById('transport-type').value;
    const fuelType = document.getElementById('fuel-type').value;
    const vehicleMileage = parseFloat(document.getElementById('vehicle-mileage').value) || 0;
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    const stops = getStops();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value);
    const drivingCharges = parseFloat(document.getElementById('driving-charges').value) || 0;
    const calculateDistance = document.getElementById('calculate-distance').checked;
    
    // Validation
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || 
        !startDate || !endDate || !budget) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    const code = generateTripCode();
    
    const tripData = {
        name: name.trim(),
        transportType: transportType,
        startLocation: startLocation.trim(),
        destination: destination.trim(),
        stops: stops,
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
    
    // Add vehicle details if applicable
    if (transportType === 'self-driving' || transportType === 'rental-car') {
        tripData.vehicleDetails = {
            fuelType: fuelType,
            mileage: vehicleMileage,
            drivingCharges: drivingCharges
        };
    }
    
    // Calculate route with stops if requested
    if (calculateDistance) {
        try {
            document.getElementById('save-trip-btn').disabled = true;
            document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            
            const allLocations = [startLocation, ...stops, destination];
            const routeData = await calculateRouteWithStops(allLocations);
            tripData.route = {
                ...routeData,
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
        
        userTrips.unshift({
            ...tripData,
            createdAt: new Date()
        });
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

async function calculateRouteWithStops(locations) {
    if (locations.length < 2) {
        throw new Error('At least two locations required');
    }
    
    try {
        let totalDistance = 0;
        let totalDuration = 0;
        const segments = [];
        
        // Calculate route for each segment
        for (let i = 0; i < locations.length - 1; i++) {
            const segment = await calculateRealDistance(locations[i], locations[i + 1]);
            
            // Extract numeric distance (remove " km")
            const distanceKm = parseFloat(segment.distance);
            totalDistance += distanceKm;
            
            // Extract duration in minutes
            const durationMinutes = parseDurationToMinutes(segment.duration);
            totalDuration += durationMinutes;
            
            segments.push({
                from: locations[i],
                to: locations[i + 1],
                distance: segment.distance,
                duration: segment.duration,
                distanceKm: distanceKm,
                durationMinutes: durationMinutes
            });
        }
        
        return {
            distance: `${totalDistance.toFixed(1)} km`,
            duration: formatMinutesToDuration(totalDuration),
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            segments: segments,
            stops: locations.slice(1, -1) // All locations except start and end
        };
        
    } catch (error) {
        console.error('Error calculating route with stops:', error);
        throw error;
    }
}

// Fuel cost calculation
function calculateFuelCost(distanceKm, fuelType, mileage, currentFuelPrice) {
    if (!mileage || mileage <= 0) return 0;
    
    const fuelConsumed = distanceKm / mileage;
    let fuelPricePerLiter = currentFuelPrice || getDefaultFuelPrice(fuelType);
    
    return fuelConsumed * fuelPricePerLiter;
}

function getDefaultFuelPrice(fuelType) {
    const defaultPrices = {
        'petrol': 100,
        'diesel': 90,
        'cng': 70,
        'electric': 8 // per kWh
    };
    return defaultPrices[fuelType] || 0;
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    setupEnhancedTripFeatures();
});

// Enhanced trip creation with new features
function setupEnhancedTripFeatures() {
    // Transport type change handler
    document.getElementById('transport-type').addEventListener('change', function() {
        const isCarType = this.value === 'self-driving' || this.value === 'rental-car';
        document.getElementById('vehicle-details').classList.toggle('d-none', !isCarType);
        document.getElementById('self-driving-charges').classList.toggle('d-none', this.value !== 'self-driving');
    });
    
    // Add stop functionality
    document.getElementById('add-stop-btn').addEventListener('click', addStopField);
}

function addStopField() {
    const stopsContainer = document.getElementById('stops-container');
    const stopIndex = stopsContainer.children.length;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'stop-item input-group mb-2';
    stopDiv.innerHTML = `
        <input type="text" class="form-control stop-location" placeholder="Stop location" data-stop-index="${stopIndex}">
        <button type="button" class="btn btn-outline-danger remove-stop-btn" data-stop-index="${stopIndex}">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Add remove event listener
    stopDiv.querySelector('.remove-stop-btn').addEventListener('click', function() {
        this.parentElement.remove();
        reindexStops();
    });
}

function reindexStops() {
    const stops = document.querySelectorAll('.stop-item');
    stops.forEach((stop, index) => {
        const input = stop.querySelector('.stop-location');
        const btn = stop.querySelector('.remove-stop-btn');
        input.dataset.stopIndex = index;
        btn.dataset.stopIndex = index;
    });
}

function getStops() {
    const stops = [];
    document.querySelectorAll('.stop-location').forEach(input => {
        if (input.value.trim()) {
            stops.push(input.value.trim());
        }
    });
    return stops;
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
                    ...routeData,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } catch (error) {
                console.error('Error recalculating route:', error);
                // Continue without route data if calculation fails
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
        await auth.signOut();
        navigateTo('auth.html');
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Error during logout. Please try again.', 'danger');
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
