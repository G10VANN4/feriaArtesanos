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
} from "react-icons/fi";
import axios from "axios";
import "../styles/App.css";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

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
  "Pendiente por Modificación": { badge: "bg-orange-500", icon: <FiAlertTriangle /> },
};

const Dashboard = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);


  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ estado_solicitud: "Pendiente", notas_admin: "" });
  const [solicitudDetails, setSolicitudDetails] = useState(null);
  const [activeSolicitudId, setActiveSolicitudId] = useState(null);

  
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
      setSolicitudes(response.data.map((item) => ({ ...item, originalData: item })));
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
  }, [fetchSolicitudes]);

 
  const handleEditClick = (solicitud) => {
    setActiveSolicitudId(solicitud.id);
    setEditId(solicitud.id);
    setEditData({
      estado_solicitud: solicitud.estado,
      notas_admin: solicitud.originalData.notas_admin || "",
    });
  };

  const handleSaveEdit = async () => {
    const idToUpdate = editId || activeSolicitudId;
    const token = localStorage.getItem("access_token");
    if (!token || !idToUpdate) return;
    try {
      await axios.patch(
        `${API_BASE_URL}/solicitudes/${idToUpdate}/estado`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Estado de Solicitud ID ${idToUpdate} actualizado a ${editData.estado_solicitud}`);
      handleCancelEdit();
      fetchSolicitudes();
    } catch (error) {
      console.error("Error al actualizar la solicitud:", error);
      alert("Error al actualizar la solicitud.");
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm(`¿Cancelar la Solicitud ID ${id}?`)) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      await axios.patch(`${API_BASE_URL}/solicitudes/${id}/cancelar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Solicitud ID ${id} cancelada.`);
      fetchSolicitudes();
    } catch (error) {
      console.error("Error al cancelar:", error);
      alert("Error al cancelar la solicitud.");
    }
  };

  const handleViewDetails = (s) => setSolicitudDetails(s.originalData);
  const handleCancelEdit = () => {
    setEditId(null);
    setActiveSolicitudId(null);
    setEditData({ estado_solicitud: "Pendiente", notas_admin: "" });
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
          <h1>Gestión de Solicitudes </h1>
          <p>Administrá, filtrá y gestioná las solicitudes enviadas por los artesanos.</p>
        </header>

        
        


          <div className="filtros-solicitudes">
            <h2>Gestión de Solicitudes</h2>

            <div className="filtro-estado">
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
        <section className="listado-usuarios-section">
          <div className="listado-header">
            <h2>Solicitudes Registradas</h2>
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
                  {solicitudes.map((s) => (
                    <tr
                      key={s.id}
                      className={`table-row-hover ${
                        activeSolicitudId === s.id ? "bg-amber-100" : ""
                      }`}
                      onClick={() => setActiveSolicitudId(s.id)}
                    >
                      <td>{s.id}</td>
                      <td>{s.nombre}</td>
                      <td>
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${
                            RUBROS[s.rubro]?.badgeColor || "bg-gray-500"
                          }`}
                        >
                          {s.rubro}
                        </span>
                      </td>
                      <td>{s.nombre}</td>
                      <td>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${
                            ESTADOS[s.estado]?.badge || "bg-black"
                          } flex items-center gap-1`}
                        >
                          {ESTADOS[s.estado]?.icon} {s.estado}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(s);
                          }}
                          className="icon-btn text-[#A0522D]"
                        >
                          <FiEdit3 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(s);
                          }}
                          className="icon-btn text-blue-600"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRequest(s.id);
                          }}
                          className="icon-btn text-red-600"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </motion.div>

 
      <footer className="footer">
        © {new Date().getFullYear()} Feria Artesanal — Todos los derechos reservados.
      </footer>

      
      {editId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>✍️ Gestionar Solicitud ID: {editId}</h2>
            <label>Estado de Solicitud</label>
            <select
              name="estado_solicitud"
              value={editData.estado_solicitud}
              onChange={(e) =>
                setEditData({ ...editData, estado_solicitud: e.target.value })
              }
              className="form-input p-2 w-full"
            >
              {Object.keys(ESTADOS).map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <label>Notas del Administrador</label>
            <textarea
              name="notas_admin"
              value={editData.notas_admin}
              onChange={(e) =>
                setEditData({ ...editData, notas_admin: e.target.value })
              }
              rows={3}
              placeholder="Ingrese el motivo o nota..."
              className="form-input p-2 w-full"
            />

            <div className="modal-buttons">
              <button onClick={handleSaveEdit} className="btn-login">
                Guardar
              </button>
              <button onClick={handleCancelEdit} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    
      {solicitudDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>👁️ Detalles de {solicitudDetails.nombre}</h2>
            <p>
              <strong>Rubro:</strong>{" "}
              <span
                className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white ${
                  RUBROS[solicitudDetails.rubro]?.badgeColor || "bg-gray-500"
                }`}
              >
                {solicitudDetails.rubro}
              </span>
            </p>
            <p>
              <strong>Dimensiones:</strong> {solicitudDetails.alto}m x{" "}
              {solicitudDetails.ancho}m
            </p>
            <p>
              <strong>DNI:</strong> {solicitudDetails.dni}
            </p>
            <p>
              <strong>Teléfono:</strong> {solicitudDetails.telefono}
            </p>
            <p>
              <strong>Descripción:</strong>
            </p>
            <p className="descripcion-box">
              {solicitudDetails.descripcion_puesto}
            </p>
            <div className="modal-buttons">
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
