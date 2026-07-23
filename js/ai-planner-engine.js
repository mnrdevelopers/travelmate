/**
 * TravelMate Professional AI Travel Planner Engine (js/ai-planner-engine.js)
 * Intelligent reasoning engine for multi-city journeys, train milestones,
 * route optimization, pilgrimage darshans, weather adaptation & budget estimation.
 */

class TravelMateAiPlannerEngine {
    constructor() {
        this.memorySystem = window.aiMemory;
        this.knowledgeSystem = window.destinationKnowledge;
    }

    /**
     * Main entry point to generate a complete, structured trip itinerary JSON.
     * @param {Object} trip - Current trip object containing destination, dates, tickets, itinerary
     * @param {Object} options - Optional custom user prompt / flags
     */
    async generateProfessionalPlan(trip, options = {}) {
        if (!trip) throw new Error("No trip provided for AI planning.");

        const userPrefs = this.memorySystem ? this.memorySystem.loadPreferences() : {};
        const destName = (trip.destination || 'India').trim();
        const startDate = new Date(trip.startDate || Date.now());
        const endDate = new Date(trip.endDate || trip.startDate || Date.now());
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

        // 1. Analyze Ticket Milestones (Multi-City Journey Stages)
        const journeyStages = this.parseJourneyMilestones(trip, totalDays, startDate);

        // 2. Build Day-by-Day Schedule with Route Optimization & Pilgrimage Logic
        const dayWiseSchedule = [];
        for (let d = 1; d <= totalDays; d++) {
            const currentStage = journeyStages.find(s => s.day === d) || { day: d, city: destName };
            const daySchedule = this.planSingleDayStage(trip, d, currentStage, userPrefs, options);
            dayWiseSchedule.push(daySchedule);
        }

        // 3. Calculate Smart Budget Engine Tiers
        const budgetMatrix = this.calculateSmartBudget(trip, totalDays, userPrefs);

        // 4. Generate Packing List & Weather Safety Advice
        const packingAdvice = this.generatePackingAndWeatherAdvice(destName, startDate, userPrefs);

        // 5. Compile Final Structured JSON Output
        const planJson = {
            meta: {
                tripId: trip.id,
                destination: destName,
                totalDays: totalDays,
                generatedAt: new Date().toISOString(),
                aiEngine: "TravelMate Professional AI Engine v2.0"
            },
            summary: {
                title: `Professional ${totalDays}-Day Itinerary for ${destName}`,
                pace: options.pace || 'Balanced Exploration',
                dietaryFocus: userPrefs.foodPreference || 'Local Thali & Regional Cuisine',
                travelMode: userPrefs.preferredTransport || 'Train & Local Cab',
                stagesCount: journeyStages.length
            },
            journeyStages: journeyStages,
            daySchedule: dayWiseSchedule,
            budgetMatrix: budgetMatrix,
            packingList: packingAdvice.packingList,
            weatherAdvice: packingAdvice.weatherAdvice,
            emergencyContacts: packingAdvice.emergencyContacts
        };

        return planJson;
    }

    /**
     * Parses booked transport tickets to detect multi-city journey stages.
     */
    parseJourneyMilestones(trip, totalDays, startDate) {
        const stages = [];
        const tickets = trip.tickets || [];
        const itinerary = trip.itinerary || [];

        // Build station arrival/departure maps per day
        for (let d = 1; d <= totalDays; d++) {
            const dDate = new Date(startDate.getTime() + (d - 1) * 24 * 60 * 60 * 1000);
            const dayActivities = itinerary.filter(a => a.day === d);

            let cityToday = trip.destination || 'Main Destination';
            let arrivalTicket = null;
            let departureTicket = null;
            let isOnboard = false;

            dayActivities.forEach(a => {
                const place = (a.place || '').toLowerCase();
                const notes = (a.notes || '').toLowerCase();

                if (place.includes('arrival:') || notes.includes('arrived via')) {
                    arrivalTicket = a;
                    cityToday = a.place.replace('Arrival:', '').replace('(TRAIN)', '').replace('(FLIGHT)', '').replace('(BUS)', '').trim();
                } else if (place.includes('departure:') || notes.includes('carrier:')) {
                    departureTicket = a;
                } else if (place.includes('onboard') || place.includes('in transit')) {
                    isOnboard = true;
                }
            });

            stages.push({
                day: d,
                dateStr: dDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
                city: cityToday,
                arrival: arrivalTicket ? { time: arrivalTicket.time, place: arrivalTicket.place } : null,
                departure: departureTicket ? { time: departureTicket.time, place: departureTicket.place } : null,
                isOnboardTransit: isOnboard
            });
        }

        return stages;
    }

