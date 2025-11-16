import axiosInstance from './axiosConfig';

export const authService = {
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        // ❌ ELIMINA 'nombre' - tu backend no lo espera
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { msg: 'Error de conexión' };
    }
  },

  login: async (credentials) => {
    try {
      console.log('🔍 Intentando login con:', credentials.email);
      
      const response = await axiosInstance.post('/auth/login', credentials);
      
      console.log('✅ Login exitoso, respuesta:', response.data);
      
      // ✅ VERIFICAR que la respuesta tiene los datos correctos
      if (response.data && response.data.access_token) {
        // Guardar token en localStorage
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify({
          usuario_id: response.data.usuario_id,
          email: credentials.email,
          rol_id: response.data.rol_id,
        }));
        
        console.log('✅ Token guardado en localStorage');
        
        // Analytics (solo si existe)
        if (typeof analyticsService !== 'undefined' && analyticsService.trackLogin) {
          analyticsService.trackLogin({
            usuario_id: response.data.usuario_id,
            rol_id: response.data.rol_id
          });
        }
        
        return response.data;
      } else {
        console.error('❌ Respuesta del login incompleta:', response.data);
        throw { msg: 'Respuesta del servidor incompleta' };
      }
      
    } catch (error) {
      console.error('❌ Error en authService.login:', error);
      
      // ✅ MEJOR MANEJO DE ERRORES
      if (error.response) {
        // El servidor respondió con un código de error
        console.error('❌ Error del servidor:', error.response.status, error.response.data);
        throw error.response.data;
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        console.error('❌ Error de red:', error.request);
        throw { msg: 'Error de conexión con el servidor' };
      } else {
        // Algo pasó al configurar la petición
        console.error('❌ Error de configuración:', error.message);
        throw { msg: error.message || 'Error desconocido' };
      }
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Logout ejecutado');
  }
};