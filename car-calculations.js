// Car and Fuel Calculations functionality
let currentVehicle = null;
let savedVehicles = [];
let currentCalculation = null;
let fuelFillUps = [];
let currentFillUpTrip = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupTheme();
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
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
    
    // Fuel type change listener for label updates
    const fuelType = document.getElementById('fuel-type');
    if (fuelType) {
        fuelType.addEventListener('change', updateFuelLabels);
    }
    
    // Auto-calculate on input changes
    const autoCalculateFields = ['trip-distance', 'mileage', 'fuel-price', 'rental-cost', 'trip-duration', 'tank-capacity'];
    autoCalculateFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('input', debounce(calculateAllCosts, 500));
        }
    });

    // Setup document file input listener displays
    ['rc', 'dl', 'puc', 'ins'].forEach(type => {
        const fileEl = document.getElementById(`doc-${type}-file`);
        if (fileEl) {
            fileEl.addEventListener('change', (e) => {
                const label = document.getElementById(`doc-${type}-file-name`);
                if (label && e.target.files.length > 0) {
                    label.textContent = `Selected: ${e.target.files[0].name}`;
                }
            });
        }
    });
    
    const refreshFastagBtn = document.getElementById('refresh-fastag-btn');
    if (refreshFastagBtn) {
        refreshFastagBtn.addEventListener('click', simulateFastagFetch);
    }
    
    const saveVehicleDocsBtn = document.getElementById('save-vehicle-docs-btn');
    if (saveVehicleDocsBtn) {
        saveVehicleDocsBtn.addEventListener('click', saveVehicleDocuments);
    }
    
    const fetchTollBtn = document.getElementById('fetch-toll-btn');
    if (fetchTollBtn) {
        fetchTollBtn.addEventListener('click', calculateLiveTolls);
    }
}

function updateFuelLabels() {
    const fuelType = document.getElementById('fuel-type').value;
    const mileageLabel = document.getElementById('mileage-label');
    const mileageInput = document.getElementById('mileage');
    const fuelPriceLabel = document.getElementById('fuel-price-label');
    const fuelPriceInput = document.getElementById('fuel-price');
    const tankCapacityLabel = document.getElementById('tank-capacity-label');
    const tankCapacityInput = document.getElementById('tank-capacity');
    
    if (fuelType === 'electric') {
        if (mileageLabel) mileageLabel.textContent = 'Efficiency (km/kWh)';
        if (mileageInput) mileageInput.placeholder = 'e.g., 6.5';
        if (fuelPriceLabel) fuelPriceLabel.textContent = 'Elec. Cost (₹/kWh)';
        if (fuelPriceInput) fuelPriceInput.placeholder = 'e.g., 8.0';
        if (tankCapacityLabel) tankCapacityLabel.textContent = 'Battery Cap. (kWh)';
        if (tankCapacityInput) tankCapacityInput.placeholder = 'e.g., 40';
    } else if (fuelType === 'cng') {
        if (mileageLabel) mileageLabel.textContent = 'Mileage (km/kg)';
        if (mileageInput) mileageInput.placeholder = 'e.g., 22';
        if (fuelPriceLabel) fuelPriceLabel.textContent = 'CNG Price (₹/kg)';
        if (fuelPriceInput) fuelPriceInput.placeholder = 'e.g., 85.0';
        if (tankCapacityLabel) tankCapacityLabel.textContent = 'CNG Tank Cap. (kg)';
        if (tankCapacityInput) tankCapacityInput.placeholder = 'e.g., 10';
    } else {
        if (mileageLabel) mileageLabel.textContent = 'Mileage (km/l)';
        if (mileageInput) mileageInput.placeholder = 'e.g., 15';
        if (fuelPriceLabel) fuelPriceLabel.textContent = 'Fuel Price (₹/l)';
        if (fuelPriceInput) fuelPriceInput.placeholder = 'e.g., 95.5';
        if (tankCapacityLabel) tankCapacityLabel.textContent = 'Tank Capacity (L)';
        if (tankCapacityInput) tankCapacityInput.placeholder = 'e.g., 45';
    }
    
    calculateAllCosts();
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
    
    // Calculate CO2 emissions
    const fuelType = document.getElementById('fuel-type').value;
    const factor = getEmissionFactor('car', fuelType);
    calculation.co2Emitted = parseFloat((tripDistance * factor).toFixed(1));
    calculation.co2Saved = fuelType === 'electric' ? parseFloat((tripDistance * 0.09).toFixed(1)) : 
                           fuelType === 'cng' ? parseFloat((tripDistance * 0.03).toFixed(1)) : 0;
    calculation.fuelType = fuelType;

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
        showEcoCalculationResults({}, false);
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
    showEcoCalculationResults(calculation, true);
}

function showEcoCalculationResults(calculation, hasData) {
    const ecoCard = document.getElementById('eco-results-card');
    const ecoContent = document.getElementById('eco-results-content');
    const rangeCard = document.getElementById('range-planner-card');
    const rangeContent = document.getElementById('range-planner-content');
    const comparisonCard = document.getElementById('comparison-card');
    const comparisonTableBody = document.getElementById('comparison-table-body');
    
    if (!ecoCard || !ecoContent) return;
    
    if (!hasData || !calculation || calculation.tripDistance <= 0) {
        ecoCard.style.display = 'none';
        if (rangeCard) rangeCard.style.display = 'none';
        if (comparisonCard) comparisonCard.style.display = 'none';
        return;
    }
    
    ecoCard.style.display = 'block';
    
    const leaf = getLeafRating(calculation.co2Emitted);
    
    let fuelDesc = 'Standard Petrol';
    if (calculation.fuelType === 'diesel') fuelDesc = 'Diesel';
    if (calculation.fuelType === 'cng') fuelDesc = 'Compressed Natural Gas (CNG)';
    if (calculation.fuelType === 'electric') fuelDesc = 'Electric Vehicle (EV)';
    
    let savingsHTML = '';
    if (calculation.co2Saved > 0) {
        savingsHTML = `
            <div class="alert alert-success mt-2 mb-0 py-2">
                <small>
                    <i class="fas fa-tree me-1 text-success"></i>
                    Choosing <strong>${fuelDesc}</strong> saved <strong>${calculation.co2Saved} kg of CO₂</strong> compared to petrol!
                </small>
            </div>
        `;
    } else if (calculation.fuelType === 'electric') {
        savingsHTML = `
            <div class="alert alert-success mt-2 mb-0 py-2">
                <small><i class="fas fa-plug me-1 text-success"></i>Electric vehicle driving emits zero direct tailpipe carbon!</small>
            </div>
        `;
    } else {
        savingsHTML = `
            <div class="alert alert-warning mt-2 mb-0 py-2">
                <small>
                    <i class="fas fa-info-circle me-1 text-warning"></i>
                    Consider switching to CNG or EV to lower carbon emissions.
                </small>
            </div>
        `;
    }
    
    ecoContent.innerHTML = `
        <div class="row align-items-center mb-3">
            <div class="col-8">
                <h6 class="mb-1 text-success">Total CO₂ Emitted:</h6>
                <small class="text-muted">For a ${calculation.tripDistance} km trip (${fuelDesc})</small>
            </div>
            <div class="col-4 text-end">
                <h4 class="fw-bold text-success mb-0">${calculation.co2Emitted} kg</h4>
            </div>
        </div>
        
        <div class="d-flex align-items-center justify-content-between p-2 bg-light rounded mb-2">
            <span class="small text-muted"><i class="fas fa-leaf me-1 text-success"></i>Trip Eco Rating:</span>
            <span class="badge bg-light ${leaf.class} fw-bold" title="${leaf.desc}"><i class="fas ${leaf.icon} me-1"></i>${leaf.rating}</span>
        </div>
        
        ${savingsHTML}
    `;

    // 1. Range & Stops Estimation
    const tankCapacity = parseFloat(document.getElementById('tank-capacity').value) || 0;
    if (rangeCard && rangeContent) {
        if (tankCapacity > 0 && calculation.mileage > 0) {
            rangeCard.style.display = 'block';
            
            // Calculate range
            const maxRange = tankCapacity * calculation.mileage;
            const stopsNeeded = Math.max(0, Math.ceil(calculation.tripDistance / maxRange) - 1);
            
            let isEv = calculation.fuelType === 'electric';
            let fuelUnit = isEv ? 'kWh' : (calculation.fuelType === 'cng' ? 'kg' : 'L');
            let stopType = isEv ? 'Recharge stops' : 'Refuel stops';
            let iconClass = isEv ? 'fa-bolt text-warning' : 'fa-gas-pump text-primary';
            
            let stopsDetailHTML = '';
            if (stopsNeeded === 0) {
                stopsDetailHTML = `
                    <div class="alert alert-success py-2 mb-0 mt-2">
                        <small><i class="fas fa-check-circle me-1"></i><strong>Full Range:</strong> You can complete this trip on a single charge/tank! (Total range: ${maxRange.toFixed(0)} km)</small>
                    </div>
                `;
            } else {
                let interval = calculation.tripDistance / (stopsNeeded + 1);
                stopsDetailHTML = `
                    <div class="alert alert-warning py-2 mb-0 mt-2">
                        <small>
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            <strong>Range Alert:</strong> Plan to refuel/recharge every <strong>${interval.toFixed(0)} km</strong>.
                        </small>
                    </div>
                `;
            }

            rangeContent.innerHTML = `
                <div class="row text-center mb-2">
                    <div class="col-6 border-end">
                        <small class="text-muted d-block">Estimated Range</small>
                        <h4 class="fw-bold mb-0 text-info">${maxRange.toFixed(0)} km</h4>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block">Stops Required</small>
                        <h4 class="fw-bold mb-0 text-danger">${stopsNeeded}</h4>
                    </div>
                </div>
                <div class="d-flex align-items-center justify-content-between p-2 bg-light rounded mt-2">
                    <span class="small text-muted"><i class="fas ${iconClass} me-1"></i>Capacity:</span>
                    <span class="fw-semibold">${tankCapacity} ${fuelUnit}</span>
                </div>
                ${stopsDetailHTML}
            `;
        } else {
            rangeCard.style.display = 'none';
        }
    }

    // 2. Comparative Fuel & Eco Analysis
    if (comparisonCard && comparisonTableBody) {
        comparisonCard.style.display = 'block';
        
        // Define average price and efficiency benchmarks for comparison
        const prices = {
            petrol: parseFloat(document.getElementById('fuel-price').value) || 95.5,
            diesel: 89.2,
            cng: 82.5,
            electric: 7.5
        };
        
        const mileages = {
            petrol: parseFloat(document.getElementById('mileage').value) || 15.0,
            diesel: 18.0,
            cng: 22.0,
            electric: 6.2
        };
        
        prices[calculation.fuelType] = calculation.fuelPrice;
        mileages[calculation.fuelType] = calculation.mileage;

        const modes = [
            { id: 'petrol', name: 'Petrol Car', icon: 'fa-car text-danger' },
            { id: 'diesel', name: 'Diesel Car', icon: 'fa-car text-warning' },
            { id: 'cng', name: 'CNG Car', icon: 'fa-leaf text-success' },
            { id: 'electric', name: 'Electric (EV)', icon: 'fa-bolt text-info' }
        ];

        comparisonTableBody.innerHTML = modes.map(m => {
            const cost = (calculation.tripDistance / mileages[m.id]) * prices[m.id];
            const emFactor = getEmissionFactor('car', m.id);
            const co2 = calculation.tripDistance * emFactor;
            const isCurrent = m.id === calculation.fuelType;
            
            return `
                <tr class="${isCurrent ? 'table-success fw-bold' : ''}">
                    <td>
                        <i class="fas ${m.icon} me-1"></i> ${m.name}
                        ${isCurrent ? ' <small class="badge bg-success py-0" style="font-size:0.6rem;">Selected</small>' : ''}
                    </td>
                    <td>₹${cost.toFixed(0)}</td>
                    <td>${co2.toFixed(1)} kg</td>
                </tr>
            `;
        }).join('');
    }
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
            
            vehiclesList.innerHTML = savedVehicles.map((vehicle, index) => {
                const plateText = vehicle.plateNumber ? ` • <span class="badge bg-secondary font-monospace">${vehicle.plateNumber}</span>` : '';
                return `
                <div class="card mb-2 vehicle-item" data-index="${index}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1 fw-bold">${vehicle.name}${plateText}</h6>
                                <small class="text-muted">
                                    ${vehicle.type} • ${vehicle.mileage} km/l
                                </small>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-info manage-vehicle-btn me-1" title="Manage Details & Docs">
                                    <i class="fas fa-folder-open"></i>
                                </button>
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
                `;
            }).join('');
            
            // Add event listeners
            document.querySelectorAll('.load-vehicle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.vehicle-item').dataset.index;
                    loadVehicle(savedVehicles[index]);
                });
            });
            
            document.querySelectorAll('.manage-vehicle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('.vehicle-item').dataset.index);
                    openVehicleManager(index);
                });
            });
            
            document.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.vehicle-item').dataset.index;
                    deleteVehicle(index);
                });
            });
            
            // Check alerts on load
            checkVehicleAlertsOnLoad();
            
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

