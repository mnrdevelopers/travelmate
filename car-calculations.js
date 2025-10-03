// Car and Fuel Calculations functionality
let currentVehicle = null;
let savedVehicles = [];
let currentCalculation = null;
let fuelFillUps = [];
let currentFillUpTrip = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
});

function setupCarCalculatorEventListeners() {
    // Vehicle type change
    const vehicleType = document.getElementById('vehicle-type');
    if (vehicleType) {
        vehicleType.addEventListener('change', toggleRentalFields);
    }
    
    // Calculation buttons
    const calculateCostsBtn = document.getElementById('calculate-costs-btn');
    const calculateFromReadings = document.getElementById('calculate-from-readings');
    const resetCalculatorBtn = document.getElementById('reset-calculator-btn');
    
    if (calculateCostsBtn) {
        calculateCostsBtn.addEventListener('click', calculateAllCosts);
    }
    
    if (calculateFromReadings) {
        calculateFromReadings.addEventListener('click', calculateDistanceFromReadings);
    }
    
    if (resetCalculatorBtn) {
        resetCalculatorBtn.addEventListener('click', resetCalculator);
    }
    
    // Save and actions
    const saveVehicleBtn = document.getElementById('save-vehicle-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const addToExpensesBtn = document.getElementById('add-to-expenses-btn');
    const confirmAddExpenses = document.getElementById('confirm-add-expenses');
    
    if (saveVehicleBtn) {
        saveVehicleBtn.addEventListener('click', saveVehicle);
    }
    
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveCalculationTemplate);
    }
    
    if (addToExpensesBtn) {
        addToExpensesBtn.addEventListener('click', showAddToExpensesModal);
    }
    
    if (confirmAddExpenses) {
        confirmAddExpenses.addEventListener('click', addToTripExpenses);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

     // Add fuel fill-up listeners
    setupFuelFillUpEventListeners();
    
    // Auto-calculate on input changes
    const autoCalculateFields = ['trip-distance', 'mileage', 'fuel-price', 'rental-cost', 'trip-duration'];
    autoCalculateFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('input', debounce(calculateAllCosts, 500));
        }
    });
}

function toggleRentalFields() {
    const vehicleType = document.getElementById('vehicle-type').value;
    const rentalFields = document.getElementById('rental-fields');
    
    if (vehicleType === 'rental') {
        rentalFields.style.display = 'block';
    } else {
        rentalFields.style.display = 'none';
    }
}

function calculateDistanceFromReadings() {
    const startReading = parseFloat(document.getElementById('start-reading').value) || 0;
    const endReading = parseFloat(document.getElementById('end-reading').value) || 0;
    
    if (endReading <= startReading) {
        showAlert('End reading must be greater than start reading', 'warning');
        return;
    }
    
    const distance = endReading - startReading;
    document.getElementById('trip-distance').value = distance.toFixed(1);
    
    calculateAllCosts();
}

