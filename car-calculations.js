// Car and Fuel Calculations functionality
let currentVehicle = null;
let savedVehicles = [];
let currentCalculation = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupCarCalculatorEventListeners();
    loadSavedVehicles();
});

function setupCarCalculatorEventListeners() {
    // Vehicle type change
    document.getElementById('vehicle-type').addEventListener('change', toggleRentalFields);
    
    // Calculation buttons
    document.getElementById('calculate-costs-btn').addEventListener('click', calculateAllCosts);
    document.getElementById('calculate-from-readings').addEventListener('click', calculateDistanceFromReadings);
    document.getElementById('reset-calculator-btn').addEventListener('click', resetCalculator);
    
    // Save and actions
    document.getElementById('save-vehicle-btn').addEventListener('click', saveVehicle);
    document.getElementById('save-template-btn').addEventListener('click', saveCalculationTemplate);
    document.getElementById('add-to-expenses-btn').addEventListener('click', showAddToExpensesModal);
    document.getElementById('confirm-add-expenses').addEventListener('click', addToTripExpenses);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Auto-calculate on input changes
    const autoCalculateFields = ['trip-distance', 'mileage', 'fuel-price', 'rental-cost', 'trip-duration'];
    autoCalculateFields.forEach(field => {
        document.getElementById(field).addEventListener('input', debounce(calculateAllCosts, 500));
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
        await db.collection('users').doc(auth.currentUser.uid).update({
            vehicles: firebase.firestore.FieldValue.arrayUnion(vehicleData)
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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    }
}

async function loadSavedVehicles() {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const vehiclesList = document.getElementById('saved-vehicles-list');
        
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
            <div class="row">
                <div class="col-6">Fuel Cost:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.fuelCost.toFixed(2)}</div>
            </div>
            ${currentCalculation.rentalCost > 0 ? `
            <div class="row">
                <div class="col-6">Rental Cost:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.rentalCost.toFixed(2)}</div>
            </div>
            ` : ''}
            <div class="row">
                <div class="col-6">Additional Costs:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${(currentCalculation.maintenanceCost + currentCalculation.tollCost + currentCalculation.parkingCost).toFixed(2)}</div>
            </div>
            <div class="row fw-bold border-top mt-1 pt-1">
                <div class="col-6">Total:</div>
                <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${currentCalculation.totalCost.toFixed(2)}</div>
            </div>
        </div>
    `;
}

async function addToTripExpenses() {
    const tripId = document.getElementById('select-trip').value;
    
    if (!tripId) {
        showAlert('Please select a trip', 'warning');
        return;
    }
    
    if (!currentCalculation) {
        showAlert('No calculation data available', 'warning');
        return;
    }
    
    try {
        const tripDoc = await db.collection('trips').doc(tripId).get();
        const tripData = tripDoc.data();
        
        const expenses = tripData.expenses || [];
        
        // Add fuel expense
        if (currentCalculation.fuelCost > 0) {
            expenses.push({
                description: `Fuel for ${currentCalculation.tripDistance} km trip`,
                amount: currentCalculation.fuelCost,
                category: 'fuel',
                paymentMode: 'cash',
                date: new Date().toISOString().split('T')[0],
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add rental expense if applicable
        if (currentCalculation.rentalCost > 0) {
            expenses.push({
                description: `Car rental for ${currentCalculation.tripDuration} days`,
                amount: currentCalculation.rentalCost,
                category: 'other',
                paymentMode: 'card',
                date: new Date().toISOString().split('T')[0],
                addedBy: auth.currentUser.uid,
                addedAt: new Date().toISOString()
            });
        }
        
        // Add additional expenses
        const additionalCosts = currentCalculation.maintenanceCost + 
                              currentCalculation.tollCost + 
                              currentCalculation.parkingCost;
        
        if (additionalCosts > 0) {
            expenses.push({
                description: 'Additional car expenses (maintenance, toll, parking)',
                amount: additionalCosts,
                category: 'other',
                paymentMode: 'cash',
                date: new Date().toISOString().split('T')[0],
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
        
        showAlert('Expenses added to trip successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding expenses to trip:', error);
        showAlert('Error adding expenses to trip', 'danger');
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
            loadUserData();
        } else {
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
