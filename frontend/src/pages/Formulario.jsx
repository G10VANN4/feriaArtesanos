import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "../services/api/axiosConfig";
import Navbar from "../components/Navbar";
import "../styles/App.css";

const Formulario = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    telefono: "",
    descripcion: "",
    dimensiones_ancho: "",
    dimensiones_largo: "",
    rubro_id: "",
    terminos_aceptados: false,
  });

  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      // Completar perfil del artesano
      await axios.post(
        "/artesano/perfil",
        {
          nombre: formData.nombre,
          dni: formData.dni,
          telefono: formData.telefono,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Crear solicitud
      const formPayload = new FormData();
      formPayload.append("descripcion", formData.descripcion);
      formPayload.append("dimensiones_ancho", formData.dimensiones_ancho);
      formPayload.append("dimensiones_largo", formData.dimensiones_largo);
      formPayload.append("rubro_id", formData.rubro_id);
      formPayload.append("terminos_aceptados", formData.terminos_aceptados);

      // Agregar imágenes si las hay
      imagenes.forEach((img) => formPayload.append("imagenes", img));

      const response = await axios.post("/solicitudes", formPayload, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        navigate("/"); // Redirige al home al completar
      } else {
        setError("Error al enviar la solicitud");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.msg || err.message || "Error interno del sistema"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="formulario-container">
        <div className="formulario-card">
          <h2 className="registro-title">Formulario del Artesano</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="registro-form">
            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre completo:</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
                className="form-input"
              />
            </div>

            {/* DNI */}
            <div className="form-group">
              <label className="form-label">DNI:</label>
              <input
                type="number"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Teléfono */}
            <div className="form-group">
              <label className="form-label">Teléfono:</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 11 5555-5555"
                required
                className="form-input"
              />
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label className="form-label">Descripción del puesto:</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Describe qué vendes, etc."
                required
                className="form-input"
              />
            </div>

            {/* Fotos */}
            <div className="form-group">
              <label className="form-label">Fotos del Puesto:</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImagenes(Array.from(e.target.files))}
                className="form-input"
              />
            </div>

            {/* Dimensiones */}
            <div className="form-group dimensiones-container">
              <label className="form-label">Dimensiones del puesto (m):</label>
              <div className="dimensiones-inputs">
                <input
                  type="number"
                  name="dimensiones_ancho"
                  value={formData.dimensiones_ancho}
                  onChange={handleChange}
                  placeholder="Ancho"
                  min="0"
                  step="0.1"
                  required
                  className="form-input"
                />
                <span className="dimensiones-separador">x</span>
                <input
                  type="number"
                  name="dimensiones_largo"
                  value={formData.dimensiones_largo}
                  onChange={handleChange}
                  placeholder="Largo"
                  min="0"
                  step="0.1"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Rubro */}
            <div className="form-group">
              <label className="form-label">Rubro:</label>
              <select
                name="rubro_id"
                value={formData.rubro_id}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="">Seleccione un rubro</option>
                <option value="1">Gastronomía</option>
                <option value="2">Artesanía</option>
                <option value="3">Reventa</option>
              </select>
            </div>

            {/* Términos */}
            <div className="form-group terminos-container">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="terminos_aceptados"
                  checked={formData.terminos_aceptados}
                  onChange={handleChange}
                  required
                />
                <span className="checkbox-label">
                  Acepto los{" "}
                  <a href="/terminos" target="_blank">
                    términos y condiciones
                  </a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="registro-button"
            >
              {loading ? "Enviando..." : "Enviar Formulario"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Formulario;
