import { useState, useEffect, useContext, createContext } from 'react';
import { authService } from '../services/api/authService';

// Crear el contexto
const AuthContext = createContext();

// Hook personalizado
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Provider
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('token')
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const register = async (formData) => {
    setLoading(true);
    try {
      const result = await authService.register(formData);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        message: error.msg || 'Error en el registro. Inténtalo nuevamente.',
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login({ email, password });
      
      setIsAuthenticated(true);
      setUser({ 
        email, 
        rol_id: result.rol_id 
      });

      //  DEVUELVE el rol_id para usarlo en el Login component
      return { 
        success: true, 
        token: result.access_token,
        rol_id: result.rol_id,  
        email: email 
      };
    } catch (error) {
      return {
        success: false,
        message: error.msg || 'Credenciales inválidas',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    register,
    login,
    logout,
    isAuthenticated,
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

