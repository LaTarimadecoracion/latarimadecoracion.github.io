// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX-Dq0wBcOmDG_G1Vso1VTCzedvmi4EmQ",
  authDomain: "gastos-84a95.firebaseapp.com",
  projectId: "gastos-84a95",
  storageBucket: "gastos-84a95.firebasestorage.app",
  messagingSenderId: "296681422203",
  appId: "1:296681422203:web:e17b7e83e028865c6611de",
  measurementId: "G-C3R0FZPGVX"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const db = firebase.firestore();
const auth = firebase.auth();

console.log('🔥 Firebase inicializado');
