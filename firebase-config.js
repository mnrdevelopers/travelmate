// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBovkc7ohfvTlZUiqDQrQLW2B6aXAE000k",
    authDomain: "travel-mate-5729f.firebaseapp.com",
    projectId: "travel-mate-5729f",
    storageBucket: "travel-mate-5729f.firebasestorage.app",
    messagingSenderId: "164820425577",
    appId: "1:164820425577:web:dd1a93c232555a59f3bbf8",
    measurementId: "G-GETZV3X0ER"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// OpenRouteService API key
const OPENROUTESERVICE_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU4ZjhiMTllYmM5NjRhZDc5ZmZlZDA5NTdiM2NiYTRkIiwiaCI6Im11cm11cjY0In0=";
