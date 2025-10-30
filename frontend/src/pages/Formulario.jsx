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

  const [imagenes, setImagenes] = useState([]); // Array de File objects
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

  // Función para crear preview de imágenes (sin base64)
  const createImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
    });
  };

  const handleImageChange = async (e) => {
    let files = Array.from(e.target.files);
    setError("");

    if (files.length === 0) return;

    // Limitar a máximo 5 archivos
    if (files.length > 5) {
      setError("¡Máximo 5 imágenes permitidas! Se seleccionarán las primeras 5.");
      files = files.slice(0, 5);
    }

    // Validar tipos de archivo (solo JPG y PNG)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError("Solo se permiten archivos JPG y PNG. Los archivos no válidos serán ignorados.");
      files = files.filter(file => validTypes.includes(file.type));
    }

    // Validar tamaño de archivos (máx 2MB)
    const oversizedFiles = files.filter(file => file.size > 2 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError("Algunas imágenes son demasiado grandes (máx 2MB cada una). Serán ignoradas.");
      files = files.filter(file => file.size <= 2 * 1024 * 1024);
    }

    if (files.length === 0) {
      setError("No hay imágenes válidas para subir.");
      return;
    }

    try {
      // Crear previews para mostrar al usuario
      const previewPromises = files.map(file => createImagePreview(file));
      const previews = await Promise.all(previewPromises);

      const previewsWithNames = previews.map((preview, index) => ({
        src: preview,
        name: files[index].name
      }));

      setImagenes(files); // Guardar los archivos File originales
      setImagenesPreviews(previewsWithNames);
    } catch (error) {
      console.error("Error creando previews:", error);
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

    if (imagenes.length === 0) {
      setError("Debe subir al menos una imagen");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();
      
      // Agregar campos del formulario
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('dni', formData.dni);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('dimensiones_ancho', formData.dimensiones_ancho);
      formDataToSend.append('dimensiones_largo', formData.dimensiones_largo);
      formDataToSend.append('rubro_id', formData.rubro_id);
      formDataToSend.append('terminos_aceptados', formData.terminos_aceptados);

      // Agregar imágenes como archivos
      imagenes.forEach((file, index) => {
        formDataToSend.append('fotos', file);
      });

      console.log("Enviando solicitud con:", {
        datos: formData,
        imagenes: `${imagenes.length} archivos`
      });

      const response = await axios.post("/solicitudes", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        const { data } = response;
        
        if (data.notificacion) {
          alert(` ${data.msg}\n\n ${data.notificacion}`);
        } else {
          alert(` ${data.msg}`);
        }
        
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
      const errorMessage = err.response?.data?.msg || 
                          err.response?.data?.error || 
                          err.message || 
                          "Error interno del sistema";
      
      setError(errorMessage);
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
              <small className="form-help">Máximo 20 caracteres</small>
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
              <small className="form-help">Máximo 8 dígitos</small>
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
              <small className="form-help">Máximo 20 caracteres</small>
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
                accept=".jpg,.jpeg,.png"
                onChange={handleImageChange}
                className="form-input"
              />
              <small className="file-info">
                 Máximo 5 imágenes, 2MB cada una. 
                <br />
                 Formatos permitidos: JPG, PNG
              </small>
              
              {/* Preview de imágenes */}
              {imagenesPreviews.length > 0 && (
                <div className="image-previews">
                  <h4>Imágenes seleccionadas ({imagenesPreviews.length}/5):</h4>
                  <div className="preview-container">
                    {imagenesPreviews.map((preview, index) => (
                      <div key={index} className="image-preview">
                        <img src={preview.src} alt={`Preview ${preview.name}`} />
                        <span className="image-name">{preview.name}</span>
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
              <small className="form-help">
                Las parcelas son de 3x3 metros. Se calcularán automáticamente.
              </small>
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
              disabled={loading || imagenes.length === 0}
              className="registro-button"
            >
              {loading ? " Enviando..." : " Enviar Formulario"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Formulario;