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

// ─────────────────────────────────────────────────────────────────────────────
// AI-POWERED LEG DISTANCE CALCULATOR  (uses OpenRouter free models)
// Returns an array of leg km values (one per leg). Falls back to null on error.
// ─────────────────────────────────────────────────────────────────────────────

// Same priority list as dashboard.js — openrouter/free always picks a working
// free model, specific models below are fallbacks only.
const OR_FREE_MODELS_DISTANCE = [
    'openrouter/free',                            // OpenRouter's official free auto-router
    'tencent/hy3:free',                          // Tencent Hy3 free model
    'poolside/laguna-xs-2.1:free',                // Poolside Laguna free model
    'cohere/north-mini-code:free',                // Cohere North Mini Code free model
    'nvidia/nemotron-3-ultra-550b-a55b:free'      // NVIDIA Nemotron Ultra free model
];

async function getAILegDistancesGroq(places, apiKey) {
    if (!apiKey || places.length < 2) return null;
    
    const legs = [];
    for (let i = 0; i < places.length - 1; i++) {
        legs.push(`${places[i]} → ${places[i + 1]}`);
    }
    
    const prompt = `You are a geography expert with precise knowledge of road distances.

For the following route legs, provide the ACTUAL ROAD distance in kilometres (not straight-line).
Reply ONLY with a valid JSON array of numbers — one number per leg — nothing else.

Route legs:
${legs.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Reply format example for 3 legs: [342, 187, 95]
Do NOT add explanations, units, or any text outside the JSON array.`;

    const groqModels = [
        'llama-3.3-70b-versatile',
        'llama3-8b-8192',
        'mixtral-8x7b-32768'
    ];

    for (const model of groqModels) {
        try {
            console.log(`🤖 Trying Groq model for distance calculation: ${model}`);
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 120,
                    temperature: 0.1
                })
            });
            
            if (!response.ok) {
                console.warn(`Groq distance: model ${model} returned ${response.status}, trying next...`);
                continue;
            }
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim() || '';
            
            // Extract JSON array robustly
            const match = text.match(/\[[\d.,\s]+\]/);
            if (!match) { console.warn(`Groq distance: ${model} response not a JSON array:`, text); continue; }
            
            const legDistances = JSON.parse(match[0]);
            if (!Array.isArray(legDistances) || legDistances.length !== legs.length) {
                console.warn(`Groq distance: ${model} returned wrong count:`, legDistances.length, 'expected', legs.length);
                continue;
            }
            
            // Validate plausible values
            const allValid = legDistances.every(d => typeof d === 'number' && d > 0 && d < 5000);
            if (!allValid) { console.warn(`Groq distance: ${model} returned implausible values:`, legDistances); continue; }
            
            console.log(`✅ Groq leg distances (${model}):`, legDistances, 'for', places);
            return legDistances;
        } catch (e) {
            console.warn(`Groq distance model ${model} error:`, e.message);
        }
    }
    return null;
}

async function getAILegDistances(places) {
    let apiKey = window._openrouterApiKey;
    if (!apiKey) {
        apiKey = await loadOpenRouterKeyShared();
    }
    // Check if we should fall straight to Groq if OpenRouter API key is missing but Groq is available
    if (!apiKey && window._groqApiKey) {
        console.log('🤖 OpenRouter key missing. Directing to Groq for distance calculation...');
        return await getAILegDistancesGroq(places, window._groqApiKey);
    }
    if (!apiKey || places.length < 2) return null;
    
    const legs = [];
    for (let i = 0; i < places.length - 1; i++) {
        legs.push(`${places[i]} → ${places[i + 1]}`);
    }
    
    const prompt = `You are a geography expert with precise knowledge of road distances.

For the following route legs, provide the ACTUAL ROAD distance in kilometres (not straight-line).
Reply ONLY with a valid JSON array of numbers — one number per leg — nothing else.

Route legs:
${legs.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Reply format example for 3 legs: [342, 187, 95]
Do NOT add explanations, units, or any text outside the JSON array.`;
    let preferredModel = window._openrouterModel || 'auto';
    if (preferredModel === 'custom' && window._openrouterCustomModel) {
        preferredModel = window._openrouterCustomModel;
    }
    
    const modelsToTry = [...OR_FREE_MODELS_DISTANCE];
    if (preferredModel && preferredModel !== 'auto') {
        modelsToTry.unshift(preferredModel);
    }
    
    for (const model of modelsToTry) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'TravelMate AI Distance'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 120,
                    temperature: 0.1
                })
            });
            
            if (!response.ok) {
                console.warn(`AI distance: model ${model} returned ${response.status}, trying next...`);
                continue;
            }
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim() || '';
            
            // Extract JSON array robustly
            const match = text.match(/\[[\d.,\s]+\]/);
            if (!match) { console.warn(`${model} response not a JSON array:`, text); continue; }
            
            const legDistances = JSON.parse(match[0]);
            if (!Array.isArray(legDistances) || legDistances.length !== legs.length) {
                console.warn(`${model} returned wrong count:`, legDistances.length, 'expected', legs.length);
                continue;
            }
            
            // Validate plausible values
            const allValid = legDistances.every(d => typeof d === 'number' && d > 0 && d < 5000);
            if (!allValid) { console.warn(`${model} returned implausible values:`, legDistances); continue; }
            
            console.log(`✅ AI leg distances (${model}):`, legDistances, 'for', places);
            return legDistances;
            
        } catch (e) {
            console.warn(`AI distance model ${model} error:`, e.message);
        }
    }
    
    // Fallback to Groq if OpenRouter failed but Groq is configured
    if (window._groqApiKey) {
        console.warn('OpenRouter distance calculation failed. Trying Groq fallback...');
        const groqLegs = await getAILegDistancesGroq(places, window._groqApiKey);
        if (groqLegs) return groqLegs;
    }
    
    console.warn('All AI distance models failed, falling back to Haversine.');
    return null;
}


// Real OpenRouteService API integration with stops support
async function calculateRealDistance(startLocation, destination, stops = []) {
    try {
        console.log('Calculating route with stops:', startLocation, '→', stops, '→', destination);
        
        // Geocode start, stops, and destination
        const startCoords = await geocodeLocation(startLocation);
        const destCoords = await geocodeLocation(destination);
        
        const coordsList = [startCoords];
        
        for (const stop of stops) {
            if (stop && stop.trim().length > 2) {
                try {
                    const stopCoords = await geocodeLocation(stop);
                    coordsList.push(stopCoords);
                } catch (e) {
                    console.warn(`Could not geocode waypoint: ${stop}`, e);
                }
            }
        }
        
        coordsList.push(destCoords);
        
        console.log('Coordinates list for route:', coordsList);
        
        // Calculate route using OpenRouteService
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: coordsList,
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
            
            // Calculate stops segment distances
            let startCoords = [78.37, 17.45];
            let destCoords = [78.48, 17.38];
            try { startCoords = await geocodeLocation(startLocation); } catch(e){}
            try { destCoords = await geocodeLocation(destination); } catch(e){}
            
            const stopsDistances = [];
            let accumDistance = 0;
            let prevLat = startCoords[1];
            let prevLon = startCoords[0];
            
            for (const stop of stops) {
                try {
                    const stopCoords = await geocodeLocation(stop);
                    const d = calculateHaversineDistance(prevLat, prevLon, stopCoords[1], stopCoords[0]);
                    accumDistance += d;
                    stopsDistances.push(parseFloat(accumDistance.toFixed(1)));
                    prevLat = stopCoords[1];
                    prevLon = stopCoords[0];
                } catch (e) {
                    accumDistance += 100;
                    stopsDistances.push(parseFloat(accumDistance.toFixed(1)));
                }
            }
            
            const finalLeg = calculateHaversineDistance(prevLat, prevLon, destCoords[1], destCoords[0]);
            accumDistance += finalLeg;
            const pathTotalHaversine = accumDistance || 1;
            
            const realTotalKm = parseFloat(distance) || 0;
            const scaledStopsDistances = stopsDistances.map(d => {
                const ratio = d / pathTotalHaversine;
                return parseFloat((realTotalKm * ratio).toFixed(1));
            });
            
            return {
                distance: `${distance} km`,
                duration: duration,
                stopsDistances: scaledStopsDistances
            };
        } else {
            throw new Error('No route found');
        }
        
    } catch (error) {
        console.error('OpenRouteService API error:', error);
        console.log('Falling back to simulated multi-stop distance calculation...');
        return calculateSimulatedMultiStopRoute(startLocation, destination, stops);
    }
}

async function calculateSimulatedMultiStopRoute(start, destination, stops = []) {
    const allPlaces = [start, ...stops, destination];
    
    let startCoords = [78.37, 17.45];
    let destCoords = [78.48, 17.38];
    try { startCoords = await geocodeLocation(start); } catch(e){}
    try { destCoords = await geocodeLocation(destination); } catch(e){}
    
    const coordsList = [startCoords];
    for (const stop of stops) {
        try {
            const c = await geocodeLocation(stop);
            coordsList.push(c);
        } catch(e) {
            const last = coordsList[coordsList.length - 1];
            coordsList.push([last[0] + 0.5, last[1] + 0.5]);
        }
    }
    coordsList.push(destCoords);
    
    // Try AI distances first
    let aiLegDistances = null;
    if (window._openrouterApiKey) {
        aiLegDistances = await getAILegDistances(allPlaces);
    }
    
    const legDistances = [];  // km per leg
    for (let i = 0; i < coordsList.length - 1; i++) {
        let legKm;
        if (aiLegDistances) {
            legKm = aiLegDistances[i];
        } else {
            legKm = calculateHaversineDistance(
                coordsList[i][1], coordsList[i][0],
                coordsList[i+1][1], coordsList[i+1][0]
            ) * 1.25; // 25% circuity factor
            if (legKm < 20) legKm = 50;
        }
        legDistances.push(legKm);
    }
    
    const totalDistance = legDistances.reduce((a, b) => a + b, 0);
    
    // Build cumulative stops distances (not including the final destination leg)
    const simulatedStopsDistances = [];
    let accum = 0;
    for (let i = 0; i < stops.length; i++) {
        accum += legDistances[i];
        simulatedStopsDistances.push(parseFloat(accum.toFixed(1)));
    }
    
    const totalMinutes = Math.round((totalDistance / 70) * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    const duration = hoursPart > 0 ? `${hoursPart} hours ${minutesPart} mins` : `${minutesPart} mins`;
    
    return {
        distance: `${totalDistance.toFixed(1)} km`,
        duration: duration,
        simulated: !aiLegDistances,
        aiEnhanced: !!aiLegDistances,
        stopsDistances: simulatedStopsDistances
    };
}

async function geocodeLocation(locationName) {
    try {
        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(locationName)}`
        );
        if (!response.ok) {
            throw new Error(`ORS geocoding request failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // [longitude, latitude]
        }
        throw new Error('Location not found in ORS');
    } catch (error) {
        console.warn('OpenRouteService geocoding failed, trying Nominatim fallback...', error);
        try {
            // Sleep to respect Nominatim rate limit (1 request/second)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Nominatim OpenStreetMap Geocoding (Free, no API key needed)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationName)}`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );
            if (!response.ok) {
                throw new Error(`Nominatim request failed with status: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.length > 0) {
                // Nominatim returns lat, lon as strings
                const lon = parseFloat(data[0].lon);
                const lat = parseFloat(data[0].lat);
                console.log(`Nominatim successfully geocoded "${locationName}" to coordinates: [${lon}, ${lat}]`);
                return [lon, lat]; // Return in [lon, lat] format to match ORS
            }
            throw new Error('Location not found in Nominatim');
        } catch (nomError) {
            console.error('Nominatim geocoding also failed:', nomError);
            throw nomError;
        }
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

// Carbon Footprint Calculations
function getEmissionFactor(transportMode, fuelType = null) {
    // Returns kg CO2 per km
    switch(transportMode) {
        case 'car':
            if (fuelType === 'electric') return 0.03;
            if (fuelType === 'cng') return 0.09;
            if (fuelType === 'diesel') return 0.13;
            return 0.12; // default car/petrol
        case 'flight':
            return 0.25;
        case 'train':
            return 0.03;
        case 'bus':
            return 0.07;
        case 'public':
            return 0.05;
        default:
            return 0.10;
    }
}

function calculateTripCarbon(trip) {
    if (!trip.route || !trip.route.distance) {
        return { emissions: 0, saved: 0, distance: 0 };
    }
    
    const distanceStr = trip.route.distance;
    const distance = parseFloat(distanceStr.replace(/[^\d.]/g, '')) || 0;
    if (distance <= 0) return { emissions: 0, saved: 0, distance: 0 };
    
    // Determine fuel type if it's a car trip and vehicle info is stored
    let fuelType = null;
    if (trip.transportMode === 'car' && trip.expenses) {
        const hasEv = trip.expenses.some(e => e.description.toLowerCase().includes('ev') || e.description.toLowerCase().includes('electric'));
        const hasCng = trip.expenses.some(e => e.description.toLowerCase().includes('cng'));
        if (hasEv) fuelType = 'electric';
        else if (hasCng) fuelType = 'cng';
    }
    
    const factor = getEmissionFactor(trip.transportMode, fuelType);
    const emissions = distance * factor;
    
    // Carbon saved compared to flight or solo driving (alternative is standard single-driver car/flight of 0.18 kg CO2/km)
    let saved = 0;
    const baseAlternativeFactor = 0.18;
    
    if (factor < baseAlternativeFactor) {
        saved = distance * (baseAlternativeFactor - factor);
    }
    
    return {
        emissions: parseFloat(emissions.toFixed(1)),
        saved: parseFloat(saved.toFixed(1)),
        distance
    };
}

function getLeafRating(emissions) {
    if (emissions === 0) return { rating: 'N/A', class: 'text-muted', icon: 'fa-leaf', desc: 'No route calculated' };
    if (emissions <= 20) return { rating: 'A+ Eco Champion', class: 'text-success', icon: 'fa-leaf', desc: 'Minimal emissions!' };
    if (emissions <= 50) return { rating: 'A Very Green', class: 'text-success', icon: 'fa-leaf', desc: 'Very low footprint.' };
    if (emissions <= 120) return { rating: 'B Eco Friendly', class: 'text-success', icon: 'fa-seedling', desc: 'Reasonable travel footprint.' };
    if (emissions <= 250) return { rating: 'C Moderate', class: 'text-warning', icon: 'fa-seedling', desc: 'Moderate emissions.' };
    if (emissions <= 500) return { rating: 'D High', class: 'text-danger', icon: 'fa-cloud', desc: 'Heavy emissions. Consider offsets.' };
    return { rating: 'E Carbon Heavy', class: 'text-danger', icon: 'fa-cloud', desc: 'Very high emissions. Travel responsibly.' };
}

// Default profile avatar fallback
function getDefaultAvatar(name) {
    // Always use the clean external URL service — no inline SVG in src attributes
    // which can break HTML when quotes inside SVG aren't escaped
    const safeName = (name || 'User').replace(/[<>&"]/g, '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=2d6a4f&color=fff&size=128&bold=true&rounded=true`;
}

function getSafeAvatarUrl(url, name) {
    if (!url) return getDefaultAvatar(name);
    if (url.startsWith('data:image/svg+xml')) {
        // Double quotes are unsafe in HTML src="..." double quoted attribute
        // Replace all double quotes with single quotes
        return url.replace(/"/g, "'");
    }
    return url;
}


// Hook error listener and set fallback avatar
function setupAvatarFallback(imgElement, name = '') {
    if (!imgElement) return;
    
    const fallbackUrl = getDefaultAvatar(name || 'User');
    
    imgElement.onerror = function() {
        if (imgElement.src !== fallbackUrl) {
            imgElement.src = fallbackUrl;
        }
        imgElement.onerror = null;
    };
    
    // Immediately fallback if src is missing, broken, or contains 'undefined'
    const src = imgElement.getAttribute('src');
    if (!src || src.includes('undefined') || src === window.location.href || src === '') {
        imgElement.src = fallbackUrl;
    } else if (imgElement.complete && imgElement.naturalWidth === 0) {
        imgElement.src = fallbackUrl;
    }
}

// Automatically scan for user-avatar elements once DOM loads
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img.user-avatar, .user-avatar img').forEach(img => {
        setupAvatarFallback(img, img.alt || 'Traveler');
    });
});

// Global list of premium default eco-friendly avatars
const ECO_AVATARS = [
    { id: 'avatar-leaf', name: 'Eco Leaf', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232d6a4f'><path d='M17 8C8 10 5.9 16.17 5.1 19c2.83-.8 9-2.9 11-11.9zm0 0c.9-2.83.8-9-8.2-11-2 9 6.17 11 8.2 11z'/></svg>" },
    { id: 'avatar-mountain', name: 'Mountain', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2340916c'><path d='M14 6l-3.75 5 2.85 3.8-1.6 1.2L6.3 9.5 2 15h20L14 6zm-8 7.5L8.5 10l2.5 3.5H6z'/></svg>" },
    { id: 'avatar-tree', name: 'Tree', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2352b788'><path d='M12 2L4 12h3v8h10v-8h3L12 2zm1 16h-2v-4h2v4zm-1-6.5c-1.38 0-2.5-1.12-2.5-2.5S9.62 6.5 11 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/></svg>" },
    { id: 'avatar-globe', name: 'Globe', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231b4332'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z'/></svg>" },
    { id: 'avatar-camp', name: 'Campfire', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffb703'><path d='M17.16 11.3c-.66-.66-1.54-1.1-2.51-1.25V5.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4.55c-.97.15-1.85.59-2.51 1.25L4.54 15.9c-.66.66-.66 1.74 0 2.41s1.74.66 2.41 0l3.05-3.05V18.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-3.24l3.05 3.05c.66.66 1.74.66 2.41 0s.66-1.74 0-2.41l-4.6-4.6z'/></svg>" },
    { id: 'avatar-bike', name: 'Bicycle', value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23219ebc'><path d='M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm14-8.5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm-6.2-7.5l-2.4-3.6H9.2v4H11v-2.3l1.8 2.7h1.4z'/></svg>" }
];


// Calculate distance between two coordinates in km using Haversine formula
// Calculate distance between two coordinates in km using Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Register PWA Service Worker for offline support and instant updates
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(reg => {
            console.log('ServiceWorker registration successful:', reg);
            
            // Check for service worker updates periodically
            if (reg.update) {
                reg.update();
                setInterval(() => {
                    reg.update();
                    console.log('Checking for ServiceWorker updates...');
                }, 60 * 1000); // Check every minute
            }
            
            // Listen for new worker updates being found
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                if (installingWorker) {
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New updates were detected and cached in background
                                showUpdateToast();
                            }
                        }
                    };
                }
            };
        })
        .catch(err => {
            console.error('ServiceWorker registration failed:', err);
        });
    });
    
    // Listen for controlling service worker change and reload immediately to run fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            console.log('New ServiceWorker activated. Refreshing page...');
            window.location.reload();
        }
    });
}

function showUpdateToast() {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-bg-success border-0 position-fixed bottom-0 end-0 m-3 shadow-lg show';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.zIndex = '9999';
    toast.style.borderRadius = '12px';
    
    toast.innerHTML = `
        <div class="d-flex p-2">
            <div class="toast-body d-flex align-items-center">
                <i class="fas fa-arrows-rotate me-2 text-white animate-spin"></i>
                <span>A new update is available for TravelMate!</span>
                <button class="btn btn-light btn-sm ms-3 py-0 px-2 fw-bold" onclick="window.location.reload()" style="border-radius: 8px;">Reload</button>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 12000);
}

function getNextStopStatus(trip, currentKm, totalDistance) {
    if (currentKm === undefined || currentKm === null) {
        currentKm = 0;
    }
    if (!trip.stops || trip.stops.length === 0) {
        if (totalDistance > 0) {
            const remaining = totalDistance - currentKm;
            if (remaining <= 0) return 'Arrived at Destination!';
            return `${remaining.toFixed(0)} km to destination`;
        }
        return '';
    }
    
    // Determine next stop
    if (trip.route?.stopsDistances && trip.route.stopsDistances.length === trip.stops.length) {
        for (let i = 0; i < trip.stops.length; i++) {
            const stopDist = trip.route.stopsDistances[i];
            if (currentKm < stopDist) {
                const remaining = stopDist - currentKm;
                return `Next: ${trip.stops[i]} in ${remaining.toFixed(0)} km`;
            }
        }
    } else {
        // Fallback if stopsDistances is missing (space evenly)
        const stopsCount = trip.stops.length;
        for (let i = 0; i < stopsCount; i++) {
            const pct = ((i + 1) / (stopsCount + 1)) * 100;
            const stopDist = totalDistance * (pct / 100);
            if (currentKm < stopDist) {
                const remaining = stopDist - currentKm;
                return `Next: ${trip.stops[i]} in ${remaining.toFixed(0)} km`;
            }
        }
    }
    
    // If all stops are crossed
    const remainingToDest = totalDistance - currentKm;
    if (remainingToDest <= 0) return 'Arrived at Destination!';
    return `Next: Destination in ${remainingToDest.toFixed(0)} km`;
}

async function calculateAndSaveStopsDistances(trip) {
    if (!trip || !trip.stops || trip.stops.length === 0) return;
    try {
        console.log('Calculating stopsDistances for trip:', trip.id);
        
        const allPlaces = [trip.startLocation, ...trip.stops, trip.destination];
        
        // 1. Try AI distances first (most accurate)
        let aiLegDistances = null;
        if (window._openrouterApiKey) {
            console.log('🤖 Trying AI-powered distance calculation...');
            aiLegDistances = await getAILegDistances(allPlaces);
        }
        
        let routeData;
        let isAiEnhanced = false;
        
        if (aiLegDistances) {
            // Build route data directly from AI leg distances
            const totalDistance = aiLegDistances.reduce((a, b) => a + b, 0);
            const stopsDistances = [];
            let accum = 0;
            for (let i = 0; i < trip.stops.length; i++) {
                accum += aiLegDistances[i];
                stopsDistances.push(parseFloat(accum.toFixed(1)));
            }
            const totalMinutes = Math.round((totalDistance / 70) * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            routeData = {
                distance: `${totalDistance.toFixed(1)} km`,
                duration: h > 0 ? `${h} hours ${m} mins` : `${m} mins`,
                stopsDistances,
                aiEnhanced: true,
                simulated: false
            };
            isAiEnhanced = true;
            console.log('✅ AI distances applied:', stopsDistances);
        } else {
            // 2. Fall back to ORS / Haversine
            routeData = await calculateRealDistance(trip.startLocation, trip.destination, trip.stops);
        }
        
        // Scale stopsDistances to match existing trip total distance if it is set
        const existingDistStr = trip.route?.distance || trip.distance;
        let targetDistance = parseFloat(existingDistStr);
        if (isNaN(targetDistance) || targetDistance <= 0 || isAiEnhanced) {
            targetDistance = parseFloat(routeData.distance);
        }
        
        const calculatedTotal = parseFloat(routeData.distance) || 1;
        const scaledStopsDistances = (routeData.stopsDistances || []).map(d => {
            if (isAiEnhanced) return d; // AI distances are already accurate, no scaling
            const ratio = d / calculatedTotal;
            return parseFloat((targetDistance * ratio).toFixed(1));
        });
        
        const routeObj = {
            distance: targetDistance > 0 ? `${targetDistance.toFixed(1)} km` : routeData.distance,
            duration: routeData.duration,
            stopsDistances: scaledStopsDistances,
            simulated: !!routeData.simulated && !isAiEnhanced,
            aiEnhanced: isAiEnhanced,
            calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('trips').doc(trip.id).update({ route: routeObj });
        trip.route = routeObj;
        
        if (window.userTrips) {
            const index = window.userTrips.findIndex(t => t.id === trip.id);
            if (index !== -1) window.userTrips[index] = trip;
        }
        
        const event = new CustomEvent('tripRouteUpdated', { detail: trip });
        window.dispatchEvent(event);
    } catch (e) {
        console.error('Error calculating background stopsDistances:', e);
    }
}

async function loadOpenRouterKeyShared() {
    try {
        let userData = {};
        if (typeof auth !== 'undefined' && auth.currentUser) {
            const user = auth.currentUser;
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) userData = doc.data();
        }
        
        let sharedData = {};
        try {
            if (typeof db !== 'undefined') {
                const sharedDoc = await db.collection('settings').doc('ai_keys').get();
                if (sharedDoc.exists) sharedData = sharedDoc.data();
            }
        } catch (e) {
            console.warn('Could not read shared AI keys settings in utils:', e);
        }
        
        window._openrouterApiKey = userData.openrouterApiKey || sharedData.openrouterApiKey || '';
        window._groqApiKey = userData.groqApiKey || sharedData.groqApiKey || '';
        window._openrouterModel = userData.openrouterModel || sharedData.openrouterModel || 'auto';
        window._openrouterCustomModel = userData.openrouterCustomModel || sharedData.openrouterCustomModel || '';
        
        return window._openrouterApiKey;
    } catch (e) {
        console.warn('Could not load OpenRouter key in utils:', e);
    }
    return window._openrouterApiKey || null;
}

function initSectionGuides() {
    const guides = document.querySelectorAll('.section-guide-card');
    if (guides.length === 0) return;
    
    let currentLang = localStorage.getItem('travelmate_guide_lang') || 'en';
    
    const langs = [
        { id: 'en', name: 'English' },
        { id: 'hi', name: 'हिन्दी' },
        { id: 'te', name: 'తెలుగు' }
    ];
    
    function updateAllGuides(langId) {
        localStorage.setItem('travelmate_guide_lang', langId);
        currentLang = langId;
        
        document.querySelectorAll('.section-guide-card').forEach(card => {
            card.querySelectorAll('.section-guide-lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === langId);
            });
            
            const contentEl = card.querySelector('.section-guide-content');
            if (contentEl) {
                const text = card.getAttribute(`data-guide-${langId}`) || card.getAttribute('data-guide-en') || '';
                contentEl.innerHTML = `<i class="fas fa-circle-info text-success me-1"></i> ${text}`;
            }
        });
    }
    
    guides.forEach(card => {
        if (card.dataset.initialized) return;
        card.dataset.initialized = 'true';
        
        // Create title row
        const titleRow = document.createElement('div');
        titleRow.className = 'section-guide-title-row';
        titleRow.innerHTML = `
            <span><i class="fas fa-circle-question text-success me-2"></i>Quick Help Guide / मार्गदर्शिका / మార్గదర్శిని</span>
            <i class="fas fa-chevron-down section-guide-toggle-icon"></i>
        `;
        
        // Create collapsible body
        const body = document.createElement('div');
        body.className = 'section-guide-body';
        
        const header = document.createElement('div');
        header.className = 'section-guide-langs';
        
        langs.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = `section-guide-lang-btn ${lang.id === currentLang ? 'active' : ''}`;
            btn.dataset.lang = lang.id;
            btn.textContent = lang.name;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // prevent collapsing when clicking language buttons
                updateAllGuides(lang.id);
            });
            header.appendChild(btn);
        });
        
        const content = document.createElement('p');
        content.className = 'section-guide-content';
        
        body.appendChild(header);
        body.appendChild(content);
        
        card.innerHTML = '';
        card.appendChild(titleRow);
        card.appendChild(body);
        
        // Toggle collapse/expand
        titleRow.addEventListener('click', (e) => {
            e.preventDefault();
            const isExpanded = card.classList.contains('expanded');
            
            // Close other guides
            document.querySelectorAll('.section-guide-card').forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.classList.remove('expanded');
                }
            });
            
            card.classList.toggle('expanded', !isExpanded);
        });
    });
    
    updateAllGuides(currentLang);
}

document.addEventListener('DOMContentLoaded', initSectionGuides);

function decodePolyline(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

async function fetchRouteGeometryCoords(startLocation, destination, stops = []) {
    try {
        const startCoords = await geocodeLocation(startLocation);
        const destCoords = await geocodeLocation(destination);
        const coordsList = [startCoords];
        
        for (const stop of stops) {
            if (stop && stop.trim().length > 2) {
                try {
                    const stopCoords = await geocodeLocation(stop);
                    coordsList.push(stopCoords);
                } catch (e) {}
            }
        }
        coordsList.push(destCoords);
        
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: coordsList,
                format: 'json'
            })
        });
        
        if (!response.ok) throw new Error('Failed to fetch routing geometry');
        
        const data = await response.json();
        if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
            return decodePolyline(data.routes[0].geometry);
        }
    } catch (e) {
        console.error('Error fetching ORS route geometry:', e);
    }
    return null;
}

function getStableMockBalance(tagId) {
    if (!tagId) return 0;
    let hash = 0;
    for (let i = 0; i < tagId.length; i++) {
        hash = tagId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate a balance between 50 and 1500
    const balance = 50 + (Math.abs(hash) % 1450);
    return Math.round(balance * 100) / 100;
}

