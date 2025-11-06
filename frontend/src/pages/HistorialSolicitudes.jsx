import React, { useState, useEffect } from "react";
import axios from "../services/api/axiosConfig";
import Navbar from "../components/Navbar";
import "../styles/App.css";

const HistorialSolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await axios.get("/solicitudes/historial", {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Respuesta del historial:", response.data);
      
      if (response.data.solicitudes && response.data.solicitudes.length > 0) {
        setSolicitudes(response.data.solicitudes);
      } else {
        setSolicitudes([]);
      }
    } catch (err) {
      console.error("Error cargando historial:", err);
      setError(err.response?.data?.error || "Error al cargar el historial de solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const obtenerNombreRubro = (rubroId) => {
    const rubros = {
      1: "Gastronomía",
      2: "Artesanía", 
      3: "Reventa"
    };
    return rubros[rubroId] || "No especificado";
  };

  const obtenerEstadoSolicitud = (solicitud) => {
    if (solicitud.estado_solicitud_id === 1) return "Pendiente";
    if (solicitud.estado_solicitud_id === 2) return "Aprobada";
    if (solicitud.estado_solicitud_id === 3) return "Rechazada";
    if (solicitud.estado_solicitud_id === 4) return "Cancelada";
    return "Desconocido";
  };

  const obtenerClaseEstado = (solicitud) => {
    if (solicitud.estado_solicitud_id === 1) return "estado-pendiente";
    if (solicitud.estado_solicitud_id === 2) return "estado-aprobada";
    if (solicitud.estado_solicitud_id === 3) return "estado-rechazada";
    if (solicitud.estado_solicitud_id === 4) return "estado-cancelada";
    return "estado-desconocido";
  };

  const verDetalle = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setMostrarDetalle(true);
  };

  const cerrarDetalle = () => {
    setMostrarDetalle(false);
    setSolicitudSeleccionada(null);
  };

  const formatearFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="historial-solicitudes">
          <div className="cargando">Cargando historial de solicitudes...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      
      {/* Modal de detalle */}
      {mostrarDetalle && solicitudSeleccionada && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal-detalle-solicitud" onClick={(e) => e.stopPropagation()}>
            <button className="btn-cerrar-modal" onClick={cerrarDetalle}>
              ×
            </button>
            
            <h2>Detalle de la Solicitud #{solicitudSeleccionada.solicitud_id}</h2>
            
            <div className="detalle-contenido">
              <div className="campo-grupo">
                <div className="campo">
                  <label>Estado:</label>
                  <span className={`badge-estado ${obtenerClaseEstado(solicitudSeleccionada)}`}>
                    {obtenerEstadoSolicitud(solicitudSeleccionada)}
                  </span>
                </div>
                
                <div className="campo">
                  <label>Fecha de solicitud:</label>
                  <span>{formatearFecha(solicitudSeleccionada.fecha_solicitud)}</span>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Descripción:</label>
                  <div className="valor-descripcion">
                    {solicitudSeleccionada.descripcion || "No especificada"}
                  </div>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Dimensiones:</label>
                  <span>
                    {solicitudSeleccionada.dimensiones_ancho} m × {solicitudSeleccionada.dimensiones_largo} m
                  </span>
                </div>
                
                <div className="campo">
                  <label>Parcelas necesarias:</label>
                  <span>{solicitudSeleccionada.parcelas_necesarias}</span>
                </div>
              </div>

              <div className="campo-grupo">
                <div className="campo">
                  <label>Rubro:</label>
                  <span>{obtenerNombreRubro(solicitudSeleccionada.rubro_id)}</span>
                </div>
                
                <div className="campo">
                  <label>Costo total:</label>
                  <span className="valor-destacado">${solicitudSeleccionada.costo_total}</span>
                </div>
              </div>

              {/* Fotos de la solicitud */}
              {solicitudSeleccionada.fotos && solicitudSeleccionada.fotos.length > 0 && (
                <div className="seccion-fotos">
                  <h3>Fotos del Puesto ({solicitudSeleccionada.fotos.length})</h3>
                  <div className="galeria-fotos-detalle">
                    {solicitudSeleccionada.fotos.map((foto, index) => (
                      <div key={foto.foto_id} className="foto-item-detalle">
                        <img 
                          src={foto.image_url} 
                          alt={`Foto del puesto ${index + 1}`}
                          className="foto-puesto-detalle"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="historial-solicitudes">
        <div className="historial-contenido">
          <div className="historial-header">
            <h1>Historial de Solicitudes</h1>
            <p>Aquí puedes ver todas tus solicitudes anteriores</p>
          </div>

          {error && <div className="mensaje-error">{error}</div>}

          {solicitudes.length === 0 ? (
            <div className="sin-solicitudes">
              <h3>No tienes solicitudes registradas</h3>
              <p>Cuando realices solicitudes, aparecerán listadas aquí.</p>
            </div>
          ) : (
            <div className="lista-solicitudes">
              {solicitudes.map((solicitud) => (
                <div key={solicitud.solicitud_id} className="tarjeta-solicitud">
                  <div className="tarjeta-header">
                    <div className="tarjeta-titulo">
                      <h3>Solicitud #{solicitud.solicitud_id}</h3>
                      <span className={`badge-estado ${obtenerClaseEstado(solicitud)}`}>
                        {obtenerEstadoSolicitud(solicitud)}
                      </span>
                    </div>
                    <span className="tarjeta-fecha">
                      {formatearFecha(solicitud.fecha_solicitud)}
                    </span>
                  </div>

                  <div className="tarjeta-contenido">
                    <div className="tarjeta-info">
                      <div className="info-item">
                        <strong>Rubro:</strong> {obtenerNombreRubro(solicitud.rubro_id)}
                      </div>
                      <div className="info-item">
                        <strong>Dimensiones:</strong> {solicitud.dimensiones_ancho}m × {solicitud.dimensiones_largo}m
                      </div>
                      <div className="info-item">
                        <strong>Parcelas:</strong> {solicitud.parcelas_necesarias}
                      </div>
                      <div className="info-item">
                        <strong>Costo:</strong> ${solicitud.costo_total}
                      </div>
                    </div>
                    
                    {solicitud.descripcion && (
                      <div className="tarjeta-descripcion">
                        <strong>Descripción:</strong> 
                        {solicitud.descripcion.length > 100 
                          ? `${solicitud.descripcion.substring(0, 100)}...` 
                          : solicitud.descripcion
                        }
                      </div>
                    )}

                    {solicitud.fotos && solicitud.fotos.length > 0 && (
                      <div className="tarjeta-fotos">
                        <strong>Fotos:</strong> {solicitud.fotos.length} imagen(es)
                      </div>
                    )}
                  </div>

                  <div className="tarjeta-acciones">
                    <button 
                      className="btn-ver-detalle"
                      onClick={() => verDetalle(solicitud)}
                    >
                      Ver Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialSolicitudes;