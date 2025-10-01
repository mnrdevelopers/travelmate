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
// PROPER Geocoding function - FIXED for Indian cities
async function geocodeLocation(location) {
    try {
        console.log('🔍 Geocoding location:', location);
        
        // Map common Indian cities to their proper names with states
        const cityMappings = {
            'nizamabad': 'Nizamabad, Telangana, India',
            'goa': 'Goa, India',
            'mumbai': 'Mumbai, Maharashtra, India',
            'delhi': 'New Delhi, Delhi, India',
            'bangalore': 'Bangalore, Karnataka, India',
            'chennai': 'Chennai, Tamil Nadu, India',
            'kolkata': 'Kolkata, West Bengal, India',
            'hyderabad': 'Hyderabad, Telangana, India',
            'pune': 'Pune, Maharashtra, India'
        };
        
        // Use mapped location if available, otherwise use the original
        const normalizedLocation = location.toLowerCase().trim();
        const searchLocation = cityMappings[normalizedLocation] || (location + ', India');
        
        console.log('🎯 Searching for:', searchLocation);
        
        const searchQuery = encodeURIComponent(searchLocation);
        const url = `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${searchQuery}&boundary.country=IND&size=5`;
        
        console.log('🌐 Geocoding URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Geocoding found', data.features?.length, 'features');
        
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
            
            // Select the best feature - prefer localities and regions with high confidence
            let bestFeature = data.features[0];
            let bestScore = 0;
            
            for (const feature of data.features) {
                const props = feature.properties;
                let score = props.confidence || 0;
                
                // Score different layer types
                if (props.layer === 'locality') score += 100;      // Cities, towns
                if (props.layer === 'region') score += 90;         // States, provinces
                if (props.layer === 'city') score += 100;          // Major cities
                if (props.layer === 'county') score += 70;         // Districts
                if (props.layer === 'neighborhood') score -= 50;   // Avoid neighborhoods
                if (props.layer === 'venue') score -= 100;         // Avoid specific venues
                if (props.layer === 'address') score -= 150;       // Avoid specific addresses
                
                // Penalize low confidence results
                if (props.confidence < 0.7) score -= 50;
                
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
                coordinates: coordinates,
                longitude: coordinates[0],
                latitude: coordinates[1]
            });
            
            // Validate coordinates are reasonable for India
            const lon = coordinates[0];
            const lat = coordinates[1];
            
           // India roughly spans 68–98E and 6–37N
if (lon < 68 || lon > 98 || lat < 6 || lat > 37) {
    console.warn('⚠️ Coordinates outside India bounds:', lon, lat);
                // Try to find a better feature within India bounds
                for (const feature of data.features) {
                    const coords = feature.geometry.coordinates;
                    if (coords[0] >= 68 && coords[0] <= 97 && coords[1] >= 8 && coords[1] <= 37) {
                        console.log('🔄 Found better feature within India bounds');
                        bestFeature = feature;
                        break;
                    }
                }
            }
            
            return {
                longitude: bestFeature.geometry.coordinates[0],
                latitude: bestFeature.geometry.coordinates[1],
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

// PROPER Distance calculation - FIXED
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
        
        // Validate we got proper coordinates within India
        if (!startCoords || !destCoords) {
            throw new Error('Could not get coordinates for both locations');
        }
        
        // Validate coordinates are within India
        const isWithinIndia = (lon, lat) => lon >= 68 && lon <= 97 && lat >= 8 && lat <= 37;
        
        if (!isWithinIndia(startCoords.longitude, startCoords.latitude)) {
            throw new Error(`Start location coordinates (${startCoords.longitude}, ${startCoords.latitude}) are not within India`);
        }
        
        if (!isWithinIndia(destCoords.longitude, destCoords.latitude)) {
            throw new Error(`Destination coordinates (${destCoords.longitude}, ${destCoords.latitude}) are not within India`);
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
        
        console.log('📦 Route request:', JSON.stringify(requestBody, null, 2));
        
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
            
            if (response.status === 404) {
                throw new Error('No drivable route found between these locations. The coordinates might be in remote areas.');
            }
            throw new Error(`Route calculation failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Route calculation successful');
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found between these locations');
        }
        
        const route = data.routes[0];
        const distanceInMeters = route.summary.distance;
        const distanceInKm = (distanceInMeters / 1000).toFixed(1);
        const duration = formatDuration(route.summary.duration);
        
        console.log('✅ Route calculated successfully:', { 
            distance: distanceInKm + ' km',
            duration: duration
        });
        
        return { 
            distance: `${distanceInKm} km`, 
            duration: duration,
            coordinates: {
                start: [startCoords.longitude, startCoords.latitude],
                destination: [destCoords.longitude, destCoords.latitude]
            }
        };
        
    } catch (error) {
        console.error('❌ Route calculation error:', error);
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
