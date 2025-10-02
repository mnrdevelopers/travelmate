// Dashboard JavaScript
let currentUser = null;
let userTrips = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase Auth
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            document.getElementById('user-name').textContent = user.displayName || 'User';
            document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/40';
            loadUserTrips();
        } else {
            window.location.href = 'index.html';
        }
    });

    // Event Listeners
    document.getElementById('create-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('create-first-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('save-trip-btn').addEventListener('click', saveTrip);
    document.getElementById('join-trip-btn').addEventListener('click', showJoinTripModal);
    document.getElementById('join-trip-confirm-btn').addEventListener('click', joinTrip);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('nav-profile').addEventListener('click', showProfileModal);
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    document.getElementById('leave-all-trips-btn').addEventListener('click', leaveAllTrips);
    document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
    
    // Car type change handler
    document.getElementById('car-type').addEventListener('change', function() {
        const rentalDetails = document.getElementById('rental-details');
        if (this.value === 'rental') {
            rentalDetails.classList.remove('d-none');
        } else {
            rentalDetails.classList.add('d-none');
        }
    });
    
    // Add stop button handler
    document.getElementById('add-stop-btn').addEventListener('click', addStop);
    
    // Initialize date fields
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
});

function showCreateTripModal() {
    const modal = new bootstrap.Modal(document.getElementById('createTripModal'));
    modal.show();
    
    // Clear previous stops
    document.getElementById('stops-container').innerHTML = '';
    
    // Add first stop
    addStop();
}

function addStop() {
    const stopsContainer = document.getElementById('stops-container');
    const stopIndex = stopsContainer.children.length + 1;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'stop-item card mb-3';
    stopDiv.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Stop ${stopIndex}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-stop" ${stopIndex === 1 ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Stop Name</label>
                    <input type="text" class="form-control stop-name" placeholder="Enter stop name" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Meter Reading (km)</label>
                    <input type="number" class="form-control meter-reading" min="0" step="0.1" placeholder="Optional">
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <label class="form-label">Manual KMs from Previous Stop</label>
                    <input type="number" class="form-control manual-kms" min="0" step="0.1" placeholder="Enter distance if not using meter readings">
                </div>
            </div>
        </div>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Add event listener to remove button
    const removeBtn = stopDiv.querySelector('.remove-stop');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            if (stopsContainer.children.length > 1) {
                stopDiv.remove();
                // Renumber remaining stops
                renumberStops();
            }
        });
    }
}

function renumberStops() {
    const stopsContainer = document.getElementById('stops-container');
    const stopItems = stopsContainer.querySelectorAll('.stop-item');
    
    stopItems.forEach((item, index) => {
        const header = item.querySelector('h6');
        header.textContent = `Stop ${index + 1}`;
        
        const removeBtn = item.querySelector('.remove-stop');
        if (removeBtn) {
            removeBtn.disabled = index === 0;
        }
    });
}

function saveTrip() {
    const tripName = document.getElementById('trip-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const startLocation = document.getElementById('start-location').value;
    const startMeterReading = document.getElementById('start-meter-reading').value;
    const endLocation = document.getElementById('end-location').value;
    const endMeterReading = document.getElementById('end-meter-reading').value;
    const manualKmsMode = document.getElementById('manual-kms-mode').checked;
    const carType = document.getElementById('car-type').value;
    const rentalPerDay = document.getElementById('rental-per-day').value;
    const rentalDays = document.getElementById('rental-days').value;
    const fuelType = document.getElementById('fuel-type').value;
    const fuelPrice = document.getElementById('fuel-price').value;
    const mileage = document.getElementById('mileage').value;
    const autoCalcFuel = document.getElementById('auto-calc-fuel').checked;
    const tripBudget = document.getElementById('trip-budget').value;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
        showToast('End date must be after start date', 'error');
        return;
    }
    
    // Collect stops
    const stops = [];
    const stopItems = document.querySelectorAll('.stop-item');
    
    stopItems.forEach((item, index) => {
        const stopName = item.querySelector('.stop-name').value;
        const meterReading = item.querySelector('.meter-reading').value;
        const manualKms = item.querySelector('.manual-kms').value;
        
        if (stopName) {
            stops.push({
                name: stopName,
                meterReading: meterReading ? parseFloat(meterReading) : null,
                manualKms: manualKms ? parseFloat(manualKms) : null,
                order: index
            });
        }
    });
    
    // Generate trip code
    const tripCode = generateTripCode();
    
    // Calculate rental days if not provided
    const calculatedRentalDays = rentalDays || calculateDaysBetween(startDate, endDate);
    
    // Create trip object
    const trip = {
        name: tripName,
        startDate: startDate,
        endDate: endDate,
        startLocation: startLocation,
        startMeterReading: startMeterReading ? parseFloat(startMeterReading) : null,
        endLocation: endLocation,
        endMeterReading: endMeterReading ? parseFloat(endMeterReading) : null,
        stops: stops,
        manualKmsMode: manualKmsMode,
        carType: carType,
        rentalPerDay: rentalPerDay ? parseFloat(rentalPerDay) : null,
        rentalDays: calculatedRentalDays,
        fuelType: fuelType,
        fuelPrice: parseFloat(fuelPrice),
        mileage: parseFloat(mileage),
        autoCalcFuel: autoCalcFuel,
        budget: parseFloat(tripBudget),
        code: tripCode,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        members: [currentUser.uid]
    };
    
    // Save to Firestore
    const db = firebase.firestore();
    db.collection('trips').add(trip)
        .then((docRef) => {
            showToast('Trip created successfully!', 'success');
            document.getElementById('createTripModal').querySelector('.btn-close').click();
            loadUserTrips();
        })
        .catch((error) => {
            console.error('Error creating trip: ', error);
            showToast('Error creating trip. Please try again.', 'error');
        });
}

function calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
}

function generateTripCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showJoinTripModal() {
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

function joinTrip() {
    const tripCode = document.getElementById('trip-code').value.toUpperCase();
    
    if (tripCode.length !== 6) {
        showToast('Please enter a valid 6-character trip code', 'error');
        return;
    }
    
    const db = firebase.firestore();
    db.collection('trips').where('code', '==', tripCode).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                showToast('Trip not found. Please check the code.', 'error');
                return;
            }
            
            const tripDoc = querySnapshot.docs[0];
            const trip = tripDoc.data();
            
            // Check if user is already a member
            if (trip.members && trip.members.includes(currentUser.uid)) {
                showToast('You are already a member of this trip', 'info');
                document.getElementById('joinTripModal').querySelector('.btn-close').click();
                return;
            }
            
            // Add user to trip members
            return db.collection('trips').doc(tripDoc.id).update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        })
        .then(() => {
            showToast('Successfully joined the trip!', 'success');
            document.getElementById('joinTripModal').querySelector('.btn-close').click();
            loadUserTrips();
        })
        .catch((error) => {
            console.error('Error joining trip: ', error);
            showToast('Error joining trip. Please try again.', 'error');
        });
}

function loadUserTrips() {
    const db = firebase.firestore();
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    db.collection('trips').where('members', 'array-contains', currentUser.uid).get()
        .then((querySnapshot) => {
            userTrips = [];
            tripsContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                emptyTrips.style.display = 'block';
                return;
            }
            
            emptyTrips.style.display = 'none';
            
            querySnapshot.forEach((doc) => {
                const trip = { id: doc.id, ...doc.data() };
                userTrips.push(trip);
                
                const tripCard = createTripCard(trip);
                tripsContainer.appendChild(tripCard);
            });
        })
        .catch((error) => {
            console.error('Error loading trips: ', error);
            showToast('Error loading trips', 'error');
        });
}

