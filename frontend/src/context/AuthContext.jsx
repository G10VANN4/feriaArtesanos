import React, { createContext, useState, useEffect } from 'react';

// Crear el contexto
const AuthContext = createContext();

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar si hay usuario logueado al cargar la app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Función para login (simulada sin API)////////////////////////////
  const login = async (email, password) => {
    try {

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validación simple - en un caso real esto vendría del backend/////////////////
      if (email && password) {
        const userData = {
          id: Date.now(),
          email: email,
          username: email.split('@')[0],
          role: 'user',
          nombre: 'Usuario Demo'
        };
        
        // Simular token
        const token = 'simulated-token-' + Date.now();
        
        // Guardar en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Actualizar estado
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { success: false, message: 'Credenciales inválidas' };
      }
    } catch {
      return { success: false, message: 'Error al iniciar sesión' };
    }
  };

  // Función para logout
  const logout = () => {
    // Remover del localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Limpiar estado
    setUser(null);
    setIsAuthenticated(false);
  };

  // Función para registro (simulada sin API)
  const register = async (userData) => {
    try {
      // Simular delay de registro
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // En una app real, aquí enviarías los datos al backend
      console.log('Usuario registrado:', userData);
      
      return { success: true };
    } catch {
      return { success: false, message: 'Error en el registro' };
    }
  };

  // Valor que se provee a los componentes
  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;