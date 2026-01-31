// Utility functions
function navigateTo(page) {
    window.location.href = page;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

function generateTripCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showLoading(element) {
    element.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading...</div>';
}

function hideLoading(element, content) {
    element.innerHTML = content;
}

// Store trip data for navigation
function setCurrentTrip(trip) {
    sessionStorage.setItem('currentTrip', JSON.stringify(trip));
}

function getCurrentTrip() {
    const trip = sessionStorage.getItem('currentTrip');
    return trip ? JSON.parse(trip) : null;
}

function clearCurrentTrip() {
    sessionStorage.removeItem('currentTrip');
}

// Validation functions
function validateLocation(location) {
    return location && location.trim().length > 2;
}

function validateDates(startDate, endDate) {
    return new Date(startDate) <= new Date(endDate);
}

// Real OpenRouteService API integration
async function calculateRealDistance(startLocation, destination) {
    try {
        console.log('Calculating route:', startLocation, '→', destination);
        
        // Geocode both locations
        const startCoords = await geocodeLocation(startLocation);
        const destCoords = await geocodeLocation(destination);
        
        console.log('Coordinates:', startCoords, destCoords);
        
        // Calculate route using OpenRouteService
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [startCoords, destCoords],
                format: 'json'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distance = (route.summary.distance / 1000).toFixed(1);
            const duration = formatDuration(route.summary.duration);
            
            return {
                distance: `${distance} km`,
                duration: duration,
                coordinates: {
                    start: startCoords,
                    destination: destCoords
                },
                rawData: data
            };
        } else {
            throw new Error('No route found');
        }
        
    } catch (error) {
        console.error('OpenRouteService API error:', error);
        console.log('Falling back to simulated distance calculation...');
        return calculateSimulatedDistance(startLocation, destination);
    }
}