function createTripCard(trip) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const startDate = formatDate(trip.startDate);
    const endDate = formatDate(trip.endDate);
    const totalKms = calculateTotalKms(trip);
    const fuelCost = calculateFuelCost(trip, totalKms);
    const rentalCost = calculateRentalCost(trip);
    
    col.innerHTML = `
        <div class="card trip-card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title">${trip.name}</h5>
                    <span class="trip-code">${trip.code}</span>
                </div>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-map-marker-alt me-1"></i>${trip.startLocation} to ${trip.endLocation}
                </p>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-calendar-alt me-1"></i>${startDate} - ${endDate}
                </p>
                <div class="trip-stats mb-3">
                    <div class="stat-item">
                        <span class="stat-value">${totalKms.toFixed(1)}</span>
                        <span class="stat-label">km</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value"><span class="rupee-symbol">₹</span>${fuelCost.toFixed(0)}</span>
                        <span class="stat-label">fuel</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value"><span class="rupee-symbol">₹</span>${rentalCost.toFixed(0)}</span>
                        <span class="stat-label">rental</span>
                    </div>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-outline-primary btn-sm view-trip-btn" data-trip-id="${trip.id}">
                        <i class="fas fa-eye me-1"></i>View
                    </button>
                    <div>
                        <button class="btn btn-outline-secondary btn-sm edit-trip-btn" data-trip-id="${trip.id}">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm leave-trip-btn" data-trip-id="${trip.id}">
                            <i class="fas fa-sign-out-alt me-1"></i>Leave
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    col.querySelector('.view-trip-btn').addEventListener('click', function() {
        window.location.href = `trip-details.html?id=${trip.id}`;
    });
    
    col.querySelector('.edit-trip-btn').addEventListener('click', function() {
        editTrip(trip.id);
    });
    
    col.querySelector('.leave-trip-btn').addEventListener('click', function() {
        leaveTrip(trip.id);
    });
    
    return col;
}

function calculateTotalKms(trip) {
    // If we have meter readings, use them
    if (trip.endMeterReading && trip.startMeterReading) {
        return trip.endMeterReading - trip.startMeterReading;
    }
    
    // Otherwise, try to calculate from stops with meter readings
    let totalKms = 0;
    let lastMeterReading = trip.startMeterReading;
    
    if (trip.stops && trip.stops.length > 0) {
        for (let stop of trip.stops) {
            if (stop.meterReading && lastMeterReading !== null) {
                totalKms += stop.meterReading - lastMeterReading;
                lastMeterReading = stop.meterReading;
            } else if (stop.manualKms) {
                totalKms += stop.manualKms;
            }
        }
        
        // Add distance from last stop to end
        if (trip.endMeterReading && lastMeterReading !== null) {
            totalKms += trip.endMeterReading - lastMeterReading;
        }
    }
    
    return totalKms > 0 ? totalKms : 0;
}

function calculateFuelCost(trip, totalKms) {
    if (!trip.fuelPrice || !trip.mileage) return 0;
    const fuelConsumed = totalKms / trip.mileage;
    return fuelConsumed * trip.fuelPrice;
}

function calculateRentalCost(trip) {
    if (trip.carType !== 'rental' || !trip.rentalPerDay || !trip.rentalDays) return 0;
    return trip.rentalPerDay * trip.rentalDays;
}

function editTrip(tripId) {
    const trip = userTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    document.getElementById('edit-trip-id').value = tripId;
    document.getElementById('edit-trip-name').value = trip.name;
    document.getElementById('edit-start-location').value = trip.startLocation;
    document.getElementById('edit-trip-destination').value = trip.endLocation;
    document.getElementById('edit-start-date').value = trip.startDate;
    document.getElementById('edit-end-date').value = trip.endDate;
    document.getElementById('edit-trip-budget').value = trip.budget;
    
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

// Add event listener for update trip button
document.getElementById('update-trip-btn').addEventListener('click', function() {
    const tripId = document.getElementById('edit-trip-id').value;
    const tripName = document.getElementById('edit-trip-name').value;
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = document.getElementById('edit-trip-budget').value;
    
    const db = firebase.firestore();
    db.collection('trips').doc(tripId).update({
        name: tripName,
        startLocation: startLocation,
        endLocation: destination,
        startDate: startDate,
        endDate: endDate,
        budget: parseFloat(budget)
    })
    .then(() => {
        showToast('Trip updated successfully!', 'success');
        document.getElementById('editTripModal').querySelector('.btn-close').click();
        loadUserTrips();
    })
    .catch((error) => {
        console.error('Error updating trip: ', error);
        showToast('Error updating trip. Please try again.', 'error');
    });
});

function leaveTrip(tripId) {
    if (!confirm('Are you sure you want to leave this trip?')) return;
    
    const db = firebase.firestore();
    db.collection('trips').doc(tripId).update({
        members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
    })
    .then(() => {
        showToast('You have left the trip', 'success');
        loadUserTrips();
    })
    .catch((error) => {
        console.error('Error leaving trip: ', error);
        showToast('Error leaving trip. Please try again.', 'error');
    });
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error signing out: ', error);
        });
}

function showProfileModal() {
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    
    // Populate profile data
    document.getElementById('profile-name').value = currentUser.displayName || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-userid').value = currentUser.uid;
    document.getElementById('profile-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/100';
    
    modal.show();
}

function saveProfile() {
    const displayName = document.getElementById('profile-name').value;
    
    currentUser.updateProfile({
        displayName: displayName
    })
    .then(() => {
        showToast('Profile updated successfully!', 'success');
        document.getElementById('user-name').textContent = displayName;
        document.getElementById('profileModal').querySelector('.btn-close').click();
    })
    .catch((error) => {
        console.error('Error updating profile: ', error);
        showToast('Error updating profile. Please try again.', 'error');
    });
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // In a real app, you would upload this to Firebase Storage
    // For now, we'll just show a preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profile-avatar').src = e.target.result;
        document.getElementById('user-avatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function leaveAllTrips() {
    if (!confirm('Are you sure you want to leave all trips? This action cannot be undone.')) return;
    
    const db = firebase.firestore();
    const batch = db.batch();
    
    userTrips.forEach(trip => {
        const tripRef = db.collection('trips').doc(trip.id);
        batch.update(tripRef, {
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
    });
    
    batch.commit()
        .then(() => {
            showToast('You have left all trips', 'success');
            loadUserTrips();
            document.getElementById('profileModal').querySelector('.btn-close').click();
        })
        .catch((error) => {
            console.error('Error leaving all trips: ', error);
            showToast('Error leaving trips. Please try again.', 'error');
        });
}
