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
      console.log('Intentando login con:', credentials.email);
      
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
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
      
      console.log('Login exitoso, respuesta:', {
        usuario_id: data.usuario_id,
        rol_id: data.rol_id,
        email: data.email
      });
      
      if (data && data.access_token) {
        localStorage.setItem('token', data.access_token);
        console.log('Token guardado en localStorage');
      }
      
      return data;
      
    } catch (error) {
      console.error('Error en authService.login:', error);
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
      localStorage.clear(); 
      console.log('Logout ejecutado - localStorage COMPLETAMENTE limpiado');
    }
  },

  checkAuth: async () => {
    try {
      const response = await fetch('http://localhost:5000/auth/check-auth', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        throw new Error('No autenticado');
      }
      
      const data = await response.json();
      
      
      return data;
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      throw error;
    }
  },
};