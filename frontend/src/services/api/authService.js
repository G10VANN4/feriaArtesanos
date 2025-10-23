import axiosInstance from './axiosConfig';

export const authService = {
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        nombre: userData.nombre || userData.email.split('@')[0],
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { msg: 'Error de conexión' };
    }
  },

  login: async (credentials) => {
    try {
      const response = await axiosInstance.post('/auth/login', credentials);
      
      // Guardar token en localStorage
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify({
          email: credentials.email,
          rol_id: response.data.rol_id,
        }));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { msg: 'Error de conexión' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};