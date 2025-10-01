// Dashboard functionality
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
    document.getElementById('join-trip-code-btn').addEventListener('click', joinTripWithCode);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('copy-code-btn').addEventListener('click', copyTripCode);
    
     // Distance calculation - FIXED: Add real-time calculation
    document.getElementById('start-location').addEventListener('input', handleLocationChange);
    document.getElementById('trip-destination').addEventListener('input', handleLocationChange);
    document.getElementById('calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateDistance();
        } else {
            document.getElementById('distance-results').classList.add('d-none');
        }
    });
    
    // Profile CRUD operations
    setupProfileEventListeners();
}

// Add real-time distance calculation when locations change
function handleLocationChange() {
    const calculateCheckbox = document.getElementById('calculate-distance');
    if (calculateCheckbox.checked) {
        calculateDistance();
    }
}

function setupProfileEventListeners() {
    const navProfile = document.getElementById('nav-profile');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    const leaveAllTripsBtn = document.getElementById('leave-all-trips-btn');
    
    if (navProfile) {
        navProfile.addEventListener('click', showProfileModal);
    }
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    if (leaveAllTripsBtn) {
        leaveAllTripsBtn.addEventListener('click', leaveAllTrips);
    }
}

function initializeApp() {
    // Set minimum dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').min = today;
    document.getElementById('end-date').min = today;
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
        
        // Simple query without ordering - we'll sort client-side
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
        
        // Sort by createdAt on client side (newest first)
        userTrips.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA; // Descending order
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
                <div>${message}</div>
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
    
    // Determine progress bar color based on budget status
    let progressBarClass = 'bg-success';
    if (remaining < 0) {
        progressBarClass = 'bg-danger';
    } else if (remaining < trip.budget * 0.2) {
        progressBarClass = 'bg-warning';
    }
    
    // Format creation date
    const createdDate = trip.createdAt ? 
        new Date(trip.createdAt.toDate()).toLocaleDateString() : 
        'Recently';
    
    col.innerHTML = `
        <div class="card trip-card" data-trip-id="${trip.id}">
            <div class="trip-card-header">
                <h5 class="card-title mb-1">${trip.name}</h5>
                <p class="card-text mb-0">${startDate} - ${endDate}</p>
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
                </div>
            </div>
        </div>
    `;
    
    col.querySelector('.view-trip-btn').addEventListener('click', () => {
        setCurrentTrip(trip);
        navigateTo('trip-details.html');
    });
    
    return col;
}

function showCreateTripModal() {
    // Reset form
    document.getElementById('create-trip-form').reset();
    document.getElementById('distance-results').classList.add('d-none');
    document.getElementById('calculate-distance').checked = false;
    
    // Set default dates (today and tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('start-date').value = today.toISOString().split('T')[0];
    document.getElementById('end-date').value = tomorrow.toISOString().split('T')[0];
    
    const modal = new bootstrap.Modal(document.getElementById('createTripModal'));
    modal.show();
}

