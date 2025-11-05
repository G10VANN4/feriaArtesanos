// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FiEdit3,
  FiEye,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertTriangle,
  FiSearch,
  FiDownload,
  FiUsers
} from "react-icons/fi";
import axios from "axios";
import "../styles/App.css";
import Navbar from "../components/Navbar";
import EstadisticasUsuarios from "../components/EstadisticasUsuarios";

const API_BASE_URL = "http://localhost:5000/api/v1";

const RUBROS = {
  "Artesanías": { badgeColor: "bg-blue-600" },
  "Gastronomía": { badgeColor: "bg-red-600" },
  "Reventa": { badgeColor: "bg-green-600" },
};

const ESTADOS = {
  "Aprobada": { badge: "bg-green-500", icon: <FiCheckCircle /> },
  "Pendiente": { badge: "bg-yellow-500", icon: <FiClock /> },
  "Rechazada": { badge: "bg-red-500", icon: <FiXCircle /> },
  "Cancelada": { badge: "bg-gray-500", icon: <FiTrash2 /> },
  "Pendiente por Modificación": { badge: "bg-orange-500", icon: <FiAlertTriangle /> },
};

const ESTADOS_ADMIN = ["Aprobada", "Pendiente", "Rechazada", "Pendiente por Modificación"];

const Dashboard = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rubrosStatsAprobadas, setRubrosStatsAprobadas] = useState({});
  const [rubrosStatsTodas, setRubrosStatsTodas] = useState({});
  const [filtroRubro, setFiltroRubro] = useState('all');

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ estado_solicitud: "Pendiente", notas_admin: "" });
  const [solicitudDetails, setSolicitudDetails] = useState(null);
  const [activeSolicitudId, setActiveSolicitudId] = useState(null);

  // Función para cargar estadísticas de TODAS las solicitudes por rubro
  const fetchRubrosStatsTodas = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/estadisticas/rubros/todas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRubrosStatsTodas(response.data);
    } catch (error) {
      console.error("Error al cargar estadísticas de rubros (todas):", error);
    }
  };

  // Función para cargar estadísticas de SOLO aprobadas
  const fetchRubrosStatsAprobadas = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/estadisticas/rubros`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRubrosStatsAprobadas(response.data);
    } catch (error) {
      console.error("Error al cargar estadísticas de rubros (aprobadas):", error);
    }
  };

  // Función para cargar estadísticas generales (para mantener compatibilidad)
  const fetchRubrosStats = async () => {
    await Promise.all([
      fetchRubrosStatsTodas(),
      fetchRubrosStatsAprobadas()
    ]);
  };

  const fetchSolicitudes = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          filtro_estado: filter !== "all" ? filter : undefined,
          busqueda_termino: searchTerm || undefined,
        },
      });
      
      console.log("Datos recibidos del backend:", response.data);
      
      const solicitudesMapeadas = response.data.map((item) => ({
        ...item,
        originalData: item.originalData,
        id: item.id,
        nombre: item.nombre,
        rubro: item.rubro,
        alto: item.originalData?.alto,
        ancho: item.originalData?.ancho,
        dimensiones: item.dimensiones,
        email: item.originalData?.email,
        dni: item.originalData?.dni,
        telefono: item.originalData?.telefono,
        descripcion_puesto: item.originalData?.descripcion_puesto,
        foto_puesto: item.originalData?.foto_puesto,
        fecha_creacion: item.originalData?.fecha_solicitud,
        artesano_id: item.artesano_id,
        estado: item.estado
      }));
      
      setSolicitudes(solicitudesMapeadas);
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
      alert("Error al cargar datos. Verifique su sesión o permisos.");
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  useEffect(() => {
    fetchSolicitudes();
    fetchRubrosStatsTodas();
    fetchRubrosStatsAprobadas();
  }, [fetchSolicitudes]);

  // Función para exportar artesanos a PDF
  const handleExportArtesanosPDF = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/artesanos/exportar-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `listado_artesanos_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Listado de artesanos exportado correctamente a PDF');
    } catch (error) {
      console.error("Error al exportar artesanos:", error);
      alert("Error al exportar el listado de artesanos");
    }
  };

  // Filtrar solicitudes por rubro
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroRubro === 'all') return true;
    return s.rubro === filtroRubro;
  });

  const handleEditClick = (solicitud) => {
    setActiveSolicitudId(solicitud.id);
    setEditId(solicitud.id);
    setEditData({
      estado_solicitud: solicitud.estado,
      notas_admin: solicitud.originalData?.notas_admin || "",
    });
  };

  const handleSaveEdit = async () => {
    const idToUpdate = editId || activeSolicitudId;
    const token = localStorage.getItem("access_token");
    if (!token || !idToUpdate) return;
    
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/solicitudes/${idToUpdate}/estado`,
        editData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      alert(`Estado de Solicitud ID ${idToUpdate} actualizado a ${editData.estado_solicitud}.`);
      handleCancelEdit();
      fetchSolicitudes();
      // Actualizar estadísticas después de cambiar estado
      fetchRubrosStats();
    } catch (error) {
      console.error("Error al actualizar la solicitud:", error);
      alert("Error al actualizar la solicitud: " + (error.response?.data?.msg || error.message));
    }
  };

  const handleRejectRequest = async (id) => {
    if (!window.confirm(`¿Rechazar la Solicitud ID ${id}? Esta acción no se puede deshacer.`)) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    try {
      await axios.patch(
        `${API_BASE_URL}/solicitudes/${id}/estado`,
        { 
          estado_solicitud: "Rechazada",
          notas_admin: "Solicitud rechazada por el administrador" 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      alert(`Solicitud ID ${id} rechazada correctamente.`);
      fetchSolicitudes();
      fetchRubrosStats();
    } catch (error) {
      console.error("Error al rechazar:", error);
      alert("Error al rechazar la solicitud: " + (error.response?.data?.msg || error.message));
    }
  };

  const handleViewDetails = (s) => {
    const detallesCompletos = {
      ...s.originalData,
      nombre: s.nombre,
      email: s.email,
      dni: s.dni,
      telefono: s.telefono,
      rubro: s.rubro,
      alto: s.alto,
      ancho: s.ancho,
      descripcion_puesto: s.descripcion_puesto,
      foto_puesto: s.foto_puesto,
      fecha_creacion: s.fecha_creacion,
      estado: s.estado,
      notas_admin: s.originalData?.notas_admin,
      fotos: s.originalData?.fotos || []
    };
    setSolicitudDetails(detallesCompletos);
  };
  
  const handleCancelEdit = () => {
    setEditId(null);
    setActiveSolicitudId(null);
    setEditData({ estado_solicitud: "Pendiente", notas_admin: "" });
  };

  const formatDimensiones = (solicitud) => {
    if (solicitud.alto && solicitud.ancho) {
      return `${solicitud.alto} x ${solicitud.ancho}`;
    }
    if (solicitud.dimensiones) {
      return solicitud.dimensiones;
    }
    return 'N/A';
  };

  return (
    <div className="gestion-usuarios-container">
      <Navbar />

      <motion.div
        className="gestion-usuarios-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <header className="gestion-header">
          <h1>Gestión de Solicitudes</h1>
          <p>Administrá, filtrá y gestioná las solicitudes enviadas por los artesanos.</p>
        </header>

        <div className="listado-usuarios-section">
          <div className="listado-header">
            <h2>Listado de Solicitudes</h2>
            
            <div className="filtros-container">
              <div className="filtro-rol">
                <button 
                  className={`filtro-btn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  Todas
                </button>
                {Object.keys(ESTADOS).map((estado) => (
                  <button
                    key={estado}
                    className={`filtro-btn ${filter === estado ? "active" : ""}`}
                    onClick={() => setFilter(estado)}
                  >
                    {estado}
                  </button>
                ))}
              </div>
              
              <div className="busqueda-container">
                <input
                  type="text"
                  className="busqueda-input"
                  placeholder="Buscar por ID, Artesano o Rubro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && fetchSolicitudes()}
                />
                <button 
                  className="btn-buscar"
                  onClick={fetchSolicitudes}
                >
                  Buscar
                </button>
                {searchTerm && (
                  <button
                    className="btn-limpiar"
                    onClick={() => {
                      setSearchTerm("");
                      setFilter("all");
                      fetchSolicitudes();
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Filtros por Rubro con Contadores */}
          <div className="filtros-rubro-container">
            <div className="filtros-rubro-header">
              <div className="filtros-rubro-titulo">
                <h3>Filtrar por Rubro</h3>
                <p className="filtros-subtitulo">
                  Total: {solicitudes.length} solicitudes • 
                  Aprobadas: {Object.values(rubrosStatsAprobadas).reduce((a, b) => a + b, 0)}
                </p>
              </div>
              <button 
                className="btn-exportar-pdf"
                onClick={handleExportArtesanosPDF}
                title="Exportar listado de artesanos aprobados a PDF"
              >
                <FiDownload size={16} />
                Exportar Artesanos a PDF
              </button>
            </div>
            
            <div className="filtro-rubros">
              <button 
                className={`filtro-rubro-btn ${filtroRubro === 'all' ? 'active' : ''}`}
                onClick={() => setFiltroRubro('all')}
              >
                <FiUsers size={16} />
                Todos los Rubros
                <span className="contador-rubro total">({solicitudes.length})</span>
              </button>
              
              <button 
                className={`filtro-rubro-btn ${filtroRubro === 'Artesanías' ? 'active' : ''}`}
                onClick={() => setFiltroRubro('Artesanías')}
              >
                Artesanías
                <div className="contadores-dobles">
                  <span className="contador-total">{rubrosStatsTodas['Artesanías'] || 0}</span>
                  <span className="contador-aprobadas">/{rubrosStatsAprobadas['Artesanías'] || 0}✓</span>
                </div>
              </button>
              
              <button 
                className={`filtro-rubro-btn ${filtroRubro === 'Gastronomía' ? 'active' : ''}`}
                onClick={() => setFiltroRubro('Gastronomía')}
              >
                Gastronomía
                <div className="contadores-dobles">
                  <span className="contador-total">{rubrosStatsTodas['Gastronomía'] || 0}</span>
                  <span className="contador-aprobadas">/{rubrosStatsAprobadas['Gastronomía'] || 0}✓</span>
                </div>
              </button>
              
              <button 
                className={`filtro-rubro-btn ${filtroRubro === 'Reventa' ? 'active' : ''}`}
                onClick={() => setFiltroRubro('Reventa')}
              >
                Reventa
                <div className="contadores-dobles">
                  <span className="contador-total">{rubrosStatsTodas['Reventa'] || 0}</span>
                  <span className="contador-aprobadas">/{rubrosStatsAprobadas['Reventa'] || 0}✓</span>
                </div>
              </button>
            </div>
            <div className="filtros-leyenda">
              <span className="leyenda-item">
                <span className="leyenda-total">Número total</span>
                <span className="leyenda-separador">/</span>
                <span className="leyenda-aprobadas">Aprobadas ✓</span>
              </span>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-xl text-gray-700 py-10">
              Cargando solicitudes...
            </p>
          ) : (
            <div className="usuarios-table-container">
              <table className="usuarios-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Artesano</th>
                    <th>Rubro</th>
                    <th>Dim. (m²)</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesFiltradas.map((s) => (
                    <tr
                      key={s.id}
                      className={`table-row-hover ${
                        activeSolicitudId === s.id ? "bg-amber-100" : ""
                      }`}
                      onClick={() => setActiveSolicitudId(s.id)}
                    >
                      <td>{s.id}</td>
                      <td>
                        <div className="usuario-info">
                          <div className="usuario-nombre">{s.nombre}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${
                            RUBROS[s.rubro]?.badgeColor || "bg-gray-500"
                          }`}
                        >
                          {s.rubro}
                        </span>
                      </td>
                      <td>
                        {formatDimensiones(s)}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${
                            ESTADOS[s.estado]?.badge || "bg-black"
                          } flex items-center gap-1`}
                        >
                          {ESTADOS[s.estado]?.icon} {s.estado}
                        </span>
                      </td>
                      <td>
                        <div className="acciones-container">
                          <button 
                            className="btn-editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(s);
                            }}
                            title="Editar solicitud"
                          >
                            Editar
                          </button>
                          <button 
                            className="btn-eliminar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(s.id);
                            }}
                            title="Rechazar solicitud"
                          >
                            Rechazar
                          </button>
                          <button 
                            className="btn-ver"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(s);
                            }}
                            title="Ver detalles"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {solicitudesFiltradas.length === 0 && (
                <div className="no-resultados">
                  <p>No se encontraron solicitudes con los filtros aplicados.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN DE ESTADÍSTICAS DEBAJO DE LA LISTA */}
        <div className="estadisticas-section">
          <EstadisticasUsuarios />
        </div>
      </motion.div>

      <footer className="footer">
        © {new Date().getFullYear()} Feria Artesanal — Todos los derechos reservados.
      </footer>

      {editId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>✍️ Gestionar Solicitud ID: {editId}</h2>
              <button 
                className="btn-cerrar"
                onClick={handleCancelEdit}
              >
                ×
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Estado de Solicitud</label>
              <select
                name="estado_solicitud"
                value={editData.estado_solicitud}
                onChange={(e) =>
                  setEditData({ ...editData, estado_solicitud: e.target.value })
                }
                className="form-input"
              >
                {ESTADOS_ADMIN.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas del Administrador</label>
              <textarea
                name="notas_admin"
                value={editData.notas_admin}
                onChange={(e) =>
                  setEditData({ ...editData, notas_admin: e.target.value })
                }
                rows={3}
                placeholder="Ingrese el motivo o nota para el artesano..."
                className="form-input"
              />
              <small className="form-help">
                Esta nota será enviada como notificación al artesano automáticamente.
              </small>
            </div>

            <div className="modal-actions">
              <button onClick={handleCancelEdit} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleSaveEdit} className="btn-primary">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudDetails && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <div className="modal-header">
              <h2>👁️ Detalles de {solicitudDetails.nombre}</h2>
              <button 
                className="btn-cerrar"
                onClick={() => setSolicitudDetails(null)}
              >
                ×
              </button>
            </div>
            
            <div className="detalles-container">
              <div className="detalle-item">
                <strong>Nombre del Artesano:</strong> 
                <span>{solicitudDetails.nombre || 'No especificado'}</span>
              </div>
    
              <div className="detalle-item">
                <strong>DNI:</strong> 
                <span>{solicitudDetails.dni || 'No especificado'}</span>
              </div>
              
              <div className="detalle-item">
                <strong>Teléfono:</strong> 
                <span>{solicitudDetails.telefono || 'No especificado'}</span>
              </div>
              
              <div className="detalle-item">
                <strong>Rubro:</strong> 
                <span
                  className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white ${
                    RUBROS[solicitudDetails.rubro]?.badgeColor || "bg-gray-500"
                  }`}
                >
                  {solicitudDetails.rubro || 'No especificado'}
                </span>
              </div>
              
              <div className="detalle-item">
                <strong>Dimensiones:</strong> 
                <span>
                  {solicitudDetails.alto && solicitudDetails.ancho 
                    ? `${solicitudDetails.alto}m x ${solicitudDetails.ancho}m` 
                    : (solicitudDetails.dimensiones || 'No especificado')}
                </span>
              </div>
              
              <div className="detalle-item">
                <strong>Estado:</strong> 
                <span
                  className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white ${
                    ESTADOS[solicitudDetails.estado]?.badge || "bg-gray-500"
                  }`}
                >
                  {solicitudDetails.estado || 'Pendiente'}
                </span>
              </div>
              
              <div className="detalle-item">
                <strong>Fecha de Solicitud:</strong> 
                <span>
                  {solicitudDetails.fecha_creacion 
                    ? new Date(solicitudDetails.fecha_creacion).toLocaleDateString('es-ES')
                    : 'No especificada'}
                </span>
              </div>
              
              {solicitudDetails.fotos && solicitudDetails.fotos.length > 0 && (
                <div className="detalle-foto-section">
                  <strong>Fotos del Puesto:</strong>
                  <div className="fotos-container">
                    {solicitudDetails.fotos.map((foto, index) => (
                      <div key={index} className="foto-item">
                        <img 
                          src={`http://localhost:5000${foto}`} 
                          alt={`Foto del puesto ${index + 1}`} 
                          className="foto-puesto"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="foto-placeholder" style={{display: 'none'}}>
                          <FiEye size={24} />
                          <span>Imagen no disponible</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {solicitudDetails.foto_puesto && !solicitudDetails.fotos && (
                <div className="detalle-foto-section">
                  <strong>Foto del Puesto:</strong>
                  <div className="foto-container">
                    <img 
                      src={`http://localhost:5000${solicitudDetails.foto_puesto}`} 
                      alt="Foto del puesto" 
                      className="foto-puesto"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="foto-placeholder" style={{display: 'none'}}>
                      <FiEye size={24} />
                      <span>Imagen no disponible</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="detalle-descripcion">
                <strong>Descripción del Puesto:</strong>
                <div className="descripcion-box">
                  {solicitudDetails.descripcion_puesto || 'Sin descripción proporcionada'}
                </div>
              </div>
              
              {solicitudDetails.notas_admin && (
                <div className="detalle-notas-admin">
                  <strong>Notas del Administrador:</strong>
                  <div className="notas-box">
                    {solicitudDetails.notas_admin}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setSolicitudDetails(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;