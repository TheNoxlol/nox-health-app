const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyDjVAKEjKiAq4yKNX5QBkqWt8d4YCViyhE",
    authDomain: "nox-health-dcffb.firebaseapp.com",
    projectId: "nox-health-dcffb",
    storageBucket: "nox-health-dcffb.firebasestorage.app",
    messagingSenderId: "1007162540768",
    appId: "1:1007162540768:web:46d38fc2def7ce20080685",
    measurementId: "G-S1EM4PESFJ"
};

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    console.log('Firebase inicializado correctamente');
    module.exports = { db, auth };
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
    throw error;
}