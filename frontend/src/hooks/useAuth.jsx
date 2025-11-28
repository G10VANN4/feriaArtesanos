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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Verificando autenticación...');
      const data = await authService.checkAuth();
      
      setIsAuthenticated(true);
      
      // Recuperar datos del usuario desde localStorage
      const userFromStorage = JSON.parse(localStorage.getItem('user') || 'null');
      const userRole = localStorage.getItem('user_role');
      
      setUser({ 
        usuario_id: data.user_id,
        email: userFromStorage?.email,
        rol_id: userRole ? parseInt(userRole) : userFromStorage?.rol_id
      });
      
      console.log('✅ Usuario autenticado:', data.user_id);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      console.log('❌ Usuario no autenticado');
      setIsAuthenticated(false);
      setUser(null);
      // Limpiar localStorage por si acaso
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_role');
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
      
      setIsAuthenticated(true);
      setUser({ 
        email, 
        rol_id: result.rol_id,
        usuario_id: result.usuario_id
      });

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

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    register,
    login,
    logout,
    isAuthenticated,
    user,
    loading,
    checkAuth // ✅ NUEVO: Exportar checkAuth para uso manual
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};