function updateDocumentStatusBadge(badgeId, expiryDateStr) {
    const badgeEl = document.getElementById(badgeId);
    if (!badgeEl) return;
    
    if (!expiryDateStr) {
        badgeEl.textContent = 'N/A';
        badgeEl.className = 'badge bg-secondary';
        return;
    }
    
    const expiryDate = new Date(expiryDateStr);
    expiryDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        badgeEl.textContent = 'Expired';
        badgeEl.className = 'badge bg-danger';
    } else if (diffDays <= 30) {
        badgeEl.textContent = `Expiring Soon (${diffDays}d)`;
        badgeEl.className = 'badge bg-warning text-dark';
    } else {
        badgeEl.textContent = 'Active';
        badgeEl.className = 'badge bg-success';
    }
}

let activeManagerIndex = null;

function openVehicleManager(index) {
    activeManagerIndex = index;
    const vehicle = savedVehicles[index];
    if (!vehicle) return;
    
    document.getElementById('manage-vehicle-index').value = index;
    document.getElementById('manage-vehicle-name').value = vehicle.name;
    document.getElementById('manage-plate-number').value = vehicle.plateNumber || '';
    document.getElementById('manage-fastag-id').value = vehicle.fastagId || '';
    
    let balance = vehicle.fastagBalance;
    if ((balance === undefined || balance === null) && vehicle.fastagId) {
        balance = getStableMockBalance(vehicle.fastagId);
        vehicle.fastagBalance = balance;
    } else if (balance === undefined || balance === null) {
        balance = 500;
    }
    
    document.getElementById('manage-fastag-balance').textContent = `₹${balance.toFixed(2)}`;
    
    // Check low balance alert display
    const alertEl = document.getElementById('fastag-low-balance-alert');
    if (alertEl) {
        alertEl.style.display = balance < 250 ? 'flex' : 'none';
    }
    
    // Documents
    const docs = vehicle.documents || {};
    const docTypes = ['rc', 'dl', 'puc', 'ins'];
    docTypes.forEach(type => {
        const doc = docs[type] || {};
        document.getElementById(`doc-${type}-number`).value = doc.docNumber || '';
        document.getElementById(`doc-${type}-expiry`).value = doc.expiryDate || '';
        document.getElementById(`doc-${type}-file`).value = ''; // clear input
        
        const fileNameEl = document.getElementById(`doc-${type}-file-name`);
        if (fileNameEl) {
            fileNameEl.textContent = doc.fileName ? `Uploaded: ${doc.fileName}` : 'No file attached';
        }
        updateDocumentStatusBadge(`${type}-status-badge`, doc.expiryDate);
    });
    
    const modalEl = document.getElementById('vehicleManagerModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function simulateFastagFetch() {
    const tagId = document.getElementById('manage-fastag-id').value.trim();
    if (!tagId) {
        showAlert('Please enter a FASTag ID/Tag Number first', 'warning');
        return;
    }
    
    const refreshBtn = document.getElementById('refresh-fastag-btn');
    const originalHtml = refreshBtn.innerHTML;
    
    try {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Connecting Live...';
        
        // Fetch credentials from Firestore
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const apiUrl = userData.fastagApiUrl;
        const apiKey = userData.fastagApiKey;
        
        if (!apiUrl) {
            throw new Error("Live FASTag API URL is not configured. Please go to the Dashboard -> Profile Settings to link your Setu, Surepass, or RapidAPI credentials.");
        }
        
        // Retrieve plate number of the vehicle if available
        const plateNumber = document.getElementById('manage-plate-number').value.trim();
        
        // Make the actual HTTP API call!
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey || ''
            },
            body: JSON.stringify({
                tagId: tagId,
                vehicleNumber: plateNumber || ''
            })
        });
        
        if (!response.ok) {
            throw new Error(`FASTag API server returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse balance dynamically from common response structures
        let balance = null;
        if (data.balance !== undefined) balance = data.balance;
        else if (data.data && data.data.balance !== undefined) balance = data.data.balance;
        else if (data.availableBalance !== undefined) balance = data.availableBalance;
        else if (data.fastagBalance !== undefined) balance = data.fastagBalance;
        else if (data.wallet && data.wallet.balance !== undefined) balance = data.wallet.balance;
        
        if (balance === null || isNaN(parseFloat(balance))) {
            throw new Error("Could not parse balance from API response. Check response structure or JSON path.");
        }
        
        const parsedBalance = parseFloat(balance);
        
        document.getElementById('manage-fastag-balance').textContent = `₹${parsedBalance.toFixed(2)}`;
        
        const alertEl = document.getElementById('fastag-low-balance-alert');
        if (alertEl) {
            alertEl.style.display = parsedBalance < 250 ? 'flex' : 'none';
        }
        
        // Save dynamically into current savedVehicles memory
        if (activeManagerIndex !== null && savedVehicles[activeManagerIndex]) {
            savedVehicles[activeManagerIndex].fastagBalance = parsedBalance;
            savedVehicles[activeManagerIndex].fastagId = tagId;
        }
        
        showAlert('FASTag balance fetched successfully from your API!', 'success');
        
        // Low balance notification check
        if (parsedBalance < 250) {
            triggerNativeNotification('Low FASTag Balance Alert!', `FASTag Tag ${tagId} has critically low balance: ₹${parsedBalance.toFixed(2)}.`);
        }
        
    } catch (error) {
        console.error('FASTag API Fetch Error:', error);
        showAlert(error.message || 'Error communicating with the FASTag API server', 'danger');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHtml;
    }
}

async function saveVehicleDocuments() {
    if (activeManagerIndex === null) return;
    
    const index = activeManagerIndex;
    const vehicle = savedVehicles[index];
    if (!vehicle) return;
    
    const plateNumber = document.getElementById('manage-plate-number').value.trim();
    const fastagId = document.getElementById('manage-fastag-id').value.trim();
    
    // Parse current balance text
    const balanceText = document.getElementById('manage-fastag-balance').textContent.replace('₹', '');
    const fastagBalance = parseFloat(balanceText) || 0;
    
    const docs = vehicle.documents || {};
    const docTypes = ['rc', 'dl', 'puc', 'ins'];
    
    docTypes.forEach(type => {
        const numberVal = document.getElementById(`doc-${type}-number`).value.trim();
        const expiryVal = document.getElementById(`doc-${type}-expiry`).value;
        const fileInput = document.getElementById(`doc-${type}-file`);
        
        let fileName = docs[type] ? docs[type].fileName : null;
        if (fileInput.files.length > 0) {
            fileName = fileInput.files[0].name;
        }
        
        docs[type] = {
            docNumber: numberVal,
            expiryDate: expiryVal,
            fileName: fileName
        };
    });
    
    vehicle.plateNumber = plateNumber;
    vehicle.fastagId = fastagId;
    vehicle.fastagBalance = fastagBalance;
    vehicle.documents = docs;
    
    try {
        const saveBtn = document.getElementById('save-vehicle-docs-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
        
        await db.collection('users').doc(auth.currentUser.uid).update({
            vehicles: savedVehicles,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Vehicle details and documents updated successfully!', 'success');
        
        // Close modal
        const modalEl = document.getElementById('vehicleManagerModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        loadSavedVehicles();
    } catch (e) {
        console.error('Error saving docs:', e);
        showAlert('Failed to save vehicle details', 'danger');
    } finally {
        const saveBtn = document.getElementById('save-vehicle-docs-btn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save All Changes';
    }
}

function triggerNativeNotification(title, body) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'icon.png'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: 'icon.png'
                });
            }
        });
    }
}

function checkVehicleAlertsOnLoad() {
    const alertsContainer = document.getElementById('vehicle-alerts-container');
    if (!alertsContainer) return;
    
    alertsContainer.innerHTML = '';
    const alertsList = [];
    
    savedVehicles.forEach(vehicle => {
        // FASTag low balance alert
        let balance = vehicle.fastagBalance;
        if ((balance === undefined || balance === null) && vehicle.fastagId) {
            balance = getStableMockBalance(vehicle.fastagId);
            vehicle.fastagBalance = balance;
        }
        if (balance !== undefined && balance !== null && balance < 250) {
            alertsList.push({
                type: 'warning',
                title: `Low FASTag Balance (${vehicle.name})`,
                desc: `FASTag balance is ₹${balance.toFixed(2)}. Please recharge soon.`,
                icon: 'fas fa-ticket'
            });
        }
        
        // Expiry alerts
        const docs = vehicle.documents || {};
        const docLabels = {
            rc: 'Registration Certificate (RC)',
            dl: 'Driving License (DL)',
            puc: 'Pollution Certificate (PUC)',
            ins: 'Vehicle Insurance'
        };
        
        Object.keys(docLabels).forEach(key => {
            const doc = docs[key];
            if (doc && doc.expiryDate) {
                const expiryDate = new Date(doc.expiryDate);
                expiryDate.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    alertsList.push({
                        type: 'danger',
                        title: `${docLabels[key]} Expired`,
                        desc: `Document for vehicle ${vehicle.name} expired on ${doc.expiryDate}!`,
                        icon: 'fas fa-exclamation-circle'
                    });
                } else if (diffDays <= 30) {
                    alertsList.push({
                        type: 'warning',
                        title: `${docLabels[key]} Expiring Soon`,
                        desc: `Document for vehicle ${vehicle.name} expires in ${diffDays} days (${doc.expiryDate}).`,
                        icon: 'fas fa-clock'
                    });
                }
            }
        });
    });
    
    if (alertsList.length === 0) return;
    
    alertsList.forEach(alert => {
        const banner = document.createElement('div');
        banner.className = `vehicle-alert-banner ${alert.type === 'warning' ? 'warning' : ''}`;
        banner.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${alert.icon} fs-5 me-3"></i>
                <div>
                    <h6 class="mb-0 fw-bold">${alert.title}</h6>
                    <small>${alert.desc}</small>
                </div>
            </div>
            <button type="button" class="btn-close ms-3" onclick="this.parentElement.remove()" style="font-size: 0.8rem;"></button>
        `;
        alertsContainer.appendChild(banner);
        
        // Trigger a native notification
        triggerNativeNotification(alert.title, alert.desc);
    });
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
     if (!currentCalculation && fuelFillUps.length === 0) {
        showAlert('Please calculate costs or add fuel fill-ups first', 'warning');
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
    
    let breakdownHTML = '<div class="border rounded p-2">';
    
    // Show fuel fill-ups if any
    if (fuelFillUps.length > 0) {
        breakdownHTML += `
            <div class="mb-3">
                <h6 class="text-success"><i class="fas fa-gas-pump me-2"></i>Fuel Fill-ups</h6>
                ${fuelFillUps.map((fillUp, index) => {
                    const previousOdometer = index > 0 ? fuelFillUps[index - 1].odometer : 0;
                    const distance = index > 0 ? fillUp.odometer - previousOdometer : 0;
                    
                    return `
                        <div class="row small border-bottom pb-1 mb-1">
                            <div class="col-8">${fillUp.liters}L at ${fillUp.odometer} km${index > 0 ? ` (+${distance} km)` : ''}</div>
                            <div class="col-4 text-end"><span class="rupee-symbol">₹</span>${fillUp.cost.toFixed(2)}</div>
                        </div>
                    `;
                }).join('')}
                <div class="row small fw-bold mt-1">
                    <div class="col-8">Total Fuel Fill-ups (${fuelFillUps.length}):</div>
                    <div class="col-4 text-end"><span class="rupee-symbol">₹</span>${fuelFillUps.reduce((sum, fillUp) => sum + fillUp.cost, 0).toFixed(2)}</div>
                </div>
            </div>
        `;
    }
    
    // Show calculated costs if available
    if (currentCalculation) {
        breakdownHTML += `
            ${currentCalculation.fuelCost > 0 ? `
            <div class="row">
                <div class="col-6">Calculated Fuel Cost:</div>
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
        `;
    }
    
    // Calculate and show totals
    const totalFuelFillUpsCost = fuelFillUps.reduce((sum, fillUp) => sum + fillUp.cost, 0);
    const totalCalculatedCost = currentCalculation ? currentCalculation.totalCost : 0;
    const grandTotal = totalFuelFillUpsCost + totalCalculatedCost;
    
    breakdownHTML += `
        <div class="row fw-bold border-top mt-1 pt-1">
            <div class="col-6">Grand Total:</div>
            <div class="col-6 text-end"><span class="rupee-symbol">₹</span>${grandTotal.toFixed(2)}</div>
        </div>
    </div>
    
    <div class="mt-2 small text-muted">
        <i class="fas fa-info-circle me-1"></i>
        ${fuelFillUps.length > 0 ? 'Fuel fill-ups will be added as individual expense items. ' : ''}
        ${currentCalculation ? 'Each calculated cost will be added as a separate expense item.' : ''}
    </div>
    `;
    
    breakdown.innerHTML = breakdownHTML;
}

// In car-calculations.js, update the addToTripExpenses function:

async function addToTripExpenses() {
    const tripId = document.getElementById('select-trip').value;
    
    if (!tripId) {
        showAlert('Please select a trip', 'warning');
        return;
    }
    
    if (!currentCalculation && fuelFillUps.length === 0) {
        showAlert('No calculation data or fuel fill-ups available', 'warning');
        return;
    }
    
    try {
        document.getElementById('confirm-add-expenses').disabled = true;
        document.getElementById('confirm-add-expenses').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

        // Get fresh trip data
        const tripDoc = await db.collection('trips').doc(tripId).get();
        const tripData = tripDoc.data();
        
        // Ensure expenses array exists
        const expenses = tripData.expenses || [];
        const today = new Date().toISOString().split('T')[0];
        
        // First add fuel fill-ups if any
        if (fuelFillUps.length > 0) {
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
                    fuelPrice: fillUp.fuelPrice,
                    fillUpIndex: index
                });
            });
            
            // Also save raw fill-up data to trip for reporting
            await db.collection('trips').doc(tripId).update({
                fuelFillUps: fuelFillUps,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Then add the calculated costs
        if (currentCalculation) {
            // Add fuel expense from calculation
            if (currentCalculation.fuelCost > 0) {
                expenses.push({
                    description: `Fuel for ${currentCalculation.tripDistance} km trip`,
                    amount: currentCalculation.fuelCost,
                    category: 'fuel',
                    paymentMode: 'cash',
                    date: today,
                    addedBy: auth.currentUser.uid,
                    addedAt: new Date().toISOString(),
                    isCalculatedFuel: true,
                    tripDistance: currentCalculation.tripDistance,
                    fuelConsumed: currentCalculation.fuelConsumed
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
            
            // Add other expenses
            const additionalExpenses = [
                { cost: currentCalculation.maintenanceCost, desc: 'Vehicle maintenance', category: 'maintenance' },
                { cost: currentCalculation.tollCost, desc: 'Toll charges', category: 'transport' },
                { cost: currentCalculation.parkingCost, desc: 'Parking fees', category: 'transport' },
                { cost: currentCalculation.insuranceCost, desc: 'Vehicle insurance', category: 'insurance' }
            ];
            
            additionalExpenses.forEach(exp => {
                if (exp.cost > 0) {
                    expenses.push({
                        description: exp.desc,
                        amount: exp.cost,
                        category: exp.category,
                        paymentMode: 'cash',
                        date: today,
                        addedBy: auth.currentUser.uid,
                        addedAt: new Date().toISOString()
                    });
                }
            });
        }

        // Update trip with all expenses
        await db.collection('trips').doc(tripId).update({
            expenses: expenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById('addToExpensesModal'));
        modal.hide();
        
        // Show success message with details
        let successMessage = 'All expenses added to trip successfully!';
        if (fuelFillUps.length > 0 && currentCalculation) {
            successMessage = `${fuelFillUps.length} fuel fill-ups and calculated costs added to trip!`;
        } else if (fuelFillUps.length > 0) {
            successMessage = `${fuelFillUps.length} fuel fill-ups added to trip!`;
        } else if (currentCalculation) {
            successMessage = 'Calculated costs added to trip!';
        }
        
        showAlert(successMessage, 'success');
        
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
            loadSavedVehicles();
        } else {
            // User is signed out
            navigateTo('login.html');
        }
    });
}

function loadUserData() {
    const user = auth.currentUser;
    document.getElementById('user-name').textContent = user.displayName || 'Traveler';
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.src = getSafeAvatarUrl(user.photoURL, user.displayName || 'Traveler');
        setupAvatarFallback(userAvatar, user.displayName || 'Traveler');
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        navigateTo('login.html');
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
    
    // Update trip data if we have a current trip
    if (currentFillUpTrip && currentFillUpTrip.id) {
        updateTripFuelFillUps(currentFillUpTrip.id, fuelFillUps);
    }
    
    showAlert('Fuel fill-up added successfully!', 'success');
}

// Function to set current trip for fuel tracking
function setCurrentFillUpTrip(trip) {
    currentFillUpTrip = trip;
    
    // Load fill-ups from the specific trip
    if (trip && trip.fuelFillUps) {
        fuelFillUps = [...trip.fuelFillUps];
        fuelFillUps.sort((a, b) => a.odometer - b.odometer);
        updateFillUpHistory();
        calculateActualMileage();
    } else {
        fuelFillUps = [];
        updateFillUpHistory();
        calculateActualMileage();
    }
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
    
    const deletedFillUp = fuelFillUps[index];
    fuelFillUps.splice(index, 1);
    updateFillUpHistory();
    calculateActualMileage();
    saveFillUpsToStorage();
    
    // Update trip data if we have a current trip
    if (currentFillUpTrip && currentFillUpTrip.id) {
        updateTripFuelFillUps(currentFillUpTrip.id, fuelFillUps);
    }
    
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
    
    const tripId = currentFillUpTrip ? currentFillUpTrip.id : null;
    fuelFillUps = [];
    updateFillUpHistory();
    calculateActualMileage();
    saveFillUpsToStorage();
    
    // Update trip data
    if (tripId) {
        updateTripFuelFillUps(tripId, []);
    }
    
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

async function updateTripFuelFillUps(tripId, fillUps) {
    if (!tripId) return;
    
    try {
        await db.collection('trips').doc(tripId).update({
            fuelFillUps: fillUps,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating trip fuel fill-ups:', error);
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

// Load trips for fuel fill-up association
async function loadTripsForFuelTracking() {
    try {
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', auth.currentUser.uid)
            .get();
        
        const tripSelect = document.getElementById('select-fillup-trip');
        tripSelect.innerHTML = '<option value="">Select a trip...</option>';
        
        tripsSnapshot.forEach(doc => {
            const trip = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${trip.name} (${trip.code})`;
            option.dataset.trip = JSON.stringify({
                id: doc.id,
                ...trip
            });
            tripSelect.appendChild(option);
        });
        
        // Add event listener for trip selection
        tripSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const trip = JSON.parse(selectedOption.dataset.trip);
                setCurrentFillUpTrip(trip);
                document.getElementById('clear-trip-fuel-btn').style.display = 'block';
            } else {
                setCurrentFillUpTrip(null);
                document.getElementById('clear-trip-fuel-btn').style.display = 'none';
            }
        });
        
        // Add event listener for clear button
        document.getElementById('clear-trip-fuel-btn').addEventListener('click', function() {
            const tripId = document.getElementById('select-fillup-trip').value;
            if (tripId && confirm('Are you sure you want to clear all fuel data for this trip?')) {
                clearTripFuelData(tripId);
            }
        });
        
    } catch (error) {
        console.error('Error loading trips for fuel tracking:', error);
    }
}

