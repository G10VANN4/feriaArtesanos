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
} from "react-icons/fi";
import axios from "axios";
import "../styles/App.css";
import Navbar from "../components/Navbar";
import EstadisticasUsuarios from "../components/EstadisticasUsuarios";
import MapaGrid from "../components/MapaGrid";
import ActiveUsersPanel from '../components/ActiveUsersPanel';

const API_BASE_URL = "http://localhost:5000/api/v1";

const RUBROS = {
  Artesanías: { badgeColor: "bg-blue-600" },
  Gastronomía: { badgeColor: "bg-red-600" },
  Reventa: { badgeColor: "bg-green-600" },
};

const ESTADOS = {
  Aprobada: { badge: "bg-green-500", icon: <FiCheckCircle /> },
  Pendiente: { badge: "bg-yellow-500", icon: <FiClock /> },
  Rechazada: { badge: "bg-red-500", icon: <FiXCircle /> },
  Cancelada: { badge: "bg-gray-500", icon: <FiTrash2 /> },
};

const ESTADOS_ADMIN = [
  "Aprobada",
  "Pendiente",
  "Rechazada",
];

const Dashboard = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rubrosStatsAprobadas, setRubrosStatsAprobadas] = useState({});
  const [rubrosStatsTodas, setRubrosStatsTodas] = useState({});
  const [filtroRubro, setFiltroRubro] = useState("all");

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    estado_solicitud: "Pendiente",
    notas_admin: "",
    rubro_id: 1,
    descripcion_puesto: "",
  });
  const [solicitudDetails, setSolicitudDetails] = useState(null);
  const [activeSolicitudId, setActiveSolicitudId] = useState(null);

  // Estado para el modal de imagen ampliada
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // Estados para las nuevas funcionalidades
  const [configuracionesRubros, setConfiguracionesRubros] = useState([]);
  const [diversidadRubros, setDiversidadRubros] = useState([]);
  const [showConfiguracion, setShowConfiguracion] = useState(false);
  const [showDiversidad, setShowDiversidad] = useState(false);

  // Mapa
  const [showMapa, setShowMapa] = useState(false);

  // Función para reconstruir URLs de fotos
  const reconstruirFotos = (solicitudData) => {
    const fotos = [];

    console.log("Datos para reconstruir fotos:", solicitudData);

    // Procesar fotos existentes del array de fotos
    if (solicitudData.fotos && Array.isArray(solicitudData.fotos)) {
      solicitudData.fotos.forEach((foto, index) => {
        if (foto) {
          let fotoUrl = foto;
          if (foto.startsWith("/uploads/") || foto.startsWith("uploads/")) {
            fotoUrl = `${API_BASE_URL.replace("/api/v1", "")}${
              foto.startsWith("/") ? "" : "/"
            }${foto}`;
          }

          fotos.push({
            foto_id: `existente_${index}`,
            image_url: fotoUrl,
            tipo: "existente",
          });
        }
      });
    }

    // Procesar foto_puesto individual si existe y no está ya en el array
    if (solicitudData.foto_puesto) {
      let fotoPuestoUrl = solicitudData.foto_puesto;
      if (
        solicitudData.foto_puesto.startsWith("/uploads/") ||
        solicitudData.foto_puesto.startsWith("uploads/")
      ) {
        fotoPuestoUrl = `${API_BASE_URL.replace("/api/v1", "")}${
          solicitudData.foto_puesto.startsWith("/") ? "" : "/"
        }${solicitudData.foto_puesto}`;
      }

      const yaExiste = fotos.some((foto) => foto.image_url === fotoPuestoUrl);

      if (!yaExiste) {
        fotos.push({
          foto_id: "foto_puesto",
          image_url: fotoPuestoUrl,
          tipo: "existente",
        });
      }
    }

    console.log("Fotos reconstruidas:", fotos);
    return fotos;
  };

  // RF17: Cargar configuraciones de rubros
  const fetchConfiguracionesRubros = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/configuraciones/rubros`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConfiguracionesRubros(response.data);
    } catch (error) {
      console.error("Error al cargar configuraciones de rubros:", error);
    }
  };

  // RF14: Cargar diversidad de rubros
  const fetchDiversidadRubros = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/diversidad-rubros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiversidadRubros(response.data);
    } catch (error) {
      console.error("Error al cargar diversidad de rubros:", error);
    }
  };

  // Función para cargar estadísticas de TODAS las solicitudes por rubro
  const fetchRubrosStatsTodas = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/estadisticas/rubros/todas`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRubrosStatsTodas(response.data);
    } catch (error) {
      console.error("Error al cargar estadísticas de rubros (todas):", error);
    }
  };

  // Función para cargar estadísticas de SOLO aprobadas
  const fetchRubrosStatsAprobadas = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/estadisticas/rubros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRubrosStatsAprobadas(response.data);
    } catch (error) {
      console.error(
        "Error al cargar estadísticas de rubros (aprobadas):",
        error
      );
    }
  };

  const fetchSolicitudes = useCallback(async () => {
    const token = localStorage.getItem("token");
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
          alto: item.originalData?.alto || 0,
          ancho: item.originalData?.ancho || 0,
          dimensiones: item.dimensiones,
          email: item.originalData?.email,
          dni: item.originalData?.dni,
          telefono: item.originalData?.telefono,
          descripcion_puesto: item.originalData?.descripcion_puesto,
          foto_puesto: item.originalData?.foto_puesto,
          fecha_creacion: item.originalData?.fecha_solicitud,
          artesano_id: item.artesano_id,
          estado: item.estado,
          rubro_id: item.originalData?.rubro_id || 1,
          fotosReconstruidas: fotosReconstruidas,
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
    fetchConfiguracionesRubros();
    fetchDiversidadRubros();
  }, [fetchSolicitudes]);

  // Función para exportar artesanos a PDF
  const handleExportArtesanosPDF = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/artesanos/exportar-pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `listado_artesanos_${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert("Listado de artesanos exportado correctamente a PDF");
    } catch (error) {
      console.error("Error al exportar artesanos:", error);
      alert("Error al exportar el listado de artesanos");
    }
  };

  // Filtrar solicitudes por rubro
  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroRubro === "all") return true;
    return s.rubro === filtroRubro;
  });

  // Función unificada para editar (estado, rubro y descripción)
  const handleEditClick = (solicitud) => {
    setActiveSolicitudId(solicitud.id);
    setEditId(solicitud.id);
    setEditData({
      estado_solicitud: solicitud.estado,
      notas_admin: solicitud.originalData?.notas_admin || "",
      rubro_id: solicitud.rubro_id || 1,
      descripcion_puesto: solicitud.descripcion_puesto || "",
    });
  };

  const handleSaveEdit = async () => {
    const idToUpdate = editId || activeSolicitudId;
    const token = localStorage.getItem("token");
    if (!token || !idToUpdate) return;

    try {
      // Primero actualizar el estado y notas
      await axios.patch(
        `${API_BASE_URL}/solicitudes/${idToUpdate}/estado`,
        {
          estado_solicitud: editData.estado_solicitud,
          notas_admin: editData.notas_admin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Luego actualizar rubro y descripción si han cambiado
      await axios.patch(
        `${API_BASE_URL}/solicitudes/${idToUpdate}/modificar`,
        {
          rubro_id: editData.rubro_id,
          descripcion: editData.descripcion_puesto,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert(`Solicitud ID ${idToUpdate} actualizada correctamente.`);
      handleCancelEdit();
      fetchSolicitudes();
      fetchRubrosStatsTodas();
      fetchRubrosStatsAprobadas();
    } catch (error) {
      console.error("Error al actualizar la solicitud:", error);
      alert(
        "Error al actualizar la solicitud: " +
          (error.response?.data?.msg || error.message)
      );
    }
  };

  const handleRejectRequest = async (id) => {
    if (
      !window.confirm(
        `¿Rechazar la Solicitud ID ${id}? Esta acción no se puede deshacer.`
      )
    )
      return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/solicitudes/${id}/estado`,
        {
          estado_solicitud: "Rechazada",
          notas_admin: "Solicitud rechazada por el administrador",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert(`Solicitud ID ${id} rechazada correctamente.`);
      fetchSolicitudes();
      fetchRubrosStatsTodas();
      fetchRubrosStatsAprobadas();
    } catch (error) {
      console.error("Error al rechazar:", error);
      alert(
        "Error al rechazar la solicitud: " +
          (error.response?.data?.msg || error.message)
      );
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
      fotos: fotosReconstruidas,
    };
    setSolicitudDetails(detallesCompletos);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setActiveSolicitudId(null);
    setEditData({
      estado_solicitud: "Pendiente",
      notas_admin: "",
      rubro_id: 1,
      descripcion_puesto: "",
    });
  };

  const formatDimensiones = (solicitud) => {
    if (solicitud.alto && solicitud.ancho) {
      return `${solicitud.alto} x ${solicitud.ancho}`;
    }
    if (solicitud.dimensiones) {
      return solicitud.dimensiones;
    }
    return "N/A";
  };

  // RF17: Actualizar configuración de rubro
  const handleActualizarConfiguracion = async (rubroId, nuevosDatos) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.put(
        `${API_BASE_URL}/configuraciones/rubros/${rubroId}`,
        nuevosDatos,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Configuración actualizada correctamente");
      fetchConfiguracionesRubros();
      fetchDiversidadRubros();
      fetchRubrosStatsTodas();
      fetchRubrosStatsAprobadas();
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      alert(
        "Error al actualizar configuración: " +
          (error.response?.data?.msg || error.message)
      );
    }
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
            <p>
              Administrá, filtrá y gestioná las solicitudes enviadas por los
              artesanos.
            </p>
          </div>

          <div className="header-actions">
            <button
              className={`btn-mapa ${showMapa ? "active" : ""}`}
              onClick={() => setShowMapa(!showMapa)}
            >
              {showMapa ? "Ocultar Mapa" : "Ver Mapa"}
            </button>

            <button
              className={`btn-configuracion ${
                showConfiguracion ? "active" : ""
              }`}
              onClick={() => setShowConfiguracion(!showConfiguracion)}
            >
              <FiSettings size={18} />
              Configurar Rubros
            </button>
            <button
              className={`btn-diversidad ${showDiversidad ? "active" : ""}`}
              onClick={() => setShowDiversidad(!showDiversidad)}
            >
              <FiPieChart size={18} />
              Diversidad Rubros
            </button>
          </div>
        </header>

        {showMapa && (
          <div className="mapa-panel">
            <div className="mapa-panel-header">
              <h3>Mapa de Parcelas </h3>
              <p>
                Gestioná la disponibilidad de parcelas y consultá información de
                artesanos
              </p>
            </div>
            <MapaGrid />
          </div>
        )}

        {/* Panel: Configuración de Rubros (RF17) */}
        {showConfiguracion && (
          <div className="configuracion-panel">
            <h3>Configuración de Precios y Límites por Rubro</h3>
            <div className="configuracion-grid">
              {configuracionesRubros.map((config) => (
                <div key={config.rubro_id} className="configuracion-item">
                  <h4>{config.rubro_nombre}</h4>
                  <div className="config-inputs">
                    <div className="input-group">
                      <label>Precio Base ($):</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={config.precio_base || 0}
                        onChange={(e) => {
                          const nuevasConfigs = [...configuracionesRubros];
                          const index = nuevasConfigs.findIndex(
                            (c) => c.rubro_id === config.rubro_id
                          );
                          nuevasConfigs[index].precio_base =
                            parseFloat(e.target.value) || 0;
                          setConfiguracionesRubros(nuevasConfigs);
                        }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Límite de Puestos:</label>
                      <input
                        type="number"
                        min="0"
                        value={config.limite_puestos || ""}
                        onChange={(e) => {
                          const nuevasConfigs = [...configuracionesRubros];
                          const index = nuevasConfigs.findIndex(
                            (c) => c.rubro_id === config.rubro_id
                          );
                          nuevasConfigs[index].limite_puestos = e.target.value
                            ? parseInt(e.target.value)
                            : null;
                          setConfiguracionesRubros(nuevasConfigs);
                        }}
                        placeholder="Sin límite"
                      />
                    </div>
                    <div className="estado-limite">
                      <span
                        className={`badge ${
                          config.disponible ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {config.disponible ? "Disponible" : "Límite Alcanzado"}
                      </span>
                      <span>
                        {config.puestos_aprobados}/
                        {config.limite_puestos || "∞"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-guardar-config"
                    onClick={() =>
                      handleActualizarConfiguracion(config.rubro_id, {
                        precio_base: config.precio_base,
                        limite_puestos: config.limite_puestos,
                      })
                    }
                  >
                    Guardar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel: Diversidad de Rubros (RF14) */}
        {showDiversidad && (
          <div className="diversidad-panel">
            <h3>Diversidad por Categorías - Estado de Límites</h3>
            <div className="diversidad-grid">
              {diversidadRubros.map((rubro) => (
                <div
                  key={rubro.rubro_id}
                  className={`diversidad-item ${
                    rubro.limite_alcanzado ? "limite-alcanzado" : ""
                  }`}
                >
                  <h4>{rubro.rubro_nombre}</h4>
                  <div className="diversidad-stats">
                    <div className="stat">
                      <span className="stat-label">Total Solicitudes:</span>
                      <span className="stat-value">
                        {rubro.total_solicitudes}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Aprobadas:</span>
                      <span className="stat-value aprobadas">
                        {rubro.aprobadas}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Pendientes:</span>
                      <span className="stat-value pendientes">
                        {rubro.pendientes}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Límite:</span>
                      <span className="stat-value limite">
                        {rubro.disponibilidad}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Precio Base:</span>
                      <span className="stat-value precio">
                        ${rubro.precio_base}
                      </span>
                    </div>
                  </div>
                  {rubro.limite_alcanzado && (
                    <div className="alerta-limite">
                      Límite alcanzado - Revisar nuevas solicitudes
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listado de Solicitudes */}
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
                    className={`filtro-btn ${
                      filter === estado ? "active" : ""
                    }`}
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
                <button className="btn-buscar" onClick={fetchSolicitudes}>
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

          {/* Filtros por Rubro - MODIFICADO: Solo muestra aprobadas */}
          <div className="filtros-rubro-container">
            <div className="filtros-rubro-header">
              <div className="filtros-rubro-titulo">
                <h3>Filtrar por Rubro</h3>
                <p className="filtros-subtitulo">
                  Aprobadas:{" "}
                  {Object.values(rubrosStatsAprobadas).reduce(
                    (a, b) => a + b,
                    0
                  )}
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
                className={`filtro-rubro-btn ${
                  filtroRubro === "all" ? "active" : ""
                }`}
                onClick={() => setFiltroRubro("all")}
              >
                <FiUsers size={16} />
                Todos los Rubros
                <span className="contador-rubro aprobadas">
                  (
                  {Object.values(rubrosStatsAprobadas).reduce(
                    (a, b) => a + b,
                    0
                  )}
                  )
                </span>
              </button>

              {Object.keys(RUBROS).map((rubro) => (
                <button
                  key={rubro}
                  className={`filtro-rubro-btn ${
                    filtroRubro === rubro ? "active" : ""
                  }`}
                  onClick={() => setFiltroRubro(rubro)}
                >
                  {rubro}
                  <span className="contador-rubro aprobadas">
                    {rubrosStatsAprobadas[rubro] || 0}✓
                  </span>
                </button>
              ))}
            </div>
            <div className="filtros-leyenda">
              <span className="leyenda-item">
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
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white rubro-badge ${
                            RUBROS[s.rubro]?.badgeColor || "bg-gray-500"
                          }`}
                        >
                          {s.rubro}
                        </span>
                      </td>
                      <td>{formatDimensiones(s)}</td>
                      <td>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white estado-badge ${
                            ESTADOS[s.estado]?.badge || "bg-black"
                          } flex items-center gap-1`}
                        >
                          {ESTADOS[s.estado]?.icon} {s.estado}
                        </span>
                      </td>
                      <td>
                        <div className="acciones-container">
                          {/* SOLO UN BOTÓN DE EDITAR QUE INCLUYE TODO */}
                          <button
                            className="btn-editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(s);
                            }}
                            title="Editar estado, rubro y comentarios"
                          >
                            <FiEdit3 size={14} />
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
                  <p>
                    No se encontraron solicitudes con los filtros aplicados.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sección de Estadísticas */}
        <div className="estadisticas-section">
          <EstadisticasUsuarios />
        </div>
        
        <div className="active-users-section">
          <ActiveUsersPanel />
        </div>

      </motion.div>

      <footer className="footer">
        © {new Date().getFullYear()} Feria Artesanal — Todos los derechos
        reservados.
      </footer>

      {/* Modal de Edición Unificado - AHORA INCLUYE TODO */}
      {editId && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <div className="modal-header">
              <h2>Gestionar Solicitud ID: {editId}</h2>
              <button className="btn-cerrar" onClick={handleCancelEdit}>
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de Solicitud</label>
              <select
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
              <label className="form-label">Rubro</label>
              <select
                value={editData.rubro_id}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    rubro_id: parseInt(e.target.value),
                  })
                }
                className="form-input"
              >
                <option value={1}>Gastronomía</option>
                <option value={2}>Reventa</option>
                <option value={3}>Artesanías</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción del Puesto</label>
              <textarea
                value={editData.descripcion_puesto}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    descripcion_puesto: e.target.value,
                  })
                }
                rows={3}
                placeholder="Descripción del puesto del artesano..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas del Administrador</label>
              <textarea
                value={editData.notas_admin}
                onChange={(e) =>
                  setEditData({ ...editData, notas_admin: e.target.value })
                }
                rows={3}
                placeholder="Ingrese el motivo o nota para el artesano..."
                className="form-input"
              />
              <small className="form-help">
                Esta nota será enviada como notificación al artesano
                automáticamente.
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

      {/* Modal de Detalles */}
      {solicitudDetails && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <div className="modal-header">
              <h2>Detalles de {solicitudDetails.nombre}</h2>
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
                <span>{solicitudDetails.nombre || "No especificado"}</span>
              </div>

              <div className="detalle-item">
                <strong>DNI:</strong>
                <span>{solicitudDetails.dni || "No especificado"}</span>
              </div>

              <div className="detalle-item">
                <strong>Teléfono:</strong>
                <span>{solicitudDetails.telefono || "No especificado"}</span>
              </div>

              <div className="detalle-item">
                <strong>Rubro:</strong>
                <span
                  className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white rubro-badge ${
                    RUBROS[solicitudDetails.rubro]?.badgeColor || "bg-gray-500"
                  }`}
                >
                  {solicitudDetails.rubro || "No especificado"}
                </span>
              </div>

              <div className="detalle-item">
                <strong>Dimensiones:</strong>
                <span>
                  {solicitudDetails.alto && solicitudDetails.ancho
                    ? `${solicitudDetails.alto}m x ${solicitudDetails.ancho}m`
                    : solicitudDetails.dimensiones || "No especificado"}
                </span>
              </div>

              <div className="detalle-item">
                <strong>Estado:</strong>
                <span
                  className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white estado-badge ${
                    ESTADOS[solicitudDetails.estado]?.badge || "bg-gray-500"
                  }`}
                >
                  {solicitudDetails.estado || "Pendiente"}
                </span>
              </div>

              <div className="detalle-item">
                <strong>Fecha de Solicitud:</strong>
                <span>
                  {solicitudDetails.fecha_creacion
                    ? new Date(
                        solicitudDetails.fecha_creacion
                      ).toLocaleDateString("es-ES")
                    : "No especificada"}
                </span>
              </div>

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
                            console.error(
                              "Error cargando imagen:",
                              foto.image_url
                            );
                            e.target.style.display = "none";
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = "flex";
                            }
                          }}
                        />
                        <div
                          className="foto-placeholder"
                          style={{ display: "none" }}
                        >
                          <FiEye size={24} />
                          <span>Imagen no disponible</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!solicitudDetails.fotos ||
                solicitudDetails.fotos.length === 0) &&
                solicitudDetails.foto_puesto && (
                  <div className="detalle-foto-section">
                    <strong>Foto del Puesto:</strong>
                    <div className="fotos-container">
                      <div className="foto-item">
                        <img
                          src={solicitudDetails.foto_puesto}
                          alt="Foto del puesto"
                          className="foto-puesto"
                          onClick={() =>
                            ampliarImagen(solicitudDetails.foto_puesto)
                          }
                          onError={(e) => {
                            console.error(
                              "Error cargando imagen:",
                              solicitudDetails.foto_puesto
                            );
                            e.target.style.display = "none";
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = "flex";
                            }
                          }}
                        />
                        <div
                          className="foto-placeholder"
                          style={{ display: "none" }}
                        >
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
                  {solicitudDetails.descripcion_puesto ||
                    "Sin descripción proporcionada"}
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

      {/* Modal para imagen ampliada */}
      {imagenAmpliada && (
        <div className="modal-overlay" onClick={cerrarImagen}>
          <div className="modal-imagen" onClick={(e) => e.stopPropagation()}>
            <button className="btn-cerrar-modal" onClick={cerrarImagen}>
              <FiX size={24} />
            </button>
            <img src={imagenAmpliada} alt="Imagen ampliada del puesto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;