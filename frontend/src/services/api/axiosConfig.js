import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// ✅ CREAR instancia de axios CON cookies
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ ESTO ES LO MÁS IMPORTANTE
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ ELIMINAR completamente el interceptor que agrega Authorization header
// Las cookies se envían automáticamente con withCredentials: true

// ✅ Solo mantener interceptor de respuesta para manejar errores
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Error en response interceptor:', error);
    
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.msg;
      
      // Manejar específicamente token revocado
      if (errorMessage && errorMessage.includes('revocado')) {
        console.log('🔐 Token revocado detectado');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?message=session_revoked';
        }
      } else {
        // Otros errores 401
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?message=session_expired';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;