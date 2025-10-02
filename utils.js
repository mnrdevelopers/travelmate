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
