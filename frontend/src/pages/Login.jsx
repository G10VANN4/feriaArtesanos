import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { FaSignInAlt, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";
import "../styles/App.css";

const Login = () => {
  const { login, isAuthenticated, user, logout, forceLogoutOtherSessions } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Verificar parámetros de URL para mensajes
  useEffect(() => {
    const message = searchParams.get('message');
    
    if (message === 'session_revoked') {
      setError('Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo.');
      setShowSessionWarning(true);
    } else if (message === 'session_expired') {
      setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowSessionWarning(false);

    const { email, password } = formData;

    try {
      const result = await login(email, password);

      if (result.success) {
        // ✅ CORREGIDO: No necesitamos limpiar el formData aquí
        // La redirección se maneja automáticamente en el hook useAuth
        
        console.log('✅ Login exitoso, redirigiendo...');

      } else {
        // Manejar sesión revocada
        if (result.message === 'session_revoked') {
          setShowSessionWarning(true);
          setError('Se detectó una sesión activa en otro dispositivo. ¿Quieres cerrarla?');
        } else {
          setError(result.message || "Error al iniciar sesión");
        }
      }
    } catch (error) {
      // ✅ CORREGIDO: Manejar errores específicos
      console.error('Error en login:', error);
      setError("Error interno del sistema. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Manejar forzar cierre de sesiones
  const handleForceLogout = async () => {
    setLoading(true);
    try {
      const result = await forceLogoutOtherSessions();
      if (result.success) {
        setShowSessionWarning(false);
        setError("Sesiones en otros dispositivos cerradas. Ahora puedes iniciar sesión.");
        // ✅ MEJORADO: En lugar de recargar, resetear el formulario
        setFormData({ email: "", password: "" });
      } else {
        setError(result.message || "Error al cerrar sesiones");
      }
    } catch (error) {
      console.error('Error forzando logout:', error);
      setError("Error al cerrar sesiones en otros dispositivos");
    } finally {
      setLoading(false);
    }
  };

  // Si ya está autenticado, mostrar mensaje y opciones
  if (isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">
            <FaSignInAlt className="login-icon" />
            Ya estás autenticado
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#5C4033",
              marginBottom: "1rem",
            }}
          >
            Has iniciado sesión como: <strong>{user?.email}</strong>
          </p>
          
          {/* Información de sesión única */}
          <div className="session-info" style={{
            backgroundColor: '#f0f8ff',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #d1ecf1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <FaInfoCircle style={{ color: '#1890ff', marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0c5460' }}>Sesión única activa</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#0c5460', fontSize: '0.9rem' }}>
                Solo puedes tener una sesión activa a la vez. Si inicias sesión en otro dispositivo, esta sesión se cerrará automáticamente.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {/* BOTONES SEGÚN ROL */}
            {user?.rol_id === 2 ? (
              <button onClick={() => navigate("/dashboard")} className="login-button">
                Ir al Dashboard
              </button>
            ) : user?.rol_id === 3 ? (
              <button onClick={() => navigate("/gestion-usuarios")} className="login-button">
                Gestión de Usuarios
              </button>
            ) : (
              <button onClick={() => navigate("/")} className="login-button">
                Ir al Inicio
              </button>
            )}

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="registro-button"
              style={{
                backgroundColor: "transparent",
                color: "#A0522D",
                border: "2px solid #A0522D",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">
          <FaSignInAlt className="login-icon" />
          Iniciar Sesión
        </h2>
        
        {/* Advertencia de sesión única */}
        {showSessionWarning && (
          <div className="session-warning" style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FaExclamationTriangle style={{ color: '#856404', marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#856404' }}>Sesión detectada en otro dispositivo</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#856404', fontSize: '0.9rem' }}>
                  Para iniciar sesión aquí, debes cerrar la sesión activa en otros dispositivos.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleForceLogout}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Procesando...' : 'Cerrar otras sesiones'}
              </button>
              <button 
                onClick={() => {
                  setShowSessionWarning(false);
                  setError('');
                }}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#856404',
                  border: '1px solid #856404',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {error && !showSessionWarning && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              disabled={loading}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Contraseña"
              required
              disabled={loading}
              className="form-input"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="login-button"
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Iniciando sesión..." : "Entrar"}
          </button>
        </form>

        {/* Información sobre sesión única */}
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaInfoCircle style={{ color: '#6c757d', fontSize: '0.9rem' }} />
          <p style={{ 
            margin: 0, 
            fontSize: '0.8rem', 
            color: '#6c757d'
          }}>
            <strong>Sesión única:</strong> Solo puedes estar conectado en un dispositivo a la vez
          </p>
        </div>

        {/* Enlace para registrarse */}
        <p className="login-link">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="link-register">
            Regístrate aquí
          </Link>
        </p>

        {/* Enlace para volver al inicio */}
        <p className="login-link">
          <Link to="/" className="link-register">
            ← Volver al Inicio
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;