async function geocodeLocation(locationName) {
    try {
        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(locationName)}`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // [longitude, latitude]
        }
        throw new Error('Location not found');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

function calculateSimulatedDistance(start, destination) {
    // Fallback simulation when API fails
    const baseDistance = 350;
    const randomVariation = Math.random() * 200 - 100;
    const distance = Math.max(50, baseDistance + randomVariation);
    const hours = distance / 80;
    const totalMinutes = Math.round(hours * 60);
    
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    let duration;
    if (hoursPart > 0) {
        duration = `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    } else {
        duration = `${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    }
    
    return {
        distance: `${distance.toFixed(1)} km`,
        duration: duration,
        simulated: true
    };
}

// Utility functions for duration conversion
function parseDurationToMinutes(durationString) {
    if (!durationString) return 0;
    
    // Convert "X hours Y minutes" to total minutes
    const hoursMatch = durationString.match(/(\d+)\s*hour/);
    const minutesMatch = durationString.match(/(\d+)\s*minute/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    
    return hours * 60 + minutes;
}

function formatMinutesToDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

// Add function to generate settlement actions
function generateSettlementActions(equalizationData) {
    const settlementSection = document.getElementById('quick-settlement-section');
    const settlementActions = document.getElementById('settlement-actions');
    
    if (equalizationData.transactions.length === 0) {
        settlementSection.style.display = 'none';
        return;
    }
    
    settlementSection.style.display = 'block';
    
    settlementActions.innerHTML = equalizationData.transactions.map((transaction, index) => {
        const currentUser = auth.currentUser;
        const involvesCurrentUser = transaction.from === 'You' || transaction.to === 'You';
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 ${involvesCurrentUser ? 'border-warning' : ''}">
                    <div class="card-body">
                        <div class="text-center mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="text-start">
                                    <small class="text-muted">From</small>
                                    <div class="fw-bold ${transaction.from === 'You' ? 'text-danger' : ''}">${transaction.from}</div>
                                </div>
                                <div class="px-3">
                                    <i class="fas fa-arrow-right text-primary"></i>
                                </div>
                                <div class="text-end">
                                    <small class="text-muted">To</small>
                                    <div class="fw-bold ${transaction.to === 'You' ? 'text-success' : ''}">${transaction.to}</div>
                                </div>
                            </div>
                            <h4 class="text-primary my-2">
                                <span class="rupee-symbol">₹</span>${transaction.amount.toFixed(2)}
                            </h4>
                        </div>
                        
                        ${involvesCurrentUser ? `
                            <div class="alert ${transaction.to === 'You' ? 'alert-success' : 'alert-warning'} py-2 mb-3">
                                <small>
                                    <i class="fas ${transaction.to === 'You' ? 'fa-arrow-circle-down' : 'fa-arrow-circle-up'} me-1"></i>
                                    ${transaction.to === 'You' ? 'You will receive this amount' : 'You need to pay this amount'}
                                </small>
                            </div>
                        ` : ''}
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary btn-sm mark-settled-btn" data-transaction-index="${index}">
                                <i class="fas fa-check me-1"></i>Mark as Settled
                            </button>
                            <button class="btn btn-outline-info btn-sm remind-btn" data-transaction="${JSON.stringify(transaction).replace(/"/g, '&quot;')}">
                                <i class="fas fa-bell me-1"></i>Set Reminder
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for settlement actions
    document.querySelectorAll('.mark-settled-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-transaction-index');
            markTransactionAsSettled(index);
        });
    });
    
    document.querySelectorAll('.remind-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const transaction = JSON.parse(this.getAttribute('data-transaction'));
            setSettlementReminder(transaction);
        });
    });
    
    // Add share functionality
    document.getElementById('share-settlement-btn').addEventListener('click', () => {
        shareSettlementPlan(equalizationData);
    });
    
    document.getElementById('save-settlement-btn').addEventListener('click', () => {
        saveSettlementAsPDF(equalizationData);
    });
}

// Mark transaction as settled
function markTransactionAsSettled(transactionIndex) {
    // Store in localStorage for persistence
    const settledTransactions = JSON.parse(localStorage.getItem('settledTransactions') || '{}');
    settledTransactions[transactionIndex] = new Date().toISOString();
    localStorage.setItem('settledTransactions', JSON.stringify(settledTransactions));
    
    showAlert('Transaction marked as settled!', 'success');
    
    // Reload the data to reflect changes
    setTimeout(() => {
        calculateAndDisplayMemberExpenditure(userTrips);
    }, 1000);
}

// Set settlement reminder
function setSettlementReminder(transaction) {
    const reminderDate = prompt(`Set reminder date for settlement between ${transaction.from} and ${transaction.to} (YYYY-MM-DD):`, 
        new Date().toISOString().split('T')[0]);
    
    if (reminderDate) {
        const reminders = JSON.parse(localStorage.getItem('settlementReminders') || '[]');
        reminders.push({
            transaction,
            reminderDate,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('settlementReminders', JSON.stringify(reminders));
        
        showAlert(`Reminder set for ${reminderDate}`, 'info');
    }
}

// Share settlement plan
function shareSettlementPlan(equalizationData) {
    let shareText = `🚗 TravelMate Settlement Plan\n\n`;
    shareText += `Total Expenses: ₹${equalizationData.totalExpenses.toFixed(2)}\n`;
    shareText += `Average per person: ₹${equalizationData.averagePerPerson.toFixed(2)}\n\n`;
    shareText += `Settlement Transactions:\n\n`;
    
    equalizationData.transactions.forEach((transaction, index) => {
        shareText += `${index + 1}. ${transaction.from} → ${transaction.to}: ₹${transaction.amount.toFixed(2)}\n`;
    });
    
    shareText += `\nGenerated on ${new Date().toLocaleDateString()}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'TravelMate Settlement Plan',
            text: shareText
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showAlert('Settlement plan copied to clipboard!', 'success');
        });
    }
}

// Save as PDF (simplified version)
function saveSettlementAsPDF(equalizationData) {
    showAlert('PDF export feature would be implemented here!', 'info');
    // In a real implementation, you would use a library like jsPDF
    // This is a placeholder for the PDF functionality
}

// Add these functions to utils.js
function setAuthRedirectFlag() {
    sessionStorage.setItem('authRedirectChecked', 'true');
}

function hasAuthRedirectBeenChecked() {
    return sessionStorage.getItem('authRedirectChecked') === 'true';
}

function clearAuthRedirectFlag() {
    sessionStorage.removeItem('authRedirectChecked');
}

// Update navigateTo function to handle auth redirects
function navigateTo(page) {
    // Clear redirect flag when navigating away from auth page
    if (page !== 'auth.html') {
        clearAuthRedirectFlag();
    }
    window.location.href = page;
}

// Global Theme Setup
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const navbar = document.querySelector('.navbar');
    const icon = themeToggle ? themeToggle.querySelector('i') : null;

    // Function to apply theme
    const applyTheme = (isDark) => {
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
            if (navbar) {
                navbar.classList.remove('navbar-light');
                navbar.classList.add('navbar-dark');
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
            if (navbar) {
                navbar.classList.remove('navbar-dark');
                navbar.classList.add('navbar-light');
            }
        }
    };

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    // Event listener for toggle button
    if (themeToggle) {
        // Clone to remove existing listeners if any
        const newToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newToggle, themeToggle);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isDark = !document.body.classList.contains('dark-mode');
            applyTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // Listen for system preference changes if no manual override
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches);
            }
        });
    }
}
