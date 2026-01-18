// Firebase Configuration
var firebaseConfig = {
    apiKey: "AIzaSyAk1Vcc-hwIbrWRZQwofOAcH7e59u13WJM",
    authDomain: "drakar-demoner-companion.firebaseapp.com",
    projectId: "drakar-demoner-companion",
    storageBucket: "drakar-demoner-companion.firebasestorage.app",
    messagingSenderId: "730917516882",
    appId: "1:730917516882:web:85170f584c71fd4fac918b",
    measurementId: "G-SGETCW8J60"
};

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage();
var googleProvider = new firebase.auth.GoogleAuthProvider();

// Global helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

console.log('✅ Firebase initialiserad');
