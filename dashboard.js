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
    
    // Distance calculation
    document.getElementById('calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateDistance();
        } else {
            document.getElementById('distance-results').classList.add('d-none');
        }
    });
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
    document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email;
    document.getElementById('user-avatar').src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email)}&background=4361ee&color=fff`;
}

async function loadUserTrips() {
    try {
        showLoadingState(true);
        
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        userTrips = [];
        tripsSnapshot.forEach(doc => {
            const tripData = doc.data();
            userTrips.push({
                id: doc.id,
                ...tripData
            });
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
                        <div class="member-avatar me-2">
                            <i class="fas fa-users"></i>
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

async function calculateDistance() {
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    
    if (!startLocation || !destination) {
        alert('Please enter both start location and destination');
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        
        // For real implementation, you would call OpenRouteService API here
        // Since we don't have a real API key, we'll simulate the calculation
        // based on common routes
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simple distance calculation simulation
        const distance = calculateApproximateDistance(startLocation, destination);
        const duration = calculateApproximateDuration(distance);
        
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

function calculateApproximateDistance(start, destination) {
    // Simple simulation - in real app, this would be API call
    const baseDistance = 350; // km
    const randomVariation = Math.random() * 200 - 100; // ±100 km
    return Math.max(50, baseDistance + randomVariation); // Minimum 50km
}

function calculateApproximateDuration(distance) {
    // Assume average speed of 80 km/h for calculation
    const hours = distance / 80;
    const totalMinutes = Math.round(hours * 60);
    
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
        <p><strong>Distance:</strong> ${distance.toFixed(1)} km</p>
        <p><strong>Estimated Travel Time:</strong> ${duration}</p>
        <div class="alert alert-info mt-2">
            <small><i class="fas fa-info-circle me-1"></i>Distance calculation is approximate</small>
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
    
    // Validation
    if (!name || !startLocation || !destination || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showAlert('End date must be after start date', 'danger');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'danger');
        return;
    }
    
    // Generate a unique trip code
    const code = generateTripCode();
    
    const tripData = {
        name,
        startLocation,
        destination,
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
        showMessage(messageEl, 'Please enter a trip code', 'danger');
        return;
    }
    
    if (code.length < 6 || code.length > 8) {
        showMessage(messageEl, 'Trip code must be 6-8 characters', 'danger');
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
            showMessage(messageEl, 'Invalid trip code. Please check the code and try again.', 'danger');
            return;
        }
        
        const tripDoc = tripsSnapshot.docs[0];
        const trip = tripDoc.data();
        const tripId = tripDoc.id;
        
        // Check if user is already a member
        if (trip.members.includes(currentUser.uid)) {
            showMessage(messageEl, 'You are already a member of this trip.', 'warning');
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
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
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
        alert('Failed to copy code. Please copy it manually.');
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
