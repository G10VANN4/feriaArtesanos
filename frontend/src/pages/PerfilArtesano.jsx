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
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    dni: ""
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

      console.log("Respuesta completa de la API:", response.data); // DEBUG
      
      if (response.data.solicitud) {
        console.log("Datos de solicitud:", response.data.solicitud); // DEBUG
        console.log("Rubro en solicitud:", response.data.solicitud.rubro_nombre); // DEBUG
        
        setPerfil(response.data.perfil_artesano);
        setSolicitud(response.data.solicitud);
        
        setFormData({
          nombre: response.data.perfil_artesano.nombre,
          telefono: response.data.perfil_artesano.telefono,
          dni: response.data.perfil_artesano.dni
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
      
    const rubro = [
      'rubro_id'
    ];
    let rubroId = null;
    for (let campo of rubro) {
      if (solicitud[campo] !== undefined && solicitud[campo] !== null) {
        rubroId = solicitud[campo];
         break;
      }
    }

    if (rubroId === null) {
      const rubro = ['rubro_nombre', 'nombre_rubro', 'rubro_nombre'];
      for (let campo of rubro) {
        if (solicitud[campo]) {
          return solicitud[campo];
        }
      }
      return "No especificado";
    }
      
      
    const rubros = {
      1: "Gastronomía",
      2: "Reventa", 
      3: "Artesanía"
    };
      
    return rubros[rubroId] || "No especificado";
  };

  
  const handleEdit = () => {
    setEditando(true);
  };

  const handleCancel = () => {
    setFormData({
      nombre: perfil.nombre,
      telefono: perfil.telefono,
      dni: perfil.dni
    });
    setEditando(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSave = async () => {
    try {
      setGuardando(true);
      setError("");
      
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/solicitudes/${solicitud.solicitud_id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 200) {
        setPerfil(response.data.perfil_artesano);
        setSolicitud(response.data.solicitud);
        setEditando(false);
        alert(response.data.msg);
      }
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

          {/* Información de la Solicitud - Solo lectura */}
          <div className="seccion-datos seccion-solo-lectura">
            <h2>Información de la Solicitud</h2>
            <div className="info-puesto">
              <div className="campo-grupo">
                <div className="campo-solo-lectura full-width">
                  <label>Descripción:</label>
                  <div className="valor-solo-lectura descripcion">
                    {solicitud.descripcion}
                  </div>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo-solo-lectura">
                  <label>Dimensiones:</label>
                  <div className="valor-solo-lectura">
                    {solicitud.dimensiones_ancho} m x {solicitud.dimensiones_largo} m
                  </div>
                </div>

                <div className="campo-solo-lectura">
                  <label>Parcelas necesarias:</label>
                  <div className="valor-solo-lectura">
                    {solicitud.parcelas_necesarias}
                  </div>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo-solo-lectura">
                  <label>Costo total:</label>
                  <div className="valor-solo-lectura valor-destacado">
                    ${solicitud.costo_total}
                  </div>
                </div>

                <div className="campo-solo-lectura">
                  <label>Rubro:</label>
                  <div className="valor-solo-lectura">
                    {obtenerNombreRubro()} {/* Usamos la función aquí */}
                  </div>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo-solo-lectura">
                  <label>Fecha de solicitud:</label>
                  <div className="valor-solo-lectura">
                    {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fotos de la solicitud */}
          {solicitud.fotos && solicitud.fotos.length > 0 && (
            <div className="seccion-datos seccion-solo-lectura">
              <h2>Fotos del Puesto ({solicitud.fotos.length})</h2>
              <div className="galeria-fotos">
                {solicitud.fotos.map((foto, index) => (
                  <div 
                    key={foto.foto_id} 
                    className="foto-item"
                    onClick={() => ampliarImagen(foto.image_url)}
                  >
                    <img 
                      src={foto.image_url} 
                      alt={`Foto del puesto ${index + 1}`}
                      className="foto-puesto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfilArtesano;