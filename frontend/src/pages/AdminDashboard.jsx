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
  FiUsers,
  FiX,
  FiSettings,
  FiPieChart,
  FiDollarSign,
  FiEdit
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
  
  // Estado para el modal de imagen ampliada
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // NUEVOS ESTADOS PARA LAS FUNCIONALIDADES REQUERIDAS
  const [modificarModal, setModificarModal] = useState(null);
  const [configuracionesRubros, setConfiguracionesRubros] = useState([]);
  const [diversidadRubros, setDiversidadRubros] = useState([]);
  const [showConfiguracion, setShowConfiguracion] = useState(false);
  const [showDiversidad, setShowDiversidad] = useState(false);

  // Función para reconstruir URLs de fotos - CORREGIDA
  const reconstruirFotos = (solicitudData) => {
    const fotos = [];
    
    console.log("Datos para reconstruir fotos:", solicitudData);
    
    // Procesar fotos existentes del array de fotos
    if (solicitudData.fotos && Array.isArray(solicitudData.fotos)) {
      solicitudData.fotos.forEach((foto, index) => {
        if (foto) {
          // Si es base64 (data URL), usarlo directamente
          // Si es una ruta de archivo, construir la URL completa
          let fotoUrl = foto;
          if (foto.startsWith('/uploads/') || foto.startsWith('uploads/')) {
            fotoUrl = `${API_BASE_URL.replace('/api/v1', '')}${foto.startsWith('/') ? '' : '/'}${foto}`;
          }
          // Si ya es base64 o URL completa, usar directamente
          
          fotos.push({
            foto_id: `existente_${index}`,
            image_url: fotoUrl,
            tipo: 'existente'
          });
        }
      });
    }
    
    // Procesar foto_puesto individual si existe y no está ya en el array
    if (solicitudData.foto_puesto) {
      let fotoPuestoUrl = solicitudData.foto_puesto;
      if (solicitudData.foto_puesto.startsWith('/uploads/') || solicitudData.foto_puesto.startsWith('uploads/')) {
        fotoPuestoUrl = `${API_BASE_URL.replace('/api/v1', '')}${solicitudData.foto_puesto.startsWith('/') ? '' : '/'}${solicitudData.foto_puesto}`;
      }
      
      // Verificar si ya existe en las fotos para evitar duplicados
      const yaExiste = fotos.some(foto => foto.image_url === fotoPuestoUrl);
      
      if (!yaExiste) {
        fotos.push({
          foto_id: 'foto_puesto',
          image_url: fotoPuestoUrl,
          tipo: 'existente'
        });
      }
    }
    
    console.log("Fotos reconstruidas:", fotos);
    return fotos;
  };

  // NUEVAS FUNCIONES PARA LAS FUNCIONALIDADES REQUERIDAS

  // RF17: Cargar configuraciones de rubros
  const fetchConfiguracionesRubros = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/configuraciones/rubros`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfiguracionesRubros(response.data);
    } catch (error) {
      console.error("Error al cargar configuraciones de rubros:", error);
    }
  };

  // RF14: Cargar diversidad de rubros
  const fetchDiversidadRubros = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/diversidad-rubros`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiversidadRubros(response.data);
    } catch (error) {
      console.error("Error al cargar diversidad de rubros:", error);
    }
  };

  // RF13: Modificar información del puesto
  const handleModificarClick = (solicitud) => {
    setModificarModal({
      id: solicitud.id,
      datos: {
        rubro_id: solicitud.rubro_id || 1,
        dimensiones_largo: solicitud.alto || 0,
        dimensiones_ancho: solicitud.ancho || 0,
        descripcion: solicitud.descripcion_puesto || "",
        comentarios_admin: solicitud.originalData?.notas_admin || ""
      }
    });
  };

  const handleGuardarModificacion = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !modificarModal) return;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/solicitudes/${modificarModal.id}/modificar`,
        modificarModal.datos,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      alert("Información del puesto modificada correctamente. El artesano ha sido notificado.");
      setModificarModal(null);
      fetchSolicitudes();
    } catch (error) {
      console.error("Error al modificar la información:", error);
      alert("Error al modificar la información: " + (error.response?.data?.msg || error.message));
    }
  };

  // RF17: Actualizar configuración de rubro
  const handleActualizarConfiguracion = async (rubroId, nuevosDatos) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      await axios.put(
        `${API_BASE_URL}/configuraciones/rubros/${rubroId}`,
        nuevosDatos,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      alert("Configuración actualizada correctamente");
      fetchConfiguracionesRubros();
      fetchDiversidadRubros();
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      alert("Error al actualizar configuración: " + (error.response?.data?.msg || error.message));
    }
  };

  // FUNCIONES EXISTENTES (NO MODIFICADAS)

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
      
      const solicitudesMapeadas = response.data.map((item) => {
        const fotosReconstruidas = reconstruirFotos(item.originalData || item);
        
        return {
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
          estado: item.estado,
          fotosReconstruidas: fotosReconstruidas
        };
      });
      
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
    // Cargar las nuevas funcionalidades
    fetchConfiguracionesRubros();
    fetchDiversidadRubros();
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
    const fotosReconstruidas = reconstruirFotos(s.originalData || s);
    
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
      fotos: fotosReconstruidas
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

  // Funciones para el modal de imagen ampliada
  const ampliarImagen = (imageUrl) => {
    setImagenAmpliada(imageUrl);
  };

  const cerrarImagen = () => {
    setImagenAmpliada(null);
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
          <div className="header-main">
            <h1>Gestión de Solicitudes</h1>
            <p>Administrá, filtrá y gestioná las solicitudes enviadas por los artesanos.</p>
          </div>
          
          {/* NUEVOS BOTONES PARA LAS FUNCIONALIDADES REQUERIDAS */}
          <div className="header-actions">
            <button 
              className="btn-configuracion"
              onClick={() => setShowConfiguracion(!showConfiguracion)}
            >
              <FiSettings size={18} />
              Configurar Rubros
            </button>
            <button 
              className="btn-diversidad"
              onClick={() => setShowDiversidad(!showDiversidad)}
            >
              <FiPieChart size={18} />
              Diversidad Rubros
            </button>
          </div>
        </header>

        {/* NUEVO PANEL: Configuración de Rubros (RF17) */}
        {showConfiguracion && (
          <div className="configuracion-panel">
            <h3>Configuración de Precios y Límites por Rubro</h3>
            <div className="configuracion-grid">
              {configuracionesRubros.map(config => (
                <div key={config.rubro_id} className="configuracion-item">
                  <h4>{config.rubro_nombre}</h4>
                  <div className="config-inputs">
                    <div className="input-group">
                      <label>Precio Base ($):</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={config.precio_base}
                        onChange={(e) => {
                          const nuevasConfigs = [...configuracionesRubros];
                          const index = nuevasConfigs.findIndex(c => c.rubro_id === config.rubro_id);
                          nuevasConfigs[index].precio_base = parseFloat(e.target.value);
                          setConfiguracionesRubros(nuevasConfigs);
                        }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Límite de Puestos:</label>
                      <input
                        type="number"
                        min="0"
                        value={config.limite_puestos || ''}
                        onChange={(e) => {
                          const nuevasConfigs = [...configuracionesRubros];
                          const index = nuevasConfigs.findIndex(c => c.rubro_id === config.rubro_id);
                          nuevasConfigs[index].limite_puestos = e.target.value ? parseInt(e.target.value) : null;
                          setConfiguracionesRubros(nuevasConfigs);
                        }}
                        placeholder="Sin límite"
                      />
                    </div>
                    <div className="estado-limite">
                      <span className={`badge ${config.disponible ? 'bg-green-500' : 'bg-red-500'}`}>
                        {config.disponible ? 'Disponible' : 'Límite Alcanzado'}
                      </span>
                      <span>{config.puestos_aprobados}/{config.limite_puestos || '∞'}</span>
                    </div>
                  </div>
                  <button
                    className="btn-guardar-config"
                    onClick={() => handleActualizarConfiguracion(config.rubro_id, {
                      precio_base: config.precio_base,
                      limite_puestos: config.limite_puestos
                    })}
                  >
                    Guardar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NUEVO PANEL: Diversidad de Rubros (RF14) */}
        {showDiversidad && (
          <div className="diversidad-panel">
            <h3>Diversidad por Categorías - Estado de Límites</h3>
            <div className="diversidad-grid">
              {diversidadRubros.map(rubro => (
                <div key={rubro.rubro_id} className={`diversidad-item ${rubro.limite_alcanzado ? 'limite-alcanzado' : ''}`}>
                  <h4>{rubro.rubro_nombre}</h4>
                  <div className="diversidad-stats">
                    <div className="stat">
                      <span className="stat-label">Total Solicitudes:</span>
                      <span className="stat-value">{rubro.total_solicitudes}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Aprobadas:</span>
                      <span className="stat-value aprobadas">{rubro.aprobadas}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Pendientes:</span>
                      <span className="stat-value pendientes">{rubro.pendientes}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Límite:</span>
                      <span className="stat-value limite">{rubro.disponibilidad}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Precio Base:</span>
                      <span className="stat-value precio">${rubro.precio_base}</span>
                    </div>
                  </div>
                  {rubro.limite_alcanzado && (
                    <div className="alerta-limite">
                      ⚠️ Límite alcanzado - Revisar nuevas solicitudes
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO EXISTENTE - SIN MODIFICACIONES */}
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
                            title="Editar estado"
                          >
                            <FiEdit3 size={14} />
                          </button>
                          {/* NUEVO BOTÓN: Modificar información (RF13) */}
                          <button 
                            className="btn-modificar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModificarClick(s);
                            }}
                            title="Modificar información del puesto"
                          >
                            <FiEdit size={14} />
                          </button>
                          <button 
                            className="btn-eliminar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(s.id);
                            }}
                            title="Rechazar solicitud"
                          >
                            <FiTrash2 size={14} />
                          </button>
                          <button 
                            className="btn-ver"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(s);
                            }}
                            title="Ver detalles"
                          >
                            <FiEye size={14} />
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

      {/* MODALES EXISTENTES - SIN MODIFICACIONES */}

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
              
              {/* SECCIÓN DE FOTOS RECONSTRUIDAS - CORREGIDA */}
              {solicitudDetails.fotos && solicitudDetails.fotos.length > 0 && (
                <div className="detalle-foto-section">
                  <strong>Fotos del Puesto:</strong>
                  <div className="fotos-container">
                    {solicitudDetails.fotos.map((foto, index) => (
                      <div key={foto.foto_id || index} className="foto-item">
                        <img 
                          src={foto.image_url} 
                          alt={`Foto del puesto ${index + 1}`} 
                          className="foto-puesto"
                          onClick={() => ampliarImagen(foto.image_url)}
                          onError={(e) => {
                            console.error("Error cargando imagen:", foto.image_url);
                            e.target.style.display = 'none';
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
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

              {/* Fallback para foto_puesto individual si no hay fotos reconstruidas */}
              {(!solicitudDetails.fotos || solicitudDetails.fotos.length === 0) && solicitudDetails.foto_puesto && (
                <div className="detalle-foto-section">
                  <strong>Foto del Puesto:</strong>
                  <div className="fotos-container">
                    <div className="foto-item">
                      <img 
                        src={solicitudDetails.foto_puesto} 
                        alt="Foto del puesto" 
                        className="foto-puesto"
                        onClick={() => ampliarImagen(solicitudDetails.foto_puesto)}
                        onError={(e) => {
                          console.error("Error cargando imagen:", solicitudDetails.foto_puesto);
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="foto-placeholder" style={{display: 'none'}}>
                        <FiEye size={24} />
                        <span>Imagen no disponible</span>
                      </div>
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

      {/* NUEVO MODAL: Modificar información del puesto (RF13) */}
      {modificarModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <div className="modal-header">
              <h2>✏️ Modificar Información del Puesto ID: {modificarModal.id}</h2>
              <button 
                className="btn-cerrar"
                onClick={() => setModificarModal(null)}
              >
                ×
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Rubro</label>
              <select
                value={modificarModal.datos.rubro_id}
                onChange={(e) => setModificarModal({
                  ...modificarModal,
                  datos: {...modificarModal.datos, rubro_id: parseInt(e.target.value)}
                })}
                className="form-input"
              >
                <option value={1}>Artesanías</option>
                <option value={2}>Gastronomía</option>
                <option value={3}>Reventa</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Largo (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={modificarModal.datos.dimensiones_largo}
                  onChange={(e) => setModificarModal({
                    ...modificarModal,
                    datos: {...modificarModal.datos, dimensiones_largo: parseFloat(e.target.value)}
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ancho (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={modificarModal.datos.dimensiones_ancho}
                  onChange={(e) => setModificarModal({
                    ...modificarModal,
                    datos: {...modificarModal.datos, dimensiones_ancho: parseFloat(e.target.value)}
                  })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción del Puesto</label>
              <textarea
                value={modificarModal.datos.descripcion}
                onChange={(e) => setModificarModal({
                  ...modificarModal,
                  datos: {...modificarModal.datos, descripcion: e.target.value}
                })}
                rows={3}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de la Modificación</label>
              <textarea
                value={modificarModal.datos.comentarios_admin}
                onChange={(e) => setModificarModal({
                  ...modificarModal,
                  datos: {...modificarModal.datos, comentarios_admin: e.target.value}
                })}
                rows={2}
                placeholder="Explique el motivo de los cambios..."
                className="form-input"
              />
              <small className="form-help">
                Este mensaje será enviado como notificación al artesano.
              </small>
            </div>

            <div className="modal-actions">
              <button onClick={() => setModificarModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleGuardarModificacion} className="btn-primary">
                Guardar Cambios y Notificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para imagen ampliada */}
      {imagenAmpliada && (
        <div className="modal-overlay" onClick={cerrarImagen}>
          <div className="modal-imagen" onClick={(e) => e.stopPropagation()}>
            <button className="btn-cerrar-modal" onClick={cerrarImagen}>
              <FiX size={24} />
            </button>
            <img 
              src={imagenAmpliada} 
              alt="Imagen ampliada del puesto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;