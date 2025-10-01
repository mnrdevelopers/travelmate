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

function initializeApp() {
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
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
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
    
    let progressBarClass = 'bg-success';
    if (remaining < 0) progressBarClass = 'bg-danger';
    else if (remaining < trip.budget * 0.2) progressBarClass = 'bg-warning';
    
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

function showJoinTripModal() {
    document.getElementById('join-trip-message').classList.add('d-none');
    document.getElementById('trip-code').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

// Profile Operations
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

        await db.collection('users').doc(currentUser.uid).set({
            name: name,
            email: currentUser.email,
            uid: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await currentUser.updateProfile({ displayName: name });

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

    try {
        const storageRef = storage.ref();
        const avatarRef = storageRef.child(`avatars/${currentUser.uid}`);
        
        const snapshot = await avatarRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        await currentUser.updateProfile({ photoURL: downloadURL });
        
        await db.collection('users').doc(currentUser.uid).set({
            photoURL: downloadURL
        }, { merge: true });
        
        document.getElementById('profile-avatar').src = downloadURL;
        document.getElementById('user-avatar').src = downloadURL;
        
        showAlert('Avatar updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showAlert('Error uploading avatar', 'danger');
    } finally {
        event.target.value = '';
    }
}

async function leaveAllTrips() {
    if (!confirm('Are you sure you want to leave all trips? This action cannot be undone.')) {
        return;
    }

    try {
        document.getElementById('leave-all-trips-btn').disabled = true;
        document.getElementById('leave-all-trips-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Leaving...';

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
        
        // Use the utility function from utils.js
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
    
    try {
        document.getElementById('save-trip-btn').disabled = true;
        document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        userTrips.unshift(tripData);
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
