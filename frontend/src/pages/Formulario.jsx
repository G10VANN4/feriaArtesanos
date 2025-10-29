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
  const [imagenesPreviews, setImagenesPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Función para convertir archivos a base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

const handleImageChange = async (e) => {
  const files = Array.from(e.target.files);

  if (files.length === 0) return;

  // Limitar a máximo 5 archivos
  if (files.length > 5) {
    setError("¡Máximo 5 imágenes permitidas! Se eliminarán las extras.");
    files.splice(5); // eliminar todo lo que sobre del array
  } else {
    setError("");
  }

  // Validar tamaño de archivos (máx 2MB)
  const oversizedFiles = files.filter(file => file.size > 2 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    setError("Algunas imágenes son demasiado grandes (máx 2MB cada una)");
    files = files.filter(file => file.size <= 2 * 1024 * 1024);
  }

  try {
    const base64Promises = files.map(file => convertToBase64(file));
    const base64Images = await Promise.all(base64Promises);

    // Previews
    const previews = base64Images.map(img => ({
      src: img,
      name: `imagen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));

    setImagenes(base64Images);        // array real de base64
    setImagenesPreviews(previews);
  } catch (error) {
    console.error("Error procesando imágenes:", error);
    setError("Error al procesar las imágenes");
  }
};



  const removeImage = (index) => {
    const newImagenes = [...imagenes];
    const newPreviews = [...imagenesPreviews];
    
    newImagenes.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImagenes(newImagenes);
    setImagenesPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validaciones
    if (!formData.terminos_aceptados) {
      setError("Debe aceptar los términos y condiciones");
      setLoading(false);
      return;
    }

    if (formData.dimensiones_ancho <= 0 || formData.dimensiones_largo <= 0) {
      setError("Las dimensiones deben ser mayores a 0");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const solicitudData = {
        nombre: formData.nombre,
        dni: formData.dni,
        telefono: formData.telefono,
        descripcion: formData.descripcion,
        dimensiones_ancho: parseFloat(formData.dimensiones_ancho),
        dimensiones_largo: parseFloat(formData.dimensiones_largo),
        rubro_id: parseInt(formData.rubro_id),
        terminos_aceptados: formData.terminos_aceptados,
        fotos: imagenes // Imágenes en base64
      };

      console.log("Enviando solicitud con imágenes:", {
        ...solicitudData,
        fotos: [`${imagenes.length} imágenes`] 
      });

      const response = await axios.post("/solicitudes", solicitudData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        alert(" Solicitud enviada exitosamente");
        // Limpiar formulario
        setFormData({
          nombre: "",
          dni: "",
          telefono: "",
          descripcion: "",
          dimensiones_ancho: "",
          dimensiones_largo: "",
          rubro_id: "",
          terminos_aceptados: false,
        });
        setImagenes([]);
        setImagenesPreviews([]);
        navigate("/");
      }
    } catch (err) {
      console.error("Error completo:", err);
      setError(
        err.response?.data?.msg || 
        err.response?.data?.error || 
        err.message || 
        "Error interno del sistema"
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
                maxLength="20"
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
                placeholder="Ej: 12345678"
                required
                max="99999999"
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
                maxLength="20"
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
                placeholder="Describe qué vendes, materiales que utilizas, etc."
                required
                className="form-input"
                rows="4"
              />
            </div>

            {/* Fotos */}
            <div className="form-group">
              <label className="form-label">Fotos del Puesto:</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="form-input"
              />
              <small className="file-info">
                Máximo 5 imágenes, 2MB cada una. Formatos: JPG, PNG, GIF.
              </small>
              <small className="file-info">
                Si ingresa mas solo se guardaran las primeras 5.
              </small>
              {/* Preview de imágenes */}
              {imagenesPreviews.length > 0 && (
                <div className="image-previews">
                  <h4>Imágenes seleccionadas ({imagenesPreviews.length}/5):</h4>
                  <div className="preview-container">
                    {imagenesPreviews.map((preview, index) => (
                      <div key={index} className="image-preview">
                        <img src={preview.src} alt={`Preview ${index + 1}`} />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeImage(index)}
                          title="Eliminar imagen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dimensiones */}
            <div className="form-group dimensiones-container">
              <label className="form-label">Dimensiones del puesto (metros):</label>
              <div className="dimensiones-inputs">
                <input
                  type="number"
                  name="dimensiones_ancho"
                  value={formData.dimensiones_ancho}
                  onChange={handleChange}
                  placeholder="Ancho"
                  min="0.1"
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
                  min="0.1"
                  step="0.1"
                  required
                  className="form-input"
                />
                <span className="dimensiones-unidad">m</span>
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
                  <a href="/terminos" target="_blank" rel="noopener noreferrer">
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