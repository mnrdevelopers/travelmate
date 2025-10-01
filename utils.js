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

// Store trip data for navigation
function setCurrentTrip(trip) {
    sessionStorage.setItem('currentTrip', JSON.stringify(trip));
}

function getCurrentTrip() {
    const trip = sessionStorage.getItem('currentTrip');
    return trip ? JSON.parse(trip) : null;
}

// Validation functions
function validateLocation(location) {
    return location && location.trim().length > 2;
}

function validateDates(startDate, endDate) {
    return new Date(startDate) <= new Date(endDate);
}

// PROPER Geocoding function - FIXED
async function geocodeLocation(location) {
    try {
        console.log('🔍 Geocoding location:', location);
        
        // Use proper search with boundary for India
        const searchQuery = encodeURIComponent(location + ', India');
        const url = `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${searchQuery}&boundary.country=IN`;
        
        console.log('🌐 Geocoding URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Geocoding response:', data);
        
        if (data.features && data.features.length > 0) {
            // Log all features to see what we're getting
            data.features.forEach((feature, index) => {
                console.log(`📍 Feature ${index}:`, {
                    name: feature.properties.name,
                    label: feature.properties.label,
                    layer: feature.properties.layer,
                    confidence: feature.properties.confidence,
                    coordinates: feature.geometry.coordinates
                });
            });
            
            // Select the best feature - prefer localities and regions
            let bestFeature = data.features[0];
            let bestScore = 0;
            
            for (const feature of data.features) {
                const props = feature.properties;
                let score = props.confidence || 0;
                
                // Prefer certain layers
                if (props.layer === 'locality') score += 100;
                if (props.layer === 'region') score += 80;
                if (props.layer === 'city') score += 90;
                if (props.layer === 'county') score += 70;
                if (props.layer === 'neighborhood') score -= 50; // Avoid neighborhoods
                if (props.layer === 'venue') score -= 100; // Avoid specific venues
                if (props.layer === 'address') score -= 150; // Avoid specific addresses
                
                if (score > bestScore) {
                    bestScore = score;
                    bestFeature = feature;
                }
            }
            
            const coordinates = bestFeature.geometry.coordinates;
            console.log('✅ Selected best feature:', {
                name: bestFeature.properties.name,
                label: bestFeature.properties.label,
                layer: bestFeature.properties.layer,
                confidence: bestFeature.properties.confidence,
                coordinates: coordinates
            });
            
            return {
                longitude: coordinates[0],
                latitude: coordinates[1],
                name: bestFeature.properties.name,
                label: bestFeature.properties.label,
                type: bestFeature.properties.layer
            };
        } else {
            throw new Error('No results found for location');
        }
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        throw new Error(`Could not find coordinates for "${location}". Please check the location name.`);
    }
}

// PROPER Distance calculation - NO SIMULATION
async function calculateRealDistance(startLocation, destination) {
    try {
        console.log('🚗 Calculating route from:', startLocation, 'to:', destination);
        
        // Geocode both locations
        const [startCoords, destCoords] = await Promise.all([
            geocodeLocation(startLocation),
            geocodeLocation(destination)
        ]);
        
        console.log('📍 Start coordinates:', startCoords);
        console.log('📍 Destination coordinates:', destCoords);
        
        // Validate we got proper coordinates
        if (!startCoords || !destCoords) {
            throw new Error('Could not get coordinates for both locations');
        }
        
        // Calculate route
        const requestBody = {
            coordinates: [
                [startCoords.longitude, startCoords.latitude],
                [destCoords.longitude, destCoords.latitude]
            ],
            instructions: false,
            preference: 'recommended',
            units: 'km'
        };
        
        console.log('📦 Route request:', requestBody);
        
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error response:', errorText);
            throw new Error(`Route calculation failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Route calculation response:', data);
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found between these locations');
        }
        
        const route = data.routes[0];
        const distanceInMeters = route.summary.distance;
        const distanceInKm = (distanceInMeters / 1000).toFixed(1);
        const duration = formatDuration(route.summary.duration);
        
        console.log('✅ Route calculated successfully:', { 
            rawDistance: distanceInMeters + ' meters',
            distance: distanceInKm + ' km',
            duration: duration,
            rawDuration: route.summary.duration + ' seconds'
        });
        
        return { 
            distance: `${distanceInKm} km`, 
            duration: duration,
            coordinates: {
                start: [startCoords.longitude, startCoords.latitude],
                destination: [destCoords.longitude, destCoords.latitude]
            },
            rawData: {
                distance: distanceInMeters,
                duration: route.summary.duration
            }
        };
        
    } catch (error) {
        console.error('❌ Route calculation error:', error);
        // NO SIMULATION - just throw the error
        throw new Error(`Failed to calculate route: ${error.message}`);
    }
}

// Enhanced error handling
function handleRouteCalculationError(error) {
    console.error('Route calculation failed:', error);
    
    if (error.message.includes('geocoding') || error.message.includes('coordinates')) {
        return 'Please check that both locations are valid Indian cities and try again.';
    } else if (error.message.includes('API') || error.message.includes('network')) {
        return 'Route service is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('API key')) {
        return 'Route service configuration error. Please contact support.';
    } else {
        return 'Unable to calculate route. Please verify the locations and try again.';
    }
}