// Update setupFuelFillUpEventListeners function
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
    
    // Load trips for association
    loadTripsForFuelTracking();
    
    // Load saved fill-ups if any
    loadSavedFillUps();
}

async function calculateLiveTolls() {
    const startLoc = document.getElementById('calc-start-location').value.trim();
    const destLoc = document.getElementById('calc-dest-location').value.trim();
    
    if (!startLoc || !destLoc) {
        showAlert('Please enter both Start and Destination Locations to compute tolls', 'warning');
        return;
    }
    
    const fetchBtn = document.getElementById('fetch-toll-btn');
    const originalHtml = fetchBtn.innerHTML;
    
    try {
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Calculating Tolls & Distance...';
        
        // Geocode addresses to coordinates first to bypass third-party locator bugs
        const startCoords = await geocodeLocation(startLoc);
        const destCoords = await geocodeLocation(destLoc);
        
        if (!startCoords || !destCoords) {
            throw new Error("Could not geocode the start or destination location. Please write a clearer city or address.");
        }

        let isPrimarySuccessful = false;
        let estToll = 0;
        let distanceKm = 0;
        let tollsList = [];
        
        // --- 1. Primary API: India FASTag Route & Toll API (Passenger & Logistics) ---
        try {
            console.log("Attempting primary India FASTag Route & Toll API...");
            const response = await fetch(`https://india-fastag-route-toll-api-passenger-logistics.p.rapidapi.com/calculate_trip?start_lat=${startCoords[1]}&start_lon=${startCoords[0]}&end_lat=${destCoords[1]}&end_lon=${destCoords[0]}&vehicle_type=car`, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': 'india-fastag-route-toll-api-passenger-logistics.p.rapidapi.com',
                    'x-rapidapi-key': '34ccafe310mshf148f560d6be4dbp136221jsn81c8276fabfc'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Primary API responded with status ${response.status}`);
            }
            
            const rawText = await response.text();
            
            // Handle paused space string or HTML error wrapped in response
            if (rawText.includes('space is paused')) {
                throw new Error("Hugging Face Space is paused");
            }
            
            const data = JSON.parse(rawText);
            
            // Parse successful response (dynamic mapping)
            estToll = data.total_toll !== undefined ? data.total_toll :
                      (data.toll !== undefined ? data.toll : 
                       (data.toll_fare !== undefined ? data.toll_fare : 0));
                       
            distanceKm = data.distance !== undefined ? data.distance :
                         (data.total_distance !== undefined ? data.total_distance : 0);
                         
            tollsList = data.tolls || data.toll_plazas || data.plazas || [];
            isPrimarySuccessful = true;
            console.log("Primary API query succeeded!");
            
        } catch (primaryError) {
            console.warn("Primary FASTag API failed, switching to TollGuru fallback:", primaryError);
            showAlert("Primary India FASTag API is offline/paused. Falling back to TollGuru...", "info");
        }
        
        // --- 2. Fallback: TollGuru v2 API ---
        if (!isPrimarySuccessful) {
            // Load Toll API key from user document in Firestore
            let apiKey = null;
            if (auth.currentUser) {
                const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
                if (userDoc.exists) {
                    apiKey = userDoc.data().tollApiKey;
                }
            }
            
            // Fallback to localStorage or use the provided passenger API key
            if (!apiKey) {
                apiKey = localStorage.getItem('travelmate_toll_api_key') || '34ccafe310mshf148f560d6be4dbp136221jsn81c8276fabfc';
            }
            
            console.log("Querying fallback TollGuru API...");
            const response = await fetch('https://tollguru.p.rapidapi.com/v2/origin-destination-waypoints', {
                method: 'POST',
                headers: {
                    'x-rapidapi-host': 'tollguru.p.rapidapi.com',
                    'x-rapidapi-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: { lat: startCoords[1], lng: startCoords[0] },
                    to: { lat: destCoords[1], lng: destCoords[0] },
                    vehicle: { type: '2AxlesAuto' }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Fallback TollGuru API request failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.routes || data.routes.length === 0) {
                throw new Error("No routes found between these locations on Tollguru.");
            }
            
            const route = data.routes[0];
            
            // Parse Tollguru v2 costs structure safely
            estToll = route.costs ? 
                (route.costs.toll !== undefined ? route.costs.toll : 
                 (route.costs.tag !== undefined ? route.costs.tag : 
                  (route.costs.cash !== undefined ? route.costs.cash : 0))) 
                : 0;
                
            // Parse summary distance
            if (route.summary && route.summary.distance) {
                const distVal = route.summary.distance.value !== undefined ? route.summary.distance.value : route.summary.distance;
                distanceKm = distVal > 1000 ? (distVal / 1000) : distVal;
            }
            
            tollsList = route.tolls || [];
        }
        
        // Update input fields automatically
        if (estToll > 0) {
            document.getElementById('toll-cost').value = Math.round(estToll);
        }
        if (distanceKm > 0) {
            document.getElementById('trip-distance').value = Math.round(distanceKm);
        }
        
        // Build and display Toll details card
        const cardEl = document.getElementById('toll-calculator-card');
        const contentEl = document.getElementById('toll-calculator-content');
        
        if (cardEl && contentEl) {
            cardEl.style.display = 'block';
            
            let tollsHtml = '';
            if (tollsList.length > 0) {
                tollsHtml = `
                    <div class="table-responsive mt-3">
                        <table class="table table-sm table-striped mb-0" style="font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th>Toll Plaza Name</th>
                                    <th class="text-end">Fare (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tollsList.map(t => {
                                    const name = t.name || t.plaza_name || 'Toll Plaza';
                                    const price = t.price !== undefined ? t.price : (t.toll !== undefined ? t.toll : 0);
                                    return `
                                        <tr>
                                            <td><i class="fas fa-barcode text-primary me-1"></i>${name}</td>
                                            <td class="text-end fw-bold text-success">₹${parseFloat(price).toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                tollsHtml = '<div class="alert alert-info mt-3 py-2 px-3 small">No toll plazas detected on this route. Enjoy a toll-free trip!</div>';
            }
            
            const apiSourceBadge = isPrimarySuccessful ? 
                '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>India FASTag API</span>' :
                '<span class="badge bg-warning text-dark"><i class="fas fa-exclamation-triangle me-1"></i>TollGuru Fallback</span>';
                
            contentEl.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <small class="text-muted d-block font-monospace">ROUTE: ${startLoc.toUpperCase()} ➡️ ${destLoc.toUpperCase()}</small>
                        <span class="fs-5 fw-bold text-primary">₹${parseFloat(estToll).toFixed(2)}</span>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-info d-block mb-1"><i class="fas fa-road me-1"></i>${Math.round(distanceKm)} km</span>
                        ${apiSourceBadge}
                    </div>
                </div>
                <div class="small text-muted mb-2">
                    <i class="fas fa-circle-info text-primary me-1"></i>Tolls have been automatically applied to the cost calculator summary.
                </div>
                ${tollsHtml}
            `;
        }
        
        // Trigger recalculation of the whole page costs
        calculateAllCosts();
        showAlert(isPrimarySuccessful ? 'Toll costs calculated successfully via India FASTag API!' : 'Toll costs calculated successfully via fallback!', 'success');
        
    } catch (e) {
        console.error('Toll calculation error:', e);
        showAlert(e.message || 'Failed to fetch live toll data', 'danger');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalHtml;
    }
}
