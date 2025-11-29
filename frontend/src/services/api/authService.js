import axiosInstance from './axiosConfig';

export const authService = {
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        email: userData.email,
        password: userData.password,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { msg: 'Error de conexión' };
    }
  },

  login: async (credentials) => {
    try {
      console.log('🔍 Intentando login con:', credentials.email);
      
      // Usar fetch para cookies
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw data || { msg: 'Error en login' };
      }
      
      console.log('✅ Login exitoso, respuesta:', data);
      
      if (data && data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify({
          usuario_id: data.usuario_id,
          email: credentials.email,
          rol_id: data.rol_id,
        }));
        
        console.log('✅ Token guardado en localStorage para compatibilidad');
        
        return data;
      } else {
        console.error('❌ Respuesta del login incompleta:', data);
        throw { msg: 'Respuesta del servidor incompleta' };
      }
      
    } catch (error) {
      console.error('❌ Error en authService.login:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await fetch('http://localhost:5000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error en logout service:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('✅ Logout ejecutado - localStorage limpiado');
    }
  },

  checkAuth: async () => {
    const response = await fetch('http://localhost:5000/auth/check-auth', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('No autenticado');
    }
    
    return await response.json();
  }
};