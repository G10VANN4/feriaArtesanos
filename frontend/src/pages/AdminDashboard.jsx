import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiEdit3, FiEye, FiTrash2, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle, FiSearch } from "react-icons/fi";
import axios from "axios";
import "../styles/App.css";

const API_BASE_URL = "http://localhost:5000/api/v1"; 

// --- CONSTANTES DE DISEÑO ---
const COLOR_PRIMARY = "#A0522D"; 
const COLOR_TEXT = "#38312B"; 

// Clases CSS de tu App.css
const mainContainerClass = "dashboard-page-container"; 
const DASHBOARD_CARD_CLASS = "dashboard-main-card"; 

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


const AdminDashboard = ({ history }) => {
    const [filter, setFilter] = useState("all"); 
    const [searchTerm, setSearchTerm] = useState(""); 
    const [solicitudes, setSolicitudes] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({ estado_solicitud: "Pendiente", notas_admin: "" });
    const [solicitudDetails, setSolicitudDetails] = useState(null);
    const [activeSolicitudId, setActiveSolicitudId] = useState(null);


    // --- CLASES CSS ---
    const primaryButtonClass = "btn-login"; 
    const secondaryButtonClass = "btn-secondary"; 

    // --- FUNCIÓN DE FETCH (Mantenida) ---
    const fetchSolicitudes = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) { setLoading(false); return; }

        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/solicitudes`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    filtro_estado: filter !== 'all' ? filter : undefined,
                    busqueda_termino: searchTerm || undefined 
                }
            });
            setSolicitudes(response.data.map(item => ({...item, originalData: item}))); 
            
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

    // --- HANDLERS DE ACCIÓN (Mantenidos) ---
    const handleEditClick = (solicitud) => {
        setActiveSolicitudId(solicitud.id);
        setEditId(solicitud.id);
        setEditData({ estado_solicitud: solicitud.estado, notas_admin: solicitud.originalData.notas_admin || "" });
    };
    
    const handleSaveEdit = async () => {
        const idToUpdate = editId || activeSolicitudId;
        const token = localStorage.getItem('access_token');
        if (!token || !idToUpdate) return;
        try {
            const URL = `${API_BASE_URL}/solicitudes/${idToUpdate}/estado`;
            await axios.patch(URL, editData, { headers: { 'Authorization': `Bearer ${token}` } });
            alert(`Estado de Solicitud ID ${idToUpdate} actualizado a ${editData.estado_solicitud}`);
            handleCancelEdit();
            fetchSolicitudes();
        } catch (error) {
            console.error("Error al actualizar la solicitud:", error);
            alert("Error al actualizar la solicitud. Verifique los permisos o el estado.");
        }
    };
    
    const handleCancelRequest = async (solicitudId) => {
        if (!window.confirm(`¿Está seguro de CANCELAR la Solicitud ID ${solicitudId}?`)) return;
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const URL = `${API_BASE_URL}/solicitudes/${solicitudId}/cancelar`;
            await axios.patch(URL, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            alert(`Solicitud ID ${solicitudId} CANCELADA exitosamente.`);
            fetchSolicitudes(); 
        } catch (error) {
            console.error("Error al cancelar la solicitud:", error);
            alert("Error al cancelar la solicitud. Asegúrese de tener permisos.");
        }
    };
    
    const handleViewDetails = (solicitud) => {
        setSolicitudDetails(solicitud.originalData);
    };
    
    const handleCancelEdit = () => {
        setEditId(null);
        setActiveSolicitudId(null);
        setEditData({ estado_solicitud: "Pendiente", notas_admin: "" });
    };


    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <div className={mainContainerClass}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                
                
                <div className={DASHBOARD_CARD_CLASS}>
                
                    <h1 className="text-3xl font-bold mb-6 border-b pb-2"> 
                        Gestión de Solicitudes 📋
                    </h1>
                
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        
                        
                        <div className="flex-1 min-w-0"> 
                            
                            
                            <div className="flex flex-col gap-3 mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-md">
                                
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        placeholder="Buscar por ID, Artesano o Rubro..."
                                        className="form-input w-full p-2 pl-10" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <FiSearch className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                </div>
                                
                            
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                    <span className="text-sm font-medium text-gray-600 self-center">Filtrar por:</span>
                                    {["all", ...Object.keys(ESTADOS)].map((status) => (
                                        <button 
                                            key={status} 
                                            onClick={() => setFilter(status)} 
                                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap 
                                                ${filter === status 
                                                    ? `bg-[#A0522D] text-white shadow-sm` 
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                        >
                                            {status === "all" ? "Todas" : status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            
                            {loading ? (
                                <p className="text-center text-xl text-gray-700 py-10">Cargando solicitudes...</p>
                            ) : (
                                // **BLOQUE DE TABLA ULTRA LIMPIO**
                                <div className={`p-0 overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-md`}> 
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-200 sticky top-0"> 
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Artesano</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rubro</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Dim. (m²)</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {solicitudes.map((solicitud) => (
                                                <tr 
                                                    key={solicitud.id} 
                                                    className={`hover:bg-amber-50 transition-colors cursor-pointer ${activeSolicitudId === solicitud.id ? 'bg-amber-100 border-l-4 border-amber-600' : ''}`}
                                                    onClick={() => setActiveSolicitudId(solicitud.id)}
                                                >
                                                    <td className="px-6 py-4 text-sm font-medium">
                                                        {solicitud.id}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">{solicitud.nombre}</td> 
                                                    <td className="px-6 py-4 text-sm">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${RUBROS[solicitud.rubro]?.badgeColor || 'bg-gray-500'}`}>
                                                        {solicitud.rubro}
                                                    </span>
                                                    </td>
                                                    {/* NOTE: Aquí asumo que la dimensión es el nombre del artesano, si no, ajusta esta línea */}
                                                    <td className="px-6 py-4 text-sm">{solicitud.nombre}</td> 
                                                    <td className="px-6 py-4 text-sm">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${ESTADOS[solicitud.estado]?.badge || 'bg-black'} flex items-center gap-1 shadow-sm`}>
                                                        {ESTADOS[solicitud.estado]?.icon} {solicitud.estado}
                                                    </span>
                                                    </td>
                                                    
                                                    <td className="px-6 py-4 flex space-x-2">
                                                        {/* BOTÓN EDITAR */}
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(solicitud); }} className="text-[#A0522D] hover:text-[#8B4513] p-1 rounded hover:bg-gray-100">
                                                            <FiEdit3 size={18} />
                                                        </button>
                                                        
                                                        {/* BOTÓN DETALLES */}
                                                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(solicitud); }} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-gray-100" title="Ver Detalles">
                                                            <FiEye size={18} />
                                                        </button>
                                                        
                                                        {/* BOTÓN CANCELAR */}
                                                        <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(solicitud.id); }} className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-gray-100" title="Cancelar Solicitud">
                                                            <FiTrash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        
                        {/* PANEL DE HERRAMIENTAS SIMPLIFICADO Y CON ESTILO CLARO */}
                        <div className={`w-full md:w-64 flex-shrink-0 flex flex-col gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-md`}> 
                          {/*<h3 className={`text-lg font-bold text-gray-800 mb-2 border-b pb-2`}>Herramientas</h3>*/}
                            
                            {/* Botón de Descargar PDF (Fondo claro: bg-gray-200) */}
                            <button className="bg-gray-200 text-gray-700 p-3 rounded-lg font-bold hover:bg-gray-300 transition-colors shadow-sm">
                                ⬇️ DESCARGAR PDF (Próximamente)
                            </button>
                            
                        </div>
                        
                    </div> 
                    

                    {/* --- MODAL DE EDICIÓN (Mantenido) --- */}
                    {editId && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                            <div className={`bg-white p-6 rounded-lg shadow-md w-full max-w-lg border border-gray-200`}> 
                                <h2 className={`text-xl font-bold text-gray-800 mb-4`}>✍️ Gestionar Solicitud ID: {editId}</h2> 
                                <div className="grid grid-cols-1 gap-4">
                                
                                <div>
                                    <label className={`block text-sm font-medium text-gray-700 mb-1`}>Cambiar Estado de Solicitud</label>
                                    <select 
                                    name="estado_solicitud" 
                                    value={editData.estado_solicitud} 
                                    onChange={(e) => setEditData({ ...editData, estado_solicitud: e.target.value })} 
                                    className="form-input p-2 w-full" 
                                    >
                                    {Object.keys(ESTADOS).map(estado => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                    </select>
                                </div>
                                
                                
                                <div>
                                    <label className={`block text-sm font-medium text-gray-700 mb-1`}>Notas del Administrador</label>
                                    <textarea 
                                    name="notas_admin" 
                                    value={editData.notas_admin} 
                                    onChange={(e) => setEditData({ ...editData, notas_admin: e.target.value })} 
                                    rows={3}
                                    placeholder="Ingrese el motivo de rechazo o las modificaciones requeridas."
                                    className="form-input p-2 w-full"
                                    />
                                </div>

                                <div className="flex justify-end space-x-2 mt-4">
                                    <button onClick={handleSaveEdit} className={primaryButtonClass}>
                                    Guardar Gestión
                                    </button>
                                    <button onClick={handleCancelEdit} className={secondaryButtonClass}>
                                    Cerrar
                                    </button>
                                </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- MODAL DE DETALLES (Mantenido) --- */}
                    {solicitudDetails && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
                                <h2 className={`text-xl font-bold text-gray-800 mb-4`}>👁️ Detalles de {solicitudDetails.nombre}</h2>
                                
                                <div className={`space-y-3 text-gray-700`}> 
                                <p><strong>Rubro:</strong> <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white ${RUBROS[solicitudDetails.rubro]?.badgeColor || 'bg-gray-500'}`}>{solicitudDetails.rubro}</span></p>
                                <p><strong>Dimensiones:</strong> {solicitudDetails.alto}m Alto x {solicitudDetails.ancho}m Ancho</p>
                                <p><strong>DNI:</strong> {solicitudDetails.dni}</p>
                                <p><strong>Teléfono:</strong> {solicitudDetails.telefono}</p>
                                
                                <h3 className={`text-md font-bold mt-4 text-gray-800`}>Descripción del Puesto:</h3>
                                <p className="border border-gray-200 p-3 rounded bg-gray-50 italic text-sm">
                                    {solicitudDetails.descripcion_puesto}
                                </p>
                                </div>
                                
                                <div className="flex justify-end mt-4">
                                <button onClick={() => setSolicitudDetails(null)} className={secondaryButtonClass}>
                                    Cerrar
                                </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AdminDashboard;