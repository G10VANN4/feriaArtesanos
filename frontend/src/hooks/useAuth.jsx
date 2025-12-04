import { useState, useEffect, useContext, createContext } from 'react';
import { authService } from '../services/api/authService';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Verificando autenticación...');
      const data = await authService.checkAuth();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        
        setUser({ 
          usuario_id: data.user_id,
          email: data.email,
          rol_id: data.rol_id
        });
        
        console.log('Usuario autenticado:', {
          usuario_id: data.user_id,
          email: data.email,
          rol_id: data.rol_id
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('token');
      }
      
    } catch (error) {
      console.log('Usuario no autenticado');
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

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
      
      if (result && result.usuario_id) {
        setIsAuthenticated(true);
        
        setUser({ 
          email: result.email,
          rol_id: result.rol_id,
          usuario_id: result.usuario_id
        });

        return { 
          success: true, 
          token: result.access_token,
          rol_id: result.rol_id,  
          usuario_id: result.usuario_id,
          email: result.email 
        };
      }
      
      return {
        success: false,
        message: 'Error en la respuesta del servidor',
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

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const getCurrentUser = () => {
    return user;
  };

  const refreshUserInfo = async () => {
    try {
      const data = await authService.getUserInfo();
      setUser(data);
      return data;
    } catch (error) {
      console.error('Error refrescando información del usuario:', error);
      return null;
    }
  };

  const value = {
    register,
    login,
    logout,
    isAuthenticated,
    user,
    loading,
    checkAuth,
    getCurrentUser,
    refreshUserInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};