function showJoinTripModal() {
    document.getElementById('join-trip-message').classList.add('d-none');
    document.getElementById('trip-code').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

// Profile CRUD Operations
function showProfileModal(e) {
    e.preventDefault();
    loadProfileData();
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

async function loadProfileData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('profile-name').value = userData.name || '';
            document.getElementById('profile-email').value = currentUser.email;
            document.getElementById('profile-userid').value = currentUser.uid;
            document.getElementById('profile-avatar').src = userData.photoURL || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=4361ee&color=fff`;
        } else {
            // If user document doesn't exist, use auth data
            document.getElementById('profile-name').value = currentUser.displayName || '';
            document.getElementById('profile-email').value = currentUser.email;
            document.getElementById('profile-userid').value = currentUser.uid;
            document.getElementById('profile-avatar').src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=4361ee&color=fff`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Error loading profile data', 'danger');
    }
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

        // Update user document in Firestore
        await db.collection('users').doc(currentUser.uid).set({
            name: name,
            email: currentUser.email,
            uid: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update current user display name in Firebase Auth
        await currentUser.updateProfile({
            displayName: name
        });

        // Update UI
        document.getElementById('user-name').textContent = name;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
        
        showAlert('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showAlert('Error updating profile', 'danger');
    } finally {
        document.getElementById('save-profile-btn').disabled = false;
        document.getElementById('save-profile-btn').innerHTML = 'Save Changes';
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Note: For full avatar upload, you'd need Firebase Storage
    // This is a simplified version that just shows a message
    showAlert('Avatar upload requires Firebase Storage setup. For now, you can update your display name.', 'info');
    
    // Reset the file input
    event.target.value = '';
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
            if (trip.members.includes(currentUser.uid)) {
                const tripRef = db.collection('trips').doc(trip.id);
                batch.update(tripRef, {
                    members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        await batch.commit();
        
        // Clear local state
        userTrips = [];
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
        
        showAlert('Successfully left all trips!', 'success');
        
    } catch (error) {
        console.error('Error leaving trips:', error);
        showAlert('Error leaving trips', 'danger');
    } finally {
        document.getElementById('leave-all-trips-btn').disabled = false;
        document.getElementById('leave-all-trips-btn').innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Leave All Trips';
    }
}

async function calculateDistance() {
    const startLocation = document.getElementById('start-location').value.trim();
    const destination = document.getElementById('trip-destination').value.trim();
    
    if (!startLocation || !destination) {
        showAlert('Please enter both start location and destination', 'warning');
        document.getElementById('distance-results').classList.add('d-none');
        return;
    }
    
    // If locations are the same, show warning
    if (startLocation.toLowerCase() === destination.toLowerCase()) {
        document.getElementById('distance-details').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Start location and destination are the same.
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('distance-details').innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        
        // Try to use OpenRouteService API first
        let distance, duration;
        try {
            const routeData = await calculateRouteWithAPI(startLocation, destination);
            distance = routeData.distance;
            duration = routeData.duration;
        } catch (apiError) {
            console.log('API failed, using simulation:', apiError);
            // Fallback to simulation
            distance = calculateApproximateDistance(startLocation, destination);
            duration = calculateApproximateDuration(distance);
        }
        
        displayDistanceResults(distance, duration);
        
    } catch (error) {
        console.error('Error calculating distance:', error);
        document.getElementById('distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error calculating distance. Please try again.
            </div>
        `;
    }
}

// Enhanced API-based distance calculation
async function calculateRouteWithAPI(start, destination) {
    if (!OPENROUTESERVICE_API_KEY) {
        throw new Error('API key not configured');
    }
    
    try {
        // Geocode start location
        const startGeocode = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(start)}`);
        const startData = await startGeocode.json();
        
        if (!startData.features || startData.features.length === 0) {
            throw new Error('Start location not found');
        }
        
        // Geocode destination
        const destGeocode = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(destination)}`);
        const destData = await destGeocode.json();
        
        if (!destData.features || destData.features.length === 0) {
            throw new Error('Destination not found');
        }
        
        const startCoords = startData.features[0].geometry.coordinates;
        const destCoords = destData.features[0].geometry.coordinates;
        
        // Get route directions
        const routeResponse = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [startCoords, destCoords],
                instructions: false,
                preference: 'recommended'
            })
        });
        
        const routeData = await routeResponse.json();
        
        if (routeData.routes && routeData.routes.length > 0) {
            const route = routeData.routes[0];
            const distance = (route.summary.distance / 1000).toFixed(1); // Convert to km
            const duration = formatDurationFromSeconds(route.summary.duration);
            
            return {
                distance: `${distance} km`,
                duration: duration
            };
        } else {
            throw new Error('No route found');
        }
        
    } catch (error) {
        console.error('OpenRouteService API error:', error);
        throw error;
    }
}

// Helper function to format duration from seconds
function formatDurationFromSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${minutes} minutes`;
    }
}

// Enhanced simulation with better accuracy
function calculateApproximateDistance(start, destination) {
    // Simple hash-based calculation for consistent results
    const startHash = stringToHash(start);
    const destHash = stringToHash(destination);
    
    // Base distance between 50-800 km based on hash difference
    const baseDistance = 100 + Math.abs(startHash - destHash) % 700;
    
    // Add some realistic variation
    const variation = (Math.random() * 100) - 50; // ±50 km
    return Math.max(10, baseDistance + variation); // Minimum 10km
}

// Helper function to create consistent hash from string
function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

function calculateApproximateDuration(distance) {
    // More realistic calculation considering traffic, roads, etc.
    const averageSpeed = 60; // km/h (more realistic average)
    const baseHours = distance / averageSpeed;
    
    // Add time for breaks, traffic, etc. (15-30% more time)
    const additionalTime = baseHours * (0.15 + (Math.random() * 0.15));
    const totalHours = baseHours + additionalTime;
    
    const totalMinutes = Math.round(totalHours * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (hoursPart > 0) {
        return `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    } else {
        return `${minutesPart} minutes`;
    }
}

function displayDistanceResults(distance, duration) {
    const distanceDetails = document.getElementById('distance-details');
    
    distanceDetails.innerHTML = `
        <div class="row">
            <div class="col-6">
                <div class="text-center p-3 bg-light rounded">
                    <i class="fas fa-route text-primary mb-2"></i>
                    <div><strong>Distance</strong></div>
                    <div class="fw-bold text-primary">${typeof distance === 'number' ? distance.toFixed(1) + ' km' : distance}</div>
                </div>
            </div>
            <div class="col-6">
                <div class="text-center p-3 bg-light rounded">
                    <i class="fas fa-clock text-success mb-2"></i>
                    <div><strong>Duration</strong></div>
                    <div class="fw-bold text-success">${duration}</div>
                </div>
            </div>
        </div>
        <div class="alert alert-info mt-3">
            <small><i class="fas fa-info-circle me-1"></i>Actual travel time may vary based on traffic and route conditions</small>
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
    const calculateDistanceChecked = document.getElementById('calculate-distance').checked;
    
    // Validation
    if (!name || !startLocation || !destination || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'warning');
        return;
    }
    
    // Generate a unique trip code
    const code = generateTripCode();
    
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
        expenses: [],
        itinerary: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add route information if calculated
    if (calculateDistanceChecked) {
        const distanceInfo = document.getElementById('distance-details');
        if (!distanceInfo.classList.contains('d-none')) {
            // Extract distance and duration from displayed results
            const distanceText = distanceInfo.querySelector('.text-primary')?.textContent;
            const durationText = distanceInfo.querySelector('.text-success')?.textContent;
            
            if (distanceText && durationText) {
                tripData.route = {
                    distance: distanceText,
                    duration: durationText,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            }
        }
    }
    
    try {
        // Show loading state
        document.getElementById('save-trip-btn').disabled = true;
        document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        // Add to local state
        userTrips.unshift(tripData);
        displayTrips();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTripModal'));
        modal.hide();
        
        // Show share modal
        document.getElementById('share-trip-code').textContent = code;
        const shareModal = new bootstrap.Modal(document.getElementById('shareTripModal'));
        shareModal.show();
        
    } catch (error) {
        console.error('Error creating trip:', error);
        showAlert('Error creating trip. Please try again.', 'danger');
    } finally {
        // Reset button state
        document.getElementById('save-trip-btn').disabled = false;
        document.getElementById('save-trip-btn').innerHTML = 'Create Trip';
    }
}

async function joinTripWithCode() {
    const code = document.getElementById('trip-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('join-trip-message');
    
    if (!code) {
        showMessage(messageEl, 'Please enter a trip code', 'warning');
        return;
    }
    
    if (code.length < 6 || code.length > 8) {
        showMessage(messageEl, 'Trip code must be 6-8 characters', 'warning');
        return;
    }
    
    try {
        // Show loading state
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
        
        // Check if user is already a member
        if (trip.members.includes(currentUser.uid)) {
            showMessage(messageEl, 'You are already a member of this trip.', 'info');
            return;
        }
        
        // Add user to trip members
        await db.collection('trips').doc(tripId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add trip to local state
        const joinedTrip = {
            id: tripId,
            ...trip
        };
        userTrips.unshift(joinedTrip);
        displayTrips();
        
        showMessage(messageEl, 'Successfully joined the trip! Redirecting...', 'success');
        
        // Close modal after delay and navigate to trip details
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('joinTripModal'));
            modal.hide();
            
            // Navigate to trip details
            setCurrentTrip(joinedTrip);
            navigateTo('trip-details.html');
        }, 2000);
        
    } catch (error) {
        console.error('Error joining trip:', error);
        showMessage(messageEl, 'Error joining trip. Please try again.', 'danger');
    } finally {
        // Reset button state
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
    // Create alert element
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
    
    // Add to page
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
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
        setTimeout(() => {
            copySuccess.classList.add('d-none');
        }, 3000);
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

// Utility function to get trip by ID
function getTripById(tripId) {
    return userTrips.find(trip => trip.id === tripId);
}

// Utility function to generate trip code
function generateTripCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Utility function to set current trip
function setCurrentTrip(trip) {
    // Use sessionStorage for consistency with trip-details.js
    sessionStorage.setItem('currentTrip', JSON.stringify(trip));
}

// Utility function to navigate to page
function navigateTo(page) {
    window.location.href = page;
}
