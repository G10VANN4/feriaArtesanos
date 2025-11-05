import React, { useState, useEffect } from "react";
import axios from "../services/api/axiosConfig";
import Navbar from "../components/Navbar";
import "../styles/App.css";

const PerfilArtesano = () => {
  const [perfil, setPerfil] = useState(null);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [nuevasFotos, setNuevasFotos] = useState([]);
  const [fotosAEliminar, setFotosAEliminar] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    dni: "",
    descripcion: "",
    dimensiones_ancho: "",
    dimensiones_largo: "",
    rubro_id: ""
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("/solicitudes", {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Respuesta completa de la API:", response.data);
      
      if (response.data.solicitud) {
        console.log("Datos de solicitud:", response.data.solicitud);
        
        setPerfil(response.data.perfil_artesano);
        setSolicitud(response.data.solicitud);
        
        setFormData({
          nombre: response.data.perfil_artesano.nombre,
          telefono: response.data.perfil_artesano.telefono,
          dni: response.data.perfil_artesano.dni,
          descripcion: response.data.solicitud.descripcion,
          dimensiones_ancho: response.data.solicitud.dimensiones_ancho,
          dimensiones_largo: response.data.solicitud.dimensiones_largo,
          rubro_id: response.data.solicitud.rubro_id
        });
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos del perfil");
    } finally {
      setLoading(false);
    }
  };

  const obtenerNombreRubro = () => {
    if (!solicitud) return "No especificado";
    
    const rubroId = solicitud.rubro_id;
    
    const rubros = {
      1: "Gastronomía",
      2: "Artesanía", 
      3: "Reventa"
    };
      
    return rubros[rubroId] || "No especificado";
  };

  const handleEdit = () => {
    setEditando(true);
    setNuevasFotos([]);
    setFotosAEliminar([]);
  };

  const handleCancel = () => {
    setFormData({
      nombre: perfil.nombre,
      telefono: perfil.telefono,
      dni: perfil.dni,
      descripcion: solicitud.descripcion,
      dimensiones_ancho: solicitud.dimensiones_ancho,
      dimensiones_largo: solicitud.dimensiones_largo,
      rubro_id: solicitud.rubro_id
    });
    setEditando(false);
    setNuevasFotos([]);
    setFotosAEliminar([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validar cantidad máxima de fotos
    const fotosActuales = solicitud.fotos ? solicitud.fotos.length : 0;
    const fotosDespuesEliminar = fotosActuales - fotosAEliminar.length;
    const totalFotos = fotosDespuesEliminar + nuevasFotos.length + files.length;
    
    if (totalFotos > 5) {
      setError("No puedes tener más de 5 fotos en total");
      return;
    }
    
    setNuevasFotos([...nuevasFotos, ...files]);
  };

  const eliminarFotoExistente = (fotoId) => {
    setFotosAEliminar([...fotosAEliminar, fotoId]);
  };

  const eliminarNuevaFoto = (index) => {
    const nuevas = [...nuevasFotos];
    nuevas.splice(index, 1);
    setNuevasFotos(nuevas);
  };

  const handleSave = async () => {
    try {
      setGuardando(true);
      setError("");
      
      const token = localStorage.getItem("token");
      
      // 1. Actualizar datos de la solicitud
      const response = await axios.put(
        `/solicitudes/${solicitud.solicitud_id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // 2. Eliminar fotos marcadas para eliminar
      for (const fotoId of fotosAEliminar) {
        await axios.delete(`/solicitudes/fotos/${fotoId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // 3. Agregar nuevas fotos
      if (nuevasFotos.length > 0) {
        const formDataFotos = new FormData();
        nuevasFotos.forEach((foto, index) => {
          formDataFotos.append('fotos', foto);
        });

        await axios.post(
          `/solicitudes/${solicitud.solicitud_id}/fotos`,
          formDataFotos,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      // Recargar datos
      await cargarDatos();
      setEditando(false);
      setNuevasFotos([]);
      setFotosAEliminar([]);
      alert("Datos actualizados exitosamente");
      
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 
                          err.response?.data?.error || 
                          "Error al guardar los cambios";
      setError(errorMessage);
    } finally {
      setGuardando(false);
    }
  };

  const ampliarImagen = (imageUrl) => {
    setImagenAmpliada(imageUrl);
  };

  const cerrarImagen = () => {
    setImagenAmpliada(null);
  };

  // Función auxiliar para obtener fotos que no están marcadas para eliminar
  const obtenerFotosVisibles = () => {
    if (!solicitud.fotos) return [];
    return solicitud.fotos.filter(foto => !fotosAEliminar.includes(foto.foto_id));
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="perfil-artesano">
          <div className="cargando">Cargando datos del perfil...</div>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div>
        <Navbar />
        <div className="perfil-artesano">
          <div className="mensaje-error">No se encontró ninguna solicitud</div>
        </div>
      </div>
    );
  }

  const fotosVisibles = obtenerFotosVisibles();
  const totalFotos = fotosVisibles.length + nuevasFotos.length;

  return (
    <div>
      <Navbar />
      
      {/* Modal para imagen ampliada */}
      {imagenAmpliada && (
        <div className="modal-overlay" onClick={cerrarImagen}>
          <div className="modal-imagen" onClick={(e) => e.stopPropagation()}>
            <button className="btn-cerrar-modal" onClick={cerrarImagen}>
              ×
            </button>
            <img 
              src={imagenAmpliada} 
              alt="Imagen ampliada del puesto"
            />
          </div>
        </div>
      )}

      <div className="perfil-artesano">
        <div className="perfil-contenido">
          {/* Header centrado */}
          <div className="perfil-header">
            <h1>Mi Perfil de Artesano</h1>
          </div>

          {error && <div className="mensaje-error">{error}</div>}

          <div className="seccion-datos seccion-editable">
            <div className="seccion-header">
              <h2>Información Personal</h2>
              {!editando ? (
                <button 
                  className="btn-editar"
                  onClick={handleEdit}
                >
                  Editar
                </button>
              ) : (
                <div className="grupo-botones-header">
                  <button 
                    className="btn-guardar"
                    onClick={handleSave}
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : " Guardar"}
                  </button>
                  <button 
                    className="btn-cancelar"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            
            <div className="campo-grupo">
              <div className="campo">
                <label>Nombre:</label>
                {editando ? (
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    maxLength="20"
                  />
                ) : (
                  <div className="valor-solo-lectura">{perfil.nombre}</div>
                )}
              </div>

              <div className="campo">
                <label>Teléfono:</label>
                {editando ? (
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    maxLength="20"
                  />
                ) : (
                  <div className="valor-solo-lectura">{perfil.telefono}</div>
                )}
              </div>

              <div className="campo">
                <label>DNI:</label>
                {editando ? (
                  <input
                    type="number"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    max="99999999"
                  />
                ) : (
                  <div className="valor-solo-lectura">{perfil.dni}</div>
                )}
              </div>
            </div>
          </div>

          {/* Información de la Solicitud - Editable */}
          <div className="seccion-datos seccion-editable">
            <h2>Información de la Solicitud</h2>
            <div className="info-puesto">
              <div className="campo-grupo">
                <div className="campo full-width">
                  <label>Descripción:</label>
                  {editando ? (
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      maxLength="500"
                      rows="4"
                      className="form-textarea"
                    />
                  ) : (
                    <div className="valor-solo-lectura descripcion">
                      {solicitud.descripcion}
                    </div>
                  )}
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Ancho (m):</label>
                  {editando ? (
                    <input
                      type="number"
                      step="0.1"
                      name="dimensiones_ancho"
                      value={formData.dimensiones_ancho}
                      onChange={handleChange}
                      min="0.1"
                    />
                  ) : (
                    <div className="valor-solo-lectura">
                      {solicitud.dimensiones_ancho} m
                    </div>
                  )}
                </div>

                <div className="campo">
                  <label>Largo (m):</label>
                  {editando ? (
                    <input
                      type="number"
                      step="0.1"
                      name="dimensiones_largo"
                      value={formData.dimensiones_largo}
                      onChange={handleChange}
                      min="0.1"
                    />
                  ) : (
                    <div className="valor-solo-lectura">
                      {solicitud.dimensiones_largo} m
                    </div>
                  )}
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Parcelas necesarias:</label>
                  <div className="valor-solo-lectura">
                    {solicitud.parcelas_necesarias}
                  </div>
                </div>

                <div className="campo">
                  <label>Costo total:</label>
                  <div className="valor-solo-lectura valor-destacado">
                    ${solicitud.costo_total}
                  </div>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Rubro:</label>
                  {editando ? (
                    <select
                      name="rubro_id"
                      value={formData.rubro_id}
                      onChange={handleChange}
                      className="form-input"
                    >
                      <option value="1">Gastronomía</option>
                      <option value="2">Artesanía</option>
                      <option value="3">Reventa</option>
                    </select>
                  ) : (
                    <div className="valor-solo-lectura">
                      {obtenerNombreRubro()}
                    </div>
                  )}
                </div>

                <div className="campo">
                  <label>Fecha de solicitud:</label>
                  <div className="valor-solo-lectura">
                    {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fotos de la solicitud - Editable */}
          <div className="seccion-datos seccion-editable">
            <h2>Fotos del Puesto ({totalFotos}/5)</h2>
            
            {editando && (
              <div className="agregar-fotos">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  disabled={totalFotos >= 5}
                />
                <small>Formatos permitidos: JPG, PNG. Máximo 5 fotos en total.</small>
              </div>
            )}

            <div className="galeria-fotos">
              {/* Fotos existentes */}
              {fotosVisibles.map((foto, index) => (
                <div key={foto.foto_id} className="foto-item">
                  <img 
                    src={foto.image_url} 
                    alt={`Foto del puesto ${index + 1}`}
                    className="foto-puesto"
                    onClick={() => ampliarImagen(foto.image_url)}
                  />
                  {editando && (
                    <button 
                      className="btn-eliminar-foto"
                      onClick={() => eliminarFotoExistente(foto.foto_id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              {/* Nuevas fotos */}
              {nuevasFotos.map((foto, index) => (
                <div key={`nueva-${index}`} className="foto-item">
                  <img 
                    src={URL.createObjectURL(foto)} 
                    alt={`Nueva foto ${index + 1}`}
                    className="foto-puesto"
                  />
                  {editando && (
                    <button 
                      className="btn-eliminar-foto"
                      onClick={() => eliminarNuevaFoto(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilArtesano;