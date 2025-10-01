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
async function geocodeLocation(location) {
    try {
        console.log('Geocoding location:', location);
        
        const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(location)}`);
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Geocoding response:', data);
        
        if (data.features && data.features.length > 0) {
            const coordinates = data.features[0].geometry.coordinates;
            return {
                longitude: coordinates[0],
                latitude: coordinates[1],
                name: data.features[0].properties.name
            };
        } else {
            throw new Error('No results found for location');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error(`Could not find coordinates for "${location}". Please check the location name.`);
    }
}

async function calculateRealDistance(startLocation, destination) {
    try {
        console.log('Calculating route from:', startLocation, 'to:', destination);
        
        // Geocode both locations to get coordinates
        const [startCoords, destCoords] = await Promise.all([
            geocodeLocation(startLocation),
            geocodeLocation(destination)
        ]);
        
        console.log('Start coordinates:', startCoords);
        console.log('Destination coordinates:', destCoords);
        
        // Validate coordinates
        if (!startCoords || !destCoords) {
            throw new Error('Could not get coordinates for both locations');
        }
        
        // Calculate route using OpenRouteService Directions API
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
            },
            body: JSON.stringify({
                coordinates: [
                    [startCoords.longitude, startCoords.latitude],
                    [destCoords.longitude, destCoords.latitude]
                ],
                instructions: false,
                preference: 'recommended',
                units: 'km'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouteService API error:', response.status, errorText);
            
            if (response.status === 401) {
                throw new Error('API key is invalid or expired');
            } else if (response.status === 400) {
                throw new Error('Invalid location data provided');
            } else {
                throw new Error(`Route calculation failed: ${response.status} ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        console.log('Route calculation response:', data);
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found between these locations');
        }
        
        const route = data.routes[0];
        const distanceInKm = (route.summary.distance / 1000).toFixed(1); // Convert meters to km
        const duration = formatDuration(route.summary.duration);
        
        console.log('Route calculated successfully:', { 
            distance: `${distanceInKm} km`, 
            duration,
            rawDistance: route.summary.distance,
            rawDuration: route.summary.duration
        });
        
        // Validate the calculated distance makes sense
        if (parseFloat(distanceInKm) < 0.1) {
            console.warn('Very short distance calculated, this might indicate an issue');
        }
        
        return { 
            distance: `${distanceInKm} km`, 
            duration,
            coordinates: {
                start: [startCoords.longitude, startCoords.latitude],
                destination: [destCoords.longitude, destCoords.latitude]
            },
            rawData: {
                distance: route.summary.distance,
                duration: route.summary.duration
            }
        };
        
    } catch (error) {
        console.error('Route calculation error:', error);
        
        // Fallback to simulated distance if API fails
        console.log('Falling back to simulated distance calculation...');
        return calculateSimulatedDistance(startLocation, destination);
    }
}

// Fallback simulated distance calculation
function calculateSimulatedDistance(start, destination) {
    // Generate a realistic distance based on location names (fallback)
    const baseDistance = Math.abs(start.length - destination.length) * 50 + 100;
    const randomVariation = Math.random() * 100 - 50;
    const distance = Math.max(50, baseDistance + randomVariation);
    
    // Calculate realistic travel time (assuming average speed of 60 km/h)
    const hours = distance / 60;
    const totalMinutes = Math.round(hours * 60);
    
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    let duration;
    if (hoursPart > 0) {
        duration = `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    } else {
        duration = `${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    }
    
    console.log('Simulated distance calculation:', {
        distance: `${distance.toFixed(1)} km`,
        duration: duration
    });
    
    return {
        distance: `${distance.toFixed(1)} km`,
        duration: duration,
        simulated: true
    };
}

// Enhanced error handling
function handleRouteCalculationError(error) {
    console.error('Route calculation failed:', error);
    
    if (error.message.includes('geocoding') || error.message.includes('coordinates')) {
        return 'Please check that both locations are valid and try again.';
    } else if (error.message.includes('API') || error.message.includes('network')) {
        return 'Route service is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('API key')) {
        return 'Route service configuration error. Please contact support.';
    } else {
        return 'Unable to calculate route. Please verify the locations and try again.';
    }
}

// Additional utility for testing coordinates
function calculateDistanceFromCoords(coord1, coord2) {
    // Haversine formula to calculate distance between two coordinates
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
}
