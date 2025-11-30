import axiosInstance from './axiosConfig';

export const authService = {
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { msg: 'Error de conexión' };
    }
  },

  login: async (credentials) => {
    try {
      console.log('🔍 Intentando login con:', credentials.email);
      
      const response = await axiosInstance.post('/auth/login', credentials);
      
      console.log('✅ Login exitoso');
      
      // ✅ MANTENER localStorage solo para información del usuario, NO para el token
      if (response.data) {
        localStorage.setItem('user', JSON.stringify({
          usuario_id: response.data.usuario_id,
          email: credentials.email,
          rol_id: response.data.rol_id,
        }));
        
        console.log('✅ Información de usuario guardada en localStorage');
        return response.data;
      } else {
        throw { msg: 'Respuesta del servidor incompleta' };
      }
      
    } catch (error) {
      console.error('❌ Error en authService.login:', error);
      
      // Manejar específicamente sesión única
      if (error.response?.data?.msg?.includes('revocado')) {
        throw { 
          msg: 'session_revoked', 
          details: 'Tu sesión anterior ha sido cerrada automáticamente.' 
        };
      }
      
      throw error.response?.data || { msg: 'Error en login' };
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Error en logout service:', error);
    } finally {
      // ✅ SOLO limpiar localStorage, las cookies las maneja el backend
      localStorage.removeItem('user');
      console.log('✅ Logout ejecutado');
    }
  },

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/check-auth');
      return response.data;
    } catch (error) {
      // Manejar específicamente token revocado
      if (error.response?.data?.msg?.includes('revocado')) {
        throw { msg: 'token_revoked', details: error.response.data.msg };
      }
      throw new Error('No autenticado');
    }
  },

  forceLogoutOtherSessions: async () => {
    try {
      const response = await axiosInstance.post('/auth/force-logout-other-sessions');
      return response.data;
    } catch (error) {
      throw new Error('Error forzando logout');
    }
  }
};