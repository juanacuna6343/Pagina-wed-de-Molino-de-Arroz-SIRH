// Configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyDIxP8wdQ8aEEzTR1PWzVLq5Hueo3QnD98",
  authDomain: "proyecto1-1dc6c.firebaseapp.com",
  projectId: "proyecto1-1dc6c",
  storageBucket: "proyecto1-1dc6c.appspot.com",
  messagingSenderId: "288402890139",
  appId: "1:288402890139:web:0c81d536995d0afd00d53e",
  measurementId: "G-36P132HW77"
};

// URL base de la API - Apuntando a Render para el backend
export const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://sirh-molino-arroz.onrender.com/api';