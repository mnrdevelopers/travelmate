/**
 * TravelMate Extensible Destination Knowledge Database (js/destination-db.js)
 * Structured registry containing city hubs, attractions, pilgrimage rules, 
 * opening hours, entry fees, thali dining, and emergency facilities.
 */

const DESTINATION_KNOWLEDGE_DB = {
    "hyderabad": {
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        description: "City of Pearls, Nizam heritage, world-famous Biryani, and IT hub.",
        climate: "Tropical wet & dry",
        bestSeason: "October to March",
        hubs: {
            railway: ["Secunderabad Jn (SC)", "Hyderabad Deccan (HYB)", "Kacheguda (KCG)"],
            airport: "Rajiv Gandhi International Airport (HYD)",
            busStand: "Mahatma Gandhi Bus Station (MGBS)"
        },
        attractions: [
            {
                name: "Charminar & Laad Bazaar",
                category: "heritage",
                openingHours: "09:30 - 17:30",
                avgDurationMins: 90,
                entryFee: "₹25 (Indian), ₹300 (Foreigner)",
                photographyAllowed: true,
                wheelchairAccessible: false,
                familyFriendlyRating: 4.8,
                nearbyThalis: "Shadab Restaurant, Nimrah Cafe & Bakery",
                highlights: "Historic 1591 monument, bangles market & Osmania chai"
            },
            {
                name: "Golconda Fort",
                category: "heritage",
                openingHours: "09:00 - 17:30",
                avgDurationMins: 150,
                entryFee: "₹25 (Indian), ₹300 (Foreigner)",
                photographyAllowed: true,
                wheelchairAccessible: false,
                familyFriendlyRating: 4.6,
                nearbyThalis: "Chutneys, Paradise Biryani",
                highlights: "Acoustic engineering architecture, hilltop views & sound-light show"
            },
            {
                name: "Birla Mandir",
                category: "temple",
                openingHours: "07:00 - 12:00, 15:00 - 21:00",
                avgDurationMins: 60,
                entryFee: "Free",
                photographyAllowed: false,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.9,
                nearbyThalis: "Kamat Hotel, Minerva Coffee Shop",
                highlights: "White marble temple built on Naubath Pahad overlooking Hussain Sagar lake",
                pilgrimage: {
                    dressCode: "Traditional decent attire",
                    specialDarshan: "Free general queue",
                    prasadam: "Laddoo & Puliora available at counter",
                    footwearStand: "Free footwear counter at entrance hill",
                    lockerAvailable: "Mandatory mobile/camera locker at entrance"
                }
            }
        ],
        emergency: {
            hospitals: ["Apollo Hospitals Jubilee Hills", "KIMS Secunderabad"],
            police: "100 / Hyderabad City Police Control Room",
            fuelStations: "24/7 HPCL & IndianOil at MGBS & Lakdikapul"
        }
    },
    "vijayawada": {
        city: "Vijayawada",
        state: "Andhra Pradesh",
        country: "India",
        description: "The Place of Victory on Krishna riverbanks, home to Goddess Kanaka Durga.",
        climate: "Tropical hot & humid",
        bestSeason: "October to March",
        hubs: {
            railway: ["Vijayawada Junction (BZA)"],
            airport: "Vijayawada International Airport (VGA)",
            busStand: "Pandit Nehru Bus Station (PNBS)"
        },
        attractions: [
            {
                name: "Kanaka Durga Temple (Indrakeeladri Hill)",
                category: "temple",
                openingHours: "04:00 - 22:00",
                avgDurationMins: 120,
                entryFee: "Free (General), ₹100/₹300 (VIP Darshan)",
                photographyAllowed: false,
                wheelchairAccessible: true,
                familyFriendlyRating: 5.0,
                nearbyThalis: "Babai Hotel, Sweet Magic, Sri Ramaiya Mess",
                highlights: "Sacred hilltop shrine of Goddess Durga with panoramic Krishna river views",
                pilgrimage: {
                    dressCode: "Traditional decent attire (Saree, Dhotis, Kurta)",
                    specialDarshan: "₹100 & ₹300 express queues",
                    prasadam: "KadamBam, Puliora, Laddoo prasadam counters",
                    footwearStand: "Free footwear stand at Indrakeeladri ghat road entrance",
                    lockerAvailable: "Locker counter at ghat entrance"
                }
            },
            {
                name: "Prakasam Barrage & Bhavani Island",
                category: "sightseeing",
                openingHours: "06:00 - 20:00",
                avgDurationMins: 90,
                entryFee: "Free (Barrage walk), ₹100 (Ferry to Bhavani Island)",
                photographyAllowed: true,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.7,
                nearbyThalis: "Rotiwalan, Cross Roads Restaurant",
                highlights: "1223m long barrage across Krishna river with illuminated night views"
            },
            {
                name: "Undavalli Caves",
                category: "heritage",
                openingHours: "09:00 - 18:00",
                avgDurationMins: 75,
                entryFee: "₹25 (Indian), ₹300 (Foreigner)",
                photographyAllowed: true,
                wheelchairAccessible: false,
                familyFriendlyRating: 4.5,
                nearbyThalis: "Local Tiffin centers near Tadepalle",
                highlights: "Monolithic 4-storey rock-cut caves housing giant reclining Ananta Padmanabha Swamy statue"
            }
        ],
        emergency: {
            hospitals: ["Ramesh Hospitals BZA", "Manipal Hospital Tadepalle"],
            police: "100 / Vijayawada Urban Police",
            fuelStations: "24/7 IndianOil at PNBS & Benz Circle"
        }
    },
    "samalkot": {
        city: "Samalkot / Pithapuram",
        state: "Andhra Pradesh",
        country: "India",
        description: "Pancharama Kshetras & Dattatreya Peetham sacred pilgrimage circuit.",
        climate: "Tropical hot",
        bestSeason: "October to March",
        hubs: {
            railway: ["Samalkot Junction (SLO)"],
            airport: "Rajahmundry Airport (RJA) - 50 km",
            busStand: "Samalkot RTC Bus Stand"
        },
        attractions: [
            {
                name: "Sri Kumararama Bhimeswara Swamy Temple",
                category: "temple",
                openingHours: "06:00 - 12:00, 16:00 - 20:00",
                avgDurationMins: 60,
                entryFee: "Free",
                photographyAllowed: false,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.9,
                nearbyThalis: "Sri Rama Mess SLO, Hotel Royal Park",
                highlights: "One of the 5 sacred Pancharama Kshetras with 14ft tall Shivalinga",
                pilgrimage: {
                    dressCode: "Traditional decent attire",
                    specialDarshan: "Direct queue",
                    prasadam: "Free Annadhanam at noon & prasadam counter",
                    footwearStand: "Free footwear stand at temple Rajagopuram",
                    lockerAvailable: "Available near temple office"
                }
            },
            {
                name: "Sri Pada Srivallabha Temple (Pithapuram)",
                category: "temple",
                openingHours: "05:30 - 12:30, 16:30 - 21:00",
                avgDurationMins: 90,
                entryFee: "Free",
                photographyAllowed: false,
                wheelchairAccessible: true,
                familyFriendlyRating: 5.0,
                nearbyThalis: "Sri Pada Annadhana Chatram, Local Mess",
                highlights: "Birthplace of Sripada Srivallabha (First Avatar of Lord Dattatreya)",
                pilgrimage: {
                    dressCode: "Traditional (Dhoti/Kurta for gents, Saree/Chudidhar for ladies)",
                    specialDarshan: "Free Darshan & Special Seva tickets available",
                    prasadam: "Free Nitya Annadhanam meals for all pilgrims",
                    footwearStand: "Footwear stand outside main gate",
                    lockerAvailable: "Mobile lockers available at entrance"
                }
            }
        ],
        emergency: {
            hospitals: ["Government Hospital Samalkot", "Apollo Kakinada (12 km)"],
            police: "100 / Samalkot PS",
            fuelStations: "IOCL Petrol Pump Samalkot Main Road"
        }
    },
    "guwahati": {
        city: "Guwahati / Kamakhya",
        state: "Assam",
        country: "India",
        description: "Gateway to North-East India, home to Shakti Peeth Maa Kamakhya & mighty Brahmaputra.",
        climate: "Subtropical humid",
        bestSeason: "October to April",
        hubs: {
            railway: ["Guwahati (GHY)", "Kamakhya Junction (KYQ)"],
            airport: "Lokpriya Gopinath Bordoloi International Airport (GAU)",
            busStand: "ISBT Guwahati (Betkuchi)"
        },
        attractions: [
            {
                name: "Maa Kamakhya Temple (Nilachal Hill)",
                category: "temple",
                openingHours: "08:00 - 13:00, 14:30 - 17:30",
                avgDurationMins: 180,
                entryFee: "Free (General), ₹501 (VIP Fast Track)",
                photographyAllowed: false,
                wheelchairAccessible: false,
                familyFriendlyRating: 5.0,
                nearbyThalis: "Kamakhya Hill Prasad Counter, Paradise Assamese Restaurant",
                highlights: "One of 51 sacred Shakti Peethas perched on Nilachal Hill",
                pilgrimage: {
                    dressCode: "Decent traditional attire",
                    specialDarshan: "₹501 VIP ticket queue available at counter",
                    prasadam: "Pure vegetarian bhog prasadam counter",
                    footwearStand: "Footwear counters along Nilachal hill temple walkway",
                    lockerAvailable: "Mandatory mobile/bag locker at Nilachal hill top entrance"
                }
            },
            {
                name: "Umananda Temple (Peacock Island)",
                category: "temple",
                openingHours: "05:30 - 17:00",
                avgDurationMins: 120,
                entryFee: "Free (Temple entry), ₹20 - ₹100 (Inland Ferry)",
                photographyAllowed: true,
                wheelchairAccessible: false,
                familyFriendlyRating: 4.8,
                nearbyThalis: "Kachari Ghat Local Snacks, Machaan Restaurant",
                highlights: "World's smallest inhabited river island in Brahmaputra river"
            },
            {
                name: "Brahmaputra Sunset River Cruise",
                category: "sightseeing",
                openingHours: "16:00 - 19:30",
                avgDurationMins: 90,
                entryFee: "₹400 - ₹800 per person",
                photographyAllowed: true,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.9,
                nearbyThalis: "Alfresco Grand River Cruise Dining",
                highlights: "Mesmerizing sunset views on Brahmaputra river with folk music & Assamese snacks"
            },
            {
                name: "Fancy Bazaar & Assam Tea Market",
                category: "shopping",
                openingHours: "10:00 - 20:30 (Closed on Sundays)",
                avgDurationMins: 90,
                entryFee: "Free",
                photographyAllowed: true,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.6,
                nearbyThalis: "Jaanmoni Assamese Thali, JB's Veg Restaurant",
                highlights: "Famous Assam CTC & Orthodox tea, Muga silk sarees, and bamboo handicrafts"
            }
        ],
        emergency: {
            hospitals: ["Gauhati Medical College (GMCH)", "GNRC Hospital Dispur"],
            police: "100 / Guwahati City Police",
            fuelStations: "24/7 BPCL & IOCL at GS Road & Paltan Bazaar"
        }
    },
    "puri": {
        city: "Puri",
        state: "Odisha",
        country: "India",
        description: "Holy Dham of Lord Jagannath and serene Golden Sea Beach.",
        climate: "Tropical coastal",
        bestSeason: "October to March",
        hubs: {
            railway: ["Puri Railway Station (PURI)"],
            airport: "Biju Patnaik International Airport Bhubaneswar (BBI) - 60 km",
            busStand: "Puri Grand Road Bus Stand"
        },
        attractions: [
            {
                name: "Shree Jagannath Temple",
                category: "temple",
                openingHours: "05:00 - 23:00",
                avgDurationMins: 150,
                entryFee: "Free",
                photographyAllowed: false,
                wheelchairAccessible: true,
                familyFriendlyRating: 5.0,
                nearbyThalis: "Anand Bazar Mahaprasad, Wild Grass Restaurant, Puri Heritage Mess",
                highlights: "World-famous 12th-century shrine of Lord Jagannath, Balabhadra & Subhadra",
                pilgrimage: {
                    dressCode: "Strict Indian traditional attire (Dhoti/Kurta, Saree/Chudidhar)",
                    specialDarshan: "Free Darshan through Singhadwara (Lion Gate)",
                    prasadam: "Famous 56 Bhog Mahaprasad (Abhada) at Anand Bazar inside temple",
                    footwearStand: "Free footwear stand at Singhadwara entrance",
                    lockerAvailable: "Mandatory mobile/electronic lockers at Singhadwara gate"
                }
            },
            {
                name: "Puri Golden Beach & Swargadwar Market",
                category: "sightseeing",
                openingHours: "24 Hours (Market: 09:00 - 22:00)",
                avgDurationMins: 120,
                entryFee: "Free",
                photographyAllowed: true,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.9,
                nearbyThalis: "Chung Wah, Pink House Beach Cafe, Odisha Hotel",
                highlights: "Golden sand sea beach with gentle waves, sunset views & seashell handicrafts"
            }
        ],
        emergency: {
            hospitals: ["District Headquarter Hospital Puri", "Apollo Bhubaneswar (60 km)"],
            police: "100 / Puri Beach Police Station",
            fuelStations: "24/7 Petrol Pump at Grand Road & VIP Road"
        }
    },
    "nizamabad": {
        city: "Nizamabad",
        state: "Telangana",
        country: "India",
        description: "Historic city known for Nizamabad Fort, Alisagar Park, and turmeric markets.",
        climate: "Tropical hot",
        bestSeason: "October to March",
        hubs: {
            railway: ["Nizamabad Junction (NZB)"],
            airport: "Hyderabad RGI Airport (HYD) - 175 km",
            busStand: "Nizamabad Bus Station (NZB)"
        },
        attractions: [
            {
                name: "Nizamabad Fort & Raghunath Temple",
                category: "heritage",
                openingHours: "09:00 - 18:00",
                avgDurationMins: 90,
                entryFee: "Free",
                photographyAllowed: true,
                wheelchairAccessible: false,
                familyFriendlyRating: 4.6,
                nearbyThalis: "Hotel Surya, Telangana Bhojanalayam",
                highlights: "Hilltop fort built by Rashtrakuta kings featuring Ram temple & 300ft jail"
            },
            {
                name: "Mallaram Forest & Alisagar Park",
                category: "nature",
                openingHours: "09:00 - 17:30",
                avgDurationMins: 120,
                entryFee: "₹20 per head",
                photographyAllowed: true,
                wheelchairAccessible: true,
                familyFriendlyRating: 4.7,
                nearbyThalis: "Alisagar Tourist Restaurant",
                highlights: "Picturesque lake, deer park, island bungalow & forest trekking trails"
            }
        ],
        emergency: {
            hospitals: ["Government General Hospital Nizamabad", "Pragathi Hospital NZB"],
            police: "100 / Nizamabad Town PS",
            fuelStations: "24/7 IOCL & HPCL at Hyderabad Road"
        }
    }
};

class DestinationKnowledgeSystem {
    constructor() {
        this.db = DESTINATION_KNOWLEDGE_DB;
    }

    getDestinationInfo(cityName) {
        if (!cityName) return null;
        const key = cityName.toLowerCase().trim();
        for (const k of Object.keys(this.db)) {
            if (key.includes(k) || k.includes(key)) {
                return this.db[k];
            }
        }
        return null;
    }

    getAttractionsForCity(cityName) {
        const info = this.getDestinationInfo(cityName);
        return info ? info.attractions || [] : [];
    }

    getPilgrimageAttractions(cityName) {
        const attractions = this.getAttractionsForCity(cityName);
        return attractions.filter(a => a.category === 'temple' || a.pilgrimage);
    }
}

window.destinationKnowledge = new DestinationKnowledgeSystem();
