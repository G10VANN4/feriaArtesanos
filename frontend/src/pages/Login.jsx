import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { FaSignInAlt } from "react-icons/fa";
import "../styles/App.css";

const Login = () => {
  const { login, isAuthenticated, user, logout } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { email, password } = formData;

    try {
      const result = await login(email, password);

      if (result.success) {
        localStorage.setItem('access_token', result.token);
        localStorage.setItem('user_role', result.role || 'admin');
        
        // ✅ REDIRECCIÓN SEGÚN ROL
        if (result.rol_id === 2) { // Administrador
          navigate("/dashboard", { replace: true });
        } else if (result.rol_id === 3) { // Organizador
          navigate("/gestion-usuarios", { replace: true });
        } else { // Artesano u otros
          navigate("/", { replace: true });
        }

        setError("¡Inicio de sesión exitoso! Puedes continuar navegando.");
        setFormData({ email: "", password: "" });

      } else {
        setError(result.message || "Error al iniciar sesión");
      }
    } catch {
      setError("Error interno del sistema");
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
        {error && <div className="error-message">{error}</div>}

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
          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Iniciando sesión..." : "Entrar"}
          </button>
        </form>

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