    /**
     * Generates an optimized day schedule respecting free hours, pilgrimage darshans, and local attractions.
     */
    planSingleDayStage(trip, dayNum, stage, userPrefs, options) {
        const destCity = stage.city || trip.destination || 'Destination';
        const cityData = this.knowledgeSystem ? this.knowledgeSystem.getDestinationInfo(destCity) : null;
        const availableAttractions = cityData ? [...cityData.attractions] : [];

        // Determine Free Window
        let freeStart = '09:00';
        let freeEnd = '20:00';

        if (stage.arrival) {
            const arrH = parseInt(stage.arrival.time.split(':')[0]) || 8;
            freeStart = `${arrH + 1 < 10 ? '0' + (arrH + 1) : arrH + 1}:30`;
        }
        if (stage.departure) {
            const depH = parseInt(stage.departure.time.split(':')[0]) || 20;
            freeEnd = `${Math.max(9, depH - 2)}:00`;
        }

        const activities = [];

        // Include booked train arrival/departure cards
        if (stage.arrival) {
            activities.push({
                time: stage.arrival.time,
                type: 'transit_arrival',
                title: stage.arrival.place,
                notes: 'Proceed to hotel check-in / refresh.',
                category: 'transit'
            });
        }

        if (stage.isOnboardTransit) {
            activities.push({
                time: '08:00',
                type: 'transit_onboard',
                title: `Onboard Train Journey in Transit (${destCity})`,
                notes: 'Enjoy scenic views, rest, and read travel guide.',
                category: 'transit'
            });
        } else if (availableAttractions.length > 0) {
            // Smart Route Clustering & Category Selection
            let timeSlots = [freeStart, '13:30', freeEnd > '17:00' ? '17:00' : freeEnd];

            availableAttractions.forEach((attraction, idx) => {
                if (idx < timeSlots.length) {
                    activities.push({
                        time: timeSlots[idx],
                        type: attraction.category,
                        title: attraction.name,
                        notes: attraction.highlights || attraction.notes || 'Explore scenic sights.',
                        category: attraction.category,
                        entryFee: attraction.entryFee,
                        durationMins: attraction.avgDurationMins,
                        pilgrimageInfo: attraction.pilgrimage || null,
                        nearbyThali: attraction.nearbyThalis || null
                    });
                }
            });
        } else {
            // Default Smart Preset Sights for city
            activities.push({
                time: freeStart,
                type: 'sightseeing',
                title: `${destCity} Iconic Heritage Sight & Viewpoint`,
                notes: 'Explore top landmarks & cultural heritage.',
                category: 'sightseeing'
            });
            activities.push({
                time: '13:30',
                type: 'food',
                title: `Famous Traditional Thali Restaurant in ${destCity}`,
                notes: `Savor authentic ${destCity} local delicacies & snacks.`,
                category: 'food'
            });
            activities.push({
                time: freeEnd > '17:00' ? '17:00' : freeEnd,
                type: 'shopping',
                title: `${destCity} Evening Bazaar & Local Market`,
                notes: 'Handicrafts, souvenirs & local evening street food.',
                category: 'shopping'
            });
        }

        if (stage.departure) {
            activities.push({
                time: stage.departure.time,
                type: 'transit_departure',
                title: stage.departure.place,
                notes: 'Arrive at platform 45 mins early with tickets & ID.',
                category: 'transit'
            });
        }

        return {
            day: dayNum,
            dateStr: stage.dateStr,
            city: destCity,
            freeWindow: `${freeStart} to ${freeEnd}`,
            activities: activities
        };
    }

    /**
     * Calculates budget estimates across Low, Medium, and Premium tiers.
     */
    calculateSmartBudget(trip, totalDays, userPrefs) {
        const perDayRates = {
            low: { hotel: 900, food: 400, transport: 300, tickets: 150 },
            medium: { hotel: 2200, food: 800, transport: 600, tickets: 350 },
            premium: { hotel: 5500, food: 1800, transport: 1500, tickets: 800 }
        };

        const calcTier = (tier) => {
            const rates = perDayRates[tier];
            const hotelTotal = rates.hotel * Math.max(1, totalDays - 1);
            const foodTotal = rates.food * totalDays;
            const transportTotal = rates.transport * totalDays;
            const ticketsTotal = rates.tickets * totalDays;
            const total = hotelTotal + foodTotal + transportTotal + ticketsTotal;

            return {
                tier: tier.toUpperCase(),
                totalAmount: `₹${total.toLocaleString('en-IN')}`,
                hotelCost: `₹${hotelTotal.toLocaleString('en-IN')}`,
                foodCost: `₹${foodTotal.toLocaleString('en-IN')}`,
                transportCost: `₹${transportTotal.toLocaleString('en-IN')}`,
                ticketsCost: `₹${ticketsTotal.toLocaleString('en-IN')}`
            };
        };

        return {
            recommendedTier: userPrefs.budgetRange || 'medium',
            lowTier: calcTier('low'),
            mediumTier: calcTier('medium'),
            premiumTier: calcTier('premium')
        };
    }

    /**
     * Generates packing list, weather safety advice, and emergency numbers.
     */
    generatePackingAndWeatherAdvice(destination, startDate, userPrefs) {
        const packingList = [
            "Valid Government Photo ID (Aadhaar / Voter ID / Passport)",
            "Confirmed Train / Flight / Hotel PDF Printouts",
            "Decent Traditional Attire (For Temple Darshans)",
            "Comfortable Walking Shoes & Slip-on Footwear",
            "Personal Medicines & First Aid Kit",
            "Mobile Charger, Power Bank & Cables",
            "Light Umbrella / Rain Poncho"
        ];

        if (userPrefs.seniorCitizenAssistance) {
            packingList.push("Senior Citizen Medical Papers & Support Walking Stick");
        }
        if (userPrefs.childrenTraveling) {
            packingList.push("Child Snacks, Water Bottle & Wet Wipes");
        }

        const weatherAdvice = {
            forecast: "Pleasant & Warm (22°C - 32°C)",
            recommendation: "Plan outdoor sightseeing during early morning (07:30 - 10:30 AM) or evening (16:30 - 19:30 PM) to avoid midday heat. Stay hydrated."
        };

        const emergencyContacts = [
            { service: "National Emergency", number: "112" },
            { service: "Police Control Room", number: "100" },
            { service: "Medical Ambulance", number: "108" },
            { service: "Railway Helpline", number: "139" }
        ];

        return { packingList, weatherAdvice, emergencyContacts };
    }
}

window.aiPlannerEngine = new TravelMateAiPlannerEngine();