function calculateAllCosts() {
    const vehicleType = document.getElementById('vehicle-type').value;
    const tripDistance = parseFloat(document.getElementById('trip-distance').value) || 0;
    const mileage = parseFloat(document.getElementById('mileage').value) || 1;
    const fuelPrice = parseFloat(document.getElementById('fuel-price').value) || 0;
    const tripDuration = parseInt(document.getElementById('trip-duration').value) || 1;
    
    if (tripDistance <= 0 || mileage <= 0) {
        showCalculationResults({}, false);
        return;
    }
    
    const calculation = {
        vehicleType: vehicleType,
        tripDistance: tripDistance,
        mileage: mileage,
        fuelPrice: fuelPrice,
        tripDuration: tripDuration,
        timestamp: new Date().toISOString()
    };
    
    // Calculate fuel costs
    const fuelConsumed = tripDistance / mileage;
    calculation.fuelConsumed = parseFloat(fuelConsumed.toFixed(2));
    calculation.fuelCost = parseFloat((fuelConsumed * fuelPrice).toFixed(2));
    
    // Calculate rental costs if applicable
    if (vehicleType === 'rental') {
        const rentalCost = parseFloat(document.getElementById('rental-cost').value) || 0;
        const insuranceCost = parseFloat(document.getElementById('insurance-cost').value) || 0;
        calculation.rentalCost = rentalCost * tripDuration;
        calculation.insuranceCost = insuranceCost;
    } else {
        calculation.rentalCost = 0;
        calculation.insuranceCost = 0;
    }
    
    // Additional expenses
    const maintenanceCost = parseFloat(document.getElementById('maintenance-cost').value) || 0;
    const tollCost = parseFloat(document.getElementById('toll-cost').value) || 0;
    const parkingCost = parseFloat(document.getElementById('parking-cost').value) || 0;
    
    calculation.maintenanceCost = maintenanceCost;
    calculation.tollCost = tollCost;
    calculation.parkingCost = parkingCost;
    
    // Total calculation
    calculation.totalCost = calculation.fuelCost + calculation.rentalCost + 
                           calculation.insuranceCost + maintenanceCost + 
                           tollCost + parkingCost;
    
    // Cost per km
    calculation.costPerKm = parseFloat((calculation.totalCost / tripDistance).toFixed(2));
    
    currentCalculation = calculation;
    showCalculationResults(calculation, true);
}

function showCalculationResults(calculation, hasData) {
    const resultsContainer = document.getElementById('calculation-results');
    
    if (!hasData) {
        resultsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-calculator fa-3x mb-3"></i>
                <p>Enter trip details to see cost breakdown</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = `
        <div class="mb-3">
            <h6 class="text-primary"><i class="fas fa-gas-pump me-2"></i>Fuel Costs</h6>
            <div class="row small">
                <div class="col-6">Fuel Consumed:</div>
                <div class="col-6 text-end">${calculation.fuelConsumed} L</div>
                <div class="col-6">Fuel Cost:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.fuelCost.toFixed(2)}</div>
            </div>
        </div>
        
        ${calculation.vehicleType === 'rental' ? `
        <div class="mb-3">
            <h6 class="text-warning"><i class="fas fa-car me-2"></i>Rental Costs</h6>
            <div class="row small">
                <div class="col-6">Rental:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.rentalCost.toFixed(2)}</div>
                <div class="col-6">Insurance:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.insuranceCost.toFixed(2)}</div>
            </div>
        </div>
        ` : ''}
        
        <div class="mb-3">
            <h6 class="text-info"><i class="fas fa-tools me-2"></i>Additional Costs</h6>
            <div class="row small">
                <div class="col-6">Maintenance:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.maintenanceCost.toFixed(2)}</div>
                <div class="col-6">Toll Charges:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.tollCost.toFixed(2)}</div>
                <div class="col-6">Parking:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${calculation.parkingCost.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="border-top pt-3">
            <div class="row fw-bold">
                <div class="col-6">Total Cost:</div>
                <div class="col-6 text-end text-success"><span class="rupee-symbol">₹</span>${calculation.totalCost.toFixed(2)}</div>
                <div class="col-6">Cost per km:</div>
                <div class="col-6 text-end text-info"><span class="rupee-symbol">₹</span>${calculation.costPerKm}</div>
            </div>
        </div>
        
        <div class="mt-3 p-2 bg-light rounded">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Based on ${calculation.tripDistance} km trip
            </small>
        </div>
    `;
}

