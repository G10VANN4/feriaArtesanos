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

// Provider MEJORADO
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    checkAuth();
      
      // NUEVO: Verificar autenticación periódicamente cada 5 minutos
      const interval = setInterval(() => {
        if (isAuthenticated) {
          console.log('🔄 Verificación periódica de sesión...');
          checkAuth();
        }
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }, [isAuthenticated]);

    const checkAuth = async () => {
    try {
      console.log('🔍 Verificando autenticación...');
      const data = await authService.checkAuth();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        
        // ✅ SOLO usar localStorage para info del usuario, NO para autenticación
        const userFromStorage = JSON.parse(localStorage.getItem('user') || 'null');
        
        setUser({ 
          usuario_id: data.user_id || userFromStorage?.usuario_id,
          email: userFromStorage?.email,
          rol_id: data.rol_id || userFromStorage?.rol_id
        });
        
        console.log('✅ Usuario autenticado via cookies');
      } else {
        throw new Error('No autenticado');
      }
    } catch (error) {
      console.log('❌ Usuario no autenticado:', error.message);
      setIsAuthenticated(false);
      setUser(null);
      // ✅ SOLO limpiar info del usuario, las cookies las maneja el backend
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
      setSessionChecked(true);
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
        usuario_id: result.usuario_id,
        email: email 
      };
    } catch (error) {
      // NUEVO: Manejar específicamente sesión revocada
      if (error.msg === 'session_revoked') {
        return {
          success: false,
          message: 'session_revoked',
          details: error.details
        };
      }
      
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

  // NUEVO: Forzar cierre de otras sesiones
  const forceLogoutOtherSessions = async () => {
    try {
      const result = await authService.forceLogoutOtherSessions();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        message: 'Error al cerrar sesiones en otros dispositivos',
      };
    }
  };

  const value = {
    register,
    login,
    logout,
    forceLogoutOtherSessions, // NUEVO
    isAuthenticated,
    user,
    loading,
    sessionChecked, // NUEVO
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};