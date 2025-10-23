import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth.jsx";
import "../styles/App.css";

const Registro = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { email, password, confirmPassword } = formData;

    // Validaciones
    if (!email || !password || !confirmPassword) {
      setError("Todos los campos obligatorios deben ser completados");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError("El email no es válido");
      setLoading(false);
      return;
    }

    try {
      const result = await register(formData);
      
      if (result.success) {
        navigate("/login", { 
          replace: true, 
          state: { message: "Registro exitoso. Ahora puedes iniciar sesión." } 
        });
      } else {
        setError(result.message || "Error en el registro");
      }
    } catch {
      setError("Error interno del sistema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-container">
      <div className="registro-card">
        <h2 className="registro-title">
          <FaUserPlus className="registro-icon" />
          Crear Cuenta
        </h2>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="registro-form">
          <div className="form-group">
            <label className="form-label">Email: *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contraseña: *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Confirmar Contraseña: *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
              className="form-input"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="registro-button"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>
        
        {/* Enlace para iniciar sesión */}
        <p className="registro-link">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="link-login">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Registro;