async function saveVehicle() {
    // Check authentication
    if (!auth.currentUser) {
        showAlert('Please sign in to save vehicles', 'warning');
        return;
    }
    
    const vehicleData = {
        name: document.getElementById('vehicle-name').value.trim() || 'My Vehicle',
        type: document.getElementById('vehicle-type').value,
        fuelType: document.getElementById('fuel-type').value,
        mileage: parseFloat(document.getElementById('mileage').value) || 0,
        fuelPrice: parseFloat(document.getElementById('fuel-price').value) || 0,
        rentalCost: document.getElementById('vehicle-type').value === 'rental' ? 
                   parseFloat(document.getElementById('rental-cost').value) || 0 : 0,
        insuranceCost: document.getElementById('vehicle-type').value === 'rental' ? 
                      parseFloat(document.getElementById('insurance-cost').value) || 0 : 0,
        createdAt: new Date().toISOString()
    };
    
    if (!vehicleData.mileage || vehicleData.mileage <= 0) {
        showAlert('Please enter a valid mileage', 'warning');
        return;
    }
    
    try {
        document.getElementById('save-vehicle-btn').disabled = true;
        document.getElementById('save-vehicle-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        await db.collection('users').doc(auth.currentUser.uid).update({
            vehicles: firebase.firestore.FieldValue.arrayUnion(vehicleData),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Vehicle saved successfully!', 'success');
        loadSavedVehicles();
        
    } catch (error) {
        console.error('Error saving vehicle:', error);
        
        // If user document doesn't exist, create it
        if (error.code === 'not-found') {
            try {
                await db.collection('users').doc(auth.currentUser.uid).set({
                    vehicles: [vehicleData],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showAlert('Vehicle saved successfully!', 'success');
                loadSavedVehicles();
            } catch (createError) {
                console.error('Error creating user document:', createError);
                showAlert('Error saving vehicle', 'danger');
            }
        } else {
            showAlert('Error saving vehicle', 'danger');
        }
    } finally {
        document.getElementById('save-vehicle-btn').disabled = false;
        document.getElementById('save-vehicle-btn').innerHTML = '<i class="fas fa-save me-1"></i>Save Vehicle';
    }
}

async function loadSavedVehicles() {
    try {
        // Check if user is authenticated
        if (!auth.currentUser) {
            console.log('User not authenticated, skipping vehicle load');
            return;
        }
        
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const vehiclesList = document.getElementById('saved-vehicles-list');
        
        if (!vehiclesList) {
            console.error('Saved vehicles list element not found');
            return;
        }
        
        if (userDoc.exists && userDoc.data().vehicles) {
            savedVehicles = userDoc.data().vehicles;
            
            if (savedVehicles.length === 0) {
                vehiclesList.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <p>No vehicles saved yet</p>
                    </div>
                `;
                return;
            }
            
            vehiclesList.innerHTML = savedVehicles.map((vehicle, index) => `
                <div class="card mb-2 vehicle-item" data-index="${index}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${vehicle.name}</h6>
                                <small class="text-muted">
                                    ${vehicle.type} • ${vehicle.mileage} km/l
                                </small>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-primary load-vehicle-btn me-1" title="Load Vehicle">
                                    <i class="fas fa-upload"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-vehicle-btn" title="Delete Vehicle">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners
            document.querySelectorAll('.load-vehicle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.vehicle-item').dataset.index;
                    loadVehicle(savedVehicles[index]);
                });
            });
            
            document.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.vehicle-item').dataset.index;
                    deleteVehicle(index);
                });
            });
            
        } else {
            vehiclesList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <p>No vehicles saved yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        const vehiclesList = document.getElementById('saved-vehicles-list');
        if (vehiclesList) {
            vehiclesList.innerHTML = `
                <div class="text-center text-danger py-3">
                    <p>Error loading vehicles</p>
                </div>
            `;
        }
    }
}

function loadVehicle(vehicle) {
    document.getElementById('vehicle-name').value = vehicle.name;
    document.getElementById('vehicle-type').value = vehicle.type;
    document.getElementById('fuel-type').value = vehicle.fuelType;
    document.getElementById('mileage').value = vehicle.mileage;
    document.getElementById('fuel-price').value = vehicle.fuelPrice;
    
    if (vehicle.type === 'rental') {
        document.getElementById('rental-cost').value = vehicle.rentalCost;
        document.getElementById('insurance-cost').value = vehicle.insuranceCost;
    }
    
    toggleRentalFields();
    showAlert('Vehicle loaded successfully!', 'success');
}

async function deleteVehicle(index) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
        const vehicleToDelete = savedVehicles[index];
        await db.collection('users').doc(auth.currentUser.uid).update({
            vehicles: firebase.firestore.FieldValue.arrayRemove(vehicleToDelete)
        });
        
        showAlert('Vehicle deleted successfully!', 'success');
        loadSavedVehicles();
        
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        showAlert('Error deleting vehicle', 'danger');
    }
}

function showAddToExpensesModal() {
    if (!currentCalculation) {
        showAlert('Please calculate costs first', 'warning');
        return;
    }
    
    loadUserTripsForExpenses();
    showExpenseBreakdown();
    
    const modal = new bootstrap.Modal(document.getElementById('addToExpensesModal'));
    modal.show();
}

async function loadUserTripsForExpenses() {
    try {
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', auth.currentUser.uid)
            .get();
        
        const tripSelect = document.getElementById('select-trip');
        tripSelect.innerHTML = '<option value="">Choose a trip...</option>';
        
        tripsSnapshot.forEach(doc => {
            const trip = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${trip.name} (${trip.code})`;
            tripSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

function showExpenseBreakdown() {
    const breakdown = document.getElementById('expense-breakdown');
    
    breakdown.innerHTML = `
        <div class="border rounded p-2">
            ${currentCalculation.fuelCost > 0 ? `
            <div class="row">
                <div class="col-6">Fuel Cost:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.fuelCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            ${currentCalculation.rentalCost > 0 ? `
            <div class="row">
                <div class="col-6">Rental Cost:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.rentalCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            ${currentCalculation.insuranceCost > 0 ? `
            <div class="row">
                <div class="col-6">Insurance:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.insuranceCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            ${currentCalculation.maintenanceCost > 0 ? `
            <div class="row">
                <div class="col-6">Maintenance:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.maintenanceCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            ${currentCalculation.tollCost > 0 ? `
            <div class="row">
                <div class="col-6">Toll Charges:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.tollCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            ${currentCalculation.parkingCost > 0 ? `
            <div class="row">
                <div class="col-6">Parking:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.parkingCost.toFixed(2)}</div>
            </div>
            ` : ''}
            
            <div class="row fw-bold border-top mt-1 pt-1">
                <div class="col-6">Total:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.totalCost.toFixed(2)}</div>
            </div>
        </div>
        <div class="mt-2 small text-muted">
            <i class="fas fa-info-circle me-1"></i>
            Each cost will be added as a separate expense item
        </div>
    `;
}

async function addToTripExpenses() {
    const tripId = document.getElementById('select-trip').value;
    
    if (!tripId) {
        showAlert('Please select a trip', 'warning');
        return;
    }
    
    try {
        document.getElementById('confirm-add-expenses').disabled = true;
        document.getElementById('confirm-add-expenses').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

        // First add fuel fill-ups if any
        if (fuelFillUps.length > 0) {
            await addFuelFillUpsToExpenses(tripId);
        }
        
        // Then add the calculated costs (existing logic)
        if (currentCalculation) {
            const tripDoc = await db.collection('trips').doc(tripId).get();
            const tripData = tripDoc.data();
            
            const expenses = tripData.expenses || [];
            const today = new Date().toISOString().split('T')[0];
    
    try {
        document.getElementById('confirm-add-expenses').disabled = true;
        document.getElementById('confirm-add-expenses').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

        const tripDoc = await db.collection('trips').doc(tripId).get();
        const tripData = tripDoc.data();
        
        const expenses = tripData.expenses || [];
        const today = new Date().toISOString().split('T')[0];
        
        // Add fuel expense
        if (currentCalculation.fuelCost > 0) {
            expenses.push({
                description: `Fuel for ${currentCalculation.tripDistance} km trip`,
                amount: currentCalculation.fuelCost,
                category: 'fuel',
                paymentMode: 'cash',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add rental expense if applicable
        if (currentCalculation.rentalCost > 0) {
            expenses.push({
                description: `Car rental for ${currentCalculation.tripDuration} days`,
                amount: currentCalculation.rentalCost,
                category: 'transport',
                paymentMode: 'card',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add MAINTENANCE expense separately
        if (currentCalculation.maintenanceCost > 0) {
            expenses.push({
                description: 'Vehicle maintenance',
                amount: currentCalculation.maintenanceCost,
                category: 'maintenance',
                paymentMode: 'cash',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add TOLL CHARGES expense separately
        if (currentCalculation.tollCost > 0) {
            expenses.push({
                description: 'Toll charges',
                amount: currentCalculation.tollCost,
                category: 'transport',
                paymentMode: 'cash',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add PARKING expense separately
        if (currentCalculation.parkingCost > 0) {
            expenses.push({
                description: 'Parking fees',
                amount: currentCalculation.parkingCost,
                category: 'transport',
                paymentMode: 'cash',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add insurance expense separately if applicable
        if (currentCalculation.insuranceCost > 0) {
            expenses.push({
                description: 'Vehicle insurance',
                amount: currentCalculation.insuranceCost,
                category: 'insurance',
                paymentMode: 'card',
                date: today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }

        await db.collection('trips').doc(tripId).update({
            expenses: expenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addToExpensesModal'));
        modal.hide();
        
        showAlert('All expenses added to trip successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding expenses to trip:', error);
        showAlert('Error adding expenses to trip', 'danger');
    } finally {
        document.getElementById('confirm-add-expenses').disabled = false;
        document.getElementById('confirm-add-expenses').innerHTML = 'Add to Expenses';
    }
}

function saveCalculationTemplate() {
    if (!currentCalculation) {
        showAlert('Please calculate costs first', 'warning');
        return;
    }
    
    // Save to localStorage for now
    const templates = JSON.parse(localStorage.getItem('carCalculationTemplates') || '[]');
    templates.push({
        ...currentCalculation,
        name: `Calculation ${new Date().toLocaleDateString()}`,
        savedAt: new Date().toISOString()
    });
    
    localStorage.setItem('carCalculationTemplates', JSON.stringify(templates));
    showAlert('Calculation saved as template!', 'success');
}

function resetCalculator() {
    document.getElementById('vehicle-name').value = '';
    document.getElementById('mileage').value = '';
    document.getElementById('fuel-price').value = '';
    document.getElementById('trip-distance').value = '';
    document.getElementById('trip-duration').value = '1';
    document.getElementById('start-reading').value = '';
    document.getElementById('end-reading').value = '';
    document.getElementById('maintenance-cost').value = '0';
    document.getElementById('toll-cost').value = '0';
    document.getElementById('parking-cost').value = '0';
    document.getElementById('rental-cost').value = '';
    document.getElementById('insurance-cost').value = '';
    
    currentCalculation = null;
    showCalculationResults({}, false);
    showAlert('Calculator reset successfully!', 'info');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            loadUserData();
            setupCarCalculatorEventListeners();
            loadSavedVehicles(); // Move this here
        } else {
            // User is signed out
            navigateTo('auth.html');
        }
    });
}

function loadUserData() {
    const user = auth.currentUser;
    document.getElementById('user-name').textContent = user.displayName || 'Traveler';
    document.getElementById('user-avatar').src = user.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Traveler')}&background=4361ee&color=fff`;
}

function handleLogout() {
    auth.signOut().then(() => {
        navigateTo('auth.html');
    }).catch((error) => {
        console.error('Logout error:', error);
        showAlert('Error logging out', 'danger');
    });
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

// Fuel Fill-up Tracking Functions
function setupFuelFillUpEventListeners() {
    const addFillUpBtn = document.getElementById('add-fillup-btn');
    const resetFillUpsBtn = document.getElementById('reset-fillups-btn');
    
    if (addFillUpBtn) {
        addFillUpBtn.addEventListener('click', addFuelFillUp);
    }
    
    if (resetFillUpsBtn) {
        resetFillUpsBtn.addEventListener('click', resetAllFillUps);
    }
    
    // Set default date to today
    document.getElementById('fillup-date').valueAsDate = new Date();
    
    // Load saved fill-ups if any
    loadSavedFillUps();
}

function addFuelFillUp() {
    const odometer = parseFloat(document.getElementById('fillup-odometer').value);
    const liters = parseFloat(document.getElementById('fillup-liters').value);
    const cost = parseFloat(document.getElementById('fillup-cost').value);
    const date = document.getElementById('fillup-date').value;
    
    if (!odometer || !liters || !cost) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }
    
    // Validate odometer reading is increasing
    if (fuelFillUps.length > 0) {
        const lastOdometer = fuelFillUps[fuelFillUps.length - 1].odometer;
        if (odometer <= lastOdometer) {
            showAlert('Odometer reading must be greater than previous reading', 'warning');
            return;
        }
    }
    
    const fillUp = {
        odometer,
        liters,
        cost,
        date: date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        fuelPrice: parseFloat((cost / liters).toFixed(2))
    };
    
    fuelFillUps.push(fillUp);
    
    // Sort by odometer reading
    fuelFillUps.sort((a, b) => a.odometer - b.odometer);
    
    updateFillUpHistory();
    calculateActualMileage();
    resetFillUpForm();
    saveFillUpsToStorage();
    
    showAlert('Fuel fill-up added successfully!', 'success');
}

function calculateActualMileage() {
    const resultsContainer = document.getElementById('actual-mileage-results');
    
    if (fuelFillUps.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    let totalDistance = 0;
    let totalFuel = 0;
    let totalCost = 0;
    
    // Calculate distances and fuel between fill-ups
    for (let i = 1; i < fuelFillUps.length; i++) {
        const distance = fuelFillUps[i].odometer - fuelFillUps[i-1].odometer;
        const fuel = fuelFillUps[i].liters;
        
        totalDistance += distance;
        totalFuel += fuel;
        totalCost += fuelFillUps[i].cost;
    }
    
    const actualMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 0;
    const costPerKm = totalDistance > 0 ? (totalCost / totalDistance).toFixed(2) : 0;
    const averageFuelPrice = totalFuel > 0 ? (totalCost / totalFuel).toFixed(2) : 0;
    
    // Update UI with actual calculations
    document.getElementById('actual-mileage').textContent = `${actualMileage} km/l`;
    document.getElementById('actual-cost-per-km').textContent = `₹${costPerKm}/km`;
    document.getElementById('total-distance-traveled').textContent = `${totalDistance} km`;
    document.getElementById('total-fuel-cost').textContent = `₹${totalCost.toFixed(2)}`;
    
    resultsContainer.style.display = 'block';
    
    // Update the main calculator with actual data
    updateCalculatorWithActualData(actualMileage, averageFuelPrice, totalDistance);
}

function updateCalculatorWithActualData(mileage, fuelPrice, distance) {
    if (mileage > 0) {
        document.getElementById('mileage').value = mileage;
    }
    if (fuelPrice > 0) {
        document.getElementById('fuel-price').value = fuelPrice;
    }
    if (distance > 0 && !document.getElementById('trip-distance').value) {
        document.getElementById('trip-distance').value = distance;
    }
    
    // Recalculate costs with actual data
    calculateAllCosts();
}

function updateFillUpHistory() {
    const fillupList = document.getElementById('fillup-list');
    
    if (fuelFillUps.length === 0) {
        fillupList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-gas-pump fa-2x mb-2"></i>
                <p>No fill-ups recorded yet</p>
                <small>Add your first fuel fill-up to start tracking</small>
            </div>
        `;
        return;
    }
    
    fillupList.innerHTML = fuelFillUps.map((fillUp, index) => {
        const previousOdometer = index > 0 ? fuelFillUps[index - 1].odometer : 0;
        const distance = index > 0 ? fillUp.odometer - previousOdometer : 0;
        const mileage = index > 0 ? (distance / fillUp.liters).toFixed(2) : 'N/A';
        
        return `
            <div class="card mb-3 fillup-item">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="row">
                                <div class="col-md-2">
                                    <strong class="text-primary">${fillUp.odometer} km</strong>
                                    ${index > 0 ? `<br><small class="text-muted">+${distance} km</small>` : ''}
                                </div>
                                <div class="col-md-2">
                                    ${fillUp.liters} L<br>
                                    <small class="text-muted">₹${fillUp.fuelPrice}/L</small>
                                </div>
                                <div class="col-md-2">
                                    ₹${fillUp.cost.toFixed(2)}<br>
                                    ${index > 0 ? `<small class="text-muted">${mileage} km/L</small>` : '<small class="text-muted">First fill</small>'}
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">${new Date(fillUp.date).toLocaleDateString()}</small>
                                </div>
                                <div class="col-md-3 text-end">
                                    <button class="btn btn-sm btn-outline-danger delete-fillup-btn" data-index="${index}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-fillup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.delete-fillup-btn').dataset.index);
            deleteFillUp(index);
        });
    });
}

function deleteFillUp(index) {
    if (!confirm('Are you sure you want to delete this fill-up?')) return;
    
    fuelFillUps.splice(index, 1);
    updateFillUpHistory();
    calculateActualMileage();
    saveFillUpsToStorage();
    
    showAlert('Fill-up deleted successfully!', 'success');
}

function resetFillUpForm() {
    document.getElementById('fillup-odometer').value = '';
    document.getElementById('fillup-liters').value = '';
    document.getElementById('fillup-cost').value = '';
    // Keep the date as is for convenience
}

function resetAllFillUps() {
    if (fuelFillUps.length === 0) return;
    
    if (!confirm('Are you sure you want to delete all fill-ups? This cannot be undone.')) return;
    
    fuelFillUps = [];
    updateFillUpHistory();
    calculateActualMileage();
    saveFillUpsToStorage();
    
    showAlert('All fill-ups cleared!', 'info');
}

function saveFillUpsToStorage() {
    // Save to localStorage (you can modify this to use Firestore)
    const fillUpData = {
        fillUps: fuelFillUps,
        savedAt: new Date().toISOString(),
        tripId: currentFillUpTrip ? currentFillUpTrip.id : null
    };
    
    localStorage.setItem('fuelFillUps', JSON.stringify(fillUpData));
}

function loadSavedFillUps() {
    try {
        const savedData = localStorage.getItem('fuelFillUps');
        if (savedData) {
            const fillUpData = JSON.parse(savedData);
            fuelFillUps = fillUpData.fillUps || [];
            
            // Sort by odometer reading
            fuelFillUps.sort((a, b) => a.odometer - b.odometer);
            
            updateFillUpHistory();
            calculateActualMileage();
        }
    } catch (error) {
        console.error('Error loading saved fill-ups:', error);
        fuelFillUps = [];
    }
}

// Enhanced Add to Expenses function to include fill-up data
async function addFuelFillUpsToExpenses(tripId) {
    if (fuelFillUps.length === 0) {
        showAlert('No fuel fill-ups to add', 'warning');
        return;
    }
    
    try {
        const tripDoc = await db.collection('trips').doc(tripId).get();
        const tripData = tripDoc.data();
        
        const expenses = tripData.expenses || [];
        const today = new Date().toISOString().split('T')[0];
        
        // Add each fill-up as a separate expense
        fuelFillUps.forEach((fillUp, index) => {
            expenses.push({
                description: `Fuel fill-up at ${fillUp.odometer} km - ${fillUp.liters}L`,
                amount: fillUp.cost,
                category: 'fuel',
                paymentMode: 'cash',
                date: fillUp.date || today,
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString(),
                isFuelFillUp: true,
                odometer: fillUp.odometer,
                liters: fillUp.liters,
                fuelPrice: fillUp.fuelPrice
            });
        });
        
        // Also save fill-up data to trip for reporting
        await db.collection('trips').doc(tripId).update({
            expenses: expenses,
            fuelFillUps: fuelFillUps, // Store raw fill-up data
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert(`${fuelFillUps.length} fuel fill-ups added to trip expenses!`, 'success');
        
    } catch (error) {
        console.error('Error adding fuel fill-ups to expenses:', error);
        showAlert('Error adding fuel expenses to trip', 'danger');
    }
}
