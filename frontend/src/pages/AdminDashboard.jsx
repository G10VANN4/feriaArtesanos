
/*
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiEdit, FiTrash2, FiEye, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle } from "react-icons/fi";
import axios from "axios";

// --- URLs TEMPORALES ---
const API_URL = "http://localhost:5000/artesanos/";

// --- CONSTANTES Y CÓDIGO DE COLORES (Basado en RNF10) ---

const RUBROS = {
  Artesanías: { color: "bg-blue-100 text-blue-800", badgeColor: "bg-blue-600" },
  Gastronomía: { color: "bg-red-100 text-red-800", badgeColor: "bg-red-600" },
  Reventa: { color: "bg-green-100 text-green-800", badgeColor: "bg-green-600" },
};

const ESTADOS = {
  Aprobada: { badge: "bg-green-500", icon: <FiCheckCircle /> },
  Pendiente: { badge: "bg-yellow-500", icon: <FiClock /> },
  Rechazada: { badge: "bg-red-500", icon: <FiXCircle /> },
  Cancelada: { badge: "bg-gray-500", icon: <FiTrash2 /> },
  "Pendiente por Modificación": { badge: "bg-orange-500", icon: <FiAlertTriangle /> },
};

// --- Datos de Prueba (Simulando la información del Artesano/Puesto/Solicitud) ---
const DUMMY_ARTISANS = [
  {
    artesano_id: 1,
    nombre: "Javier Pérez",
    rubro: "Artesanías",
    dimensiones: "3x3",
    alto: 3,
    ancho: 3,
    telefono: "11-5555-1234",
    dni: "30.123.456",
    descripcion_puesto: "Cerámica gres y alfarería tradicional.",
    estado_solicitud: "Aprobada",
    fecha_solicitud: new Date("2024-09-01T10:00:00Z").toISOString(),
  },
  {
    artesano_id: 2,
    nombre: "Ana Gómez",
    rubro: "Gastronomía",
    dimensiones: "2x4",
    alto: 2,
    ancho: 4,
    telefono: "11-4444-5678",
    dni: "35.987.654",
    descripcion_puesto: "Food truck de comida vegana y cerveza artesanal.",
    estado_solicitud: "Pendiente",
    fecha_solicitud: new Date("2024-09-15T12:30:00Z").toISOString(),
  },
  {
    artesano_id: 3,
    nombre: "Martín Cruz",
    rubro: "Reventa",
    dimensiones: "3x2",
    alto: 3,
    ancho: 2,
    telefono: "11-3333-9012",
    dni: "28.000.111",
    descripcion_puesto: "Figuras de acción importadas y Funko Pops.",
    estado_solicitud: "Pendiente por Modificación",
    fecha_solicitud: new Date("2024-10-01T08:45:00Z").toISOString(),
  },
];
// --- Fin Datos de Prueba ---

const AdminDashboard = () => {
  // Filtros ahora basados en el 'estado_solicitud'
  const [filter, setFilter] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [artesanos, setArtesanos] = useState([]);
  
  // Estado para la edición (Modal de Aprobación/Modificación)
  const [editId, setEditId] = useState(null);
  const [editArtesano, setEditArtesano] = useState({
    estado_solicitud: "Pendiente",
    notas_admin: "", // Campo nuevo para la nota del administrador
  });

  // Estado para el modal de detalles (Muestra la descripción del puesto)
  const [artesanoDetails, setArtesanoDetails] = useState(null);

  useEffect(() => {
    fetchArtesanos();
  }, []);

  const fetchArtesanos = async () => {
    console.log("Simulando fetch de artesanos...");
    // Simulación de la llamada API
    try {
      // Sustituir esto por la llamada real cuando la API esté lista:
      // const response = await axios.get(API_URL);
      const responseData = DUMMY_ARTISANS;
      
      const formattedData = responseData.map((item) => ({
        id: item.artesano_id,
        nombre: item.nombre,
        rubro: item.rubro,
        dimensiones: item.dimensiones,
        estado: item.estado_solicitud,
        fechaSolicitud: new Date(item.fecha_solicitud).toLocaleDateString(),
        // Mantener datos originales para el modal de detalle
        originalData: item
      }));
      setArtesanos(formattedData);
    } catch (error) {
      console.error("Error al obtener artesanos:", error);
      // Usar dummy data si falla la simulación
      setArtesanos(DUMMY_ARTISANS.map(item => ({
        id: item.artesano_id,
        nombre: item.nombre,
        rubro: item.rubro,
        dimensiones: item.dimensiones,
        estado: item.estado_solicitud,
        fechaSolicitud: new Date(item.fecha_solicitud).toLocaleDateString(),
        originalData: item
      })));
    }
  };

  const handleEditArtesanoChange = (e) => {
    setEditArtesano({ ...editArtesano, [e.target.name]: e.target.value });
  };

  const handleEditClick = (artesano) => {
    setEditId(artesano.id);
    setEditArtesano({
      estado_solicitud: artesano.estado,
      notas_admin: artesano.originalData.notas_admin || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const dataToPatch = {
        estado_solicitud: editArtesano.estado_solicitud,
        // En una API real, aquí se enviarían las notas_admin
        // y se actualizaría el registro en la base de datos
      };

      // Sustituir por la llamada real:
      // await axios.patch(`${API_URL}${editId}/solicitud`, dataToPatch); 
      
      // Simulación de guardado
      console.log(`Simulando PATCH a ${API_URL}${editId} con datos:`, dataToPatch);
      
      alert(`Estado de Solicitud de ${editArtesano.estado_solicitud} guardado (Simulación)`);
      
      setEditId(null);
      setEditArtesano({ estado_solicitud: "Pendiente", notas_admin: "" });
      fetchArtesanos(); // Refrescar lista (simulado)
    } catch (error) {
      alert("Error al actualizar la solicitud (Simulación)");
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditArtesano({ estado_solicitud: "Pendiente", notas_admin: "" });
  };
  
  const handleViewDetails = (artesano) => {
    setArtesanoDetails(artesano.originalData);
  };

  // Lógica de filtrado y búsqueda
  const filteredData = artesanos
    .filter((item) => {
      // Filtros por Estado de Solicitud
      if (filter !== "all") return item.estado === filter;
      return true;
    })
    .filter(
      (item) =>
        // Búsqueda por Nombre, ID o Rubro
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id).includes(searchTerm) ||
        item.rubro.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Clases CSS reutilizadas del estilo beige/marrón
  const primaryButtonClass = "bg-[#A0522D] text-white px-4 py-2 rounded-lg hover:bg-[#8B4513] transition-colors";
  const secondaryButtonClass = "bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors";
  const mainContainerClass = "container mx-auto p-4 bg-[#F8F4E3] min-h-screen";

  return (
    <div className={mainContainerClass}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-[#5C4033] mb-6">
          Gestión de Solicitudes de Artesanos (Dashboard)
        </h1>
    
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex space-x-2 flex-wrap gap-2">
            {["all", ...Object.keys(ESTADOS).filter(e => e !== "Cancelada")].map((status) => (
              <button 
                key={status} 
                onClick={() => setFilter(status)} 
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                  filter === status 
                    ? primaryButtonClass 
                    : "bg-[#FAF0E6] text-[#A0522D] border border-[#A0522D] hover:bg-[#E0DBCF]"
                }`}
              >
                {status === "all" ? "Todas" : status}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por Nombre, ID o Rubro..."
              className="w-full p-2 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A0522D] border-[#A0522D] text-[#38312B] bg-[#FAF0E6]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          
            <svg className="absolute left-2 top-3 h-4 w-4 text-[#A0522D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="overflow-x-auto bg-[#FAF0E6] rounded-lg shadow-xl border border-[#E0DBCF]">
          <table className="min-w-full divide-y divide-[#E0DBCF]">
            <thead className="bg-[#FAF0E6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Artesano</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Rubro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Dimensiones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Fecha Solicitud</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Estado Solicitud</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#5C4033] uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E0DBCF]">
              {filteredData.map((artesano) => (
                <tr key={artesano.id} className="hover:bg-[#F8F4E3] transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-[#38312B]">{artesano.id}</td>
                  <td className="px-6 py-4 text-sm text-[#38312B]">{artesano.nombre}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${RUBROS[artesano.rubro].badgeColor}`}>
                      {artesano.rubro}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#38312B]">{artesano.dimensiones} m²</td>
                  <td className="px-6 py-4 text-sm text-[#38312B]">{artesano.fechaSolicitud}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${ESTADOS[artesano.estado].badge} flex items-center gap-1`}>
                      {ESTADOS[artesano.estado].icon} {artesano.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex space-x-2">
                    
                    <button onClick={() => handleEditClick(artesano)} className="text-[#A0522D] hover:text-[#8B4513]" title="Gestionar Solicitud">
                      <FiEdit size={18} />
                    </button>
                   
                    <button onClick={() => handleViewDetails(artesano)} className="text-blue-600 hover:text-blue-900" title="Ver Detalles del Puesto">
                      <FiEye size={18} />
                    </button>
                    
                    <button onClick={() => alert(`Simulando cancelación de Solicitud del Artesano ID: ${artesano.id}`)} className="text-red-600 hover:text-red-900" title="Cancelar Solicitud">
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        
        {editId && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
            <div className="bg-[#FAF0E6] p-6 rounded-lg shadow-2xl w-full max-w-lg border-t-4 border-[#A0522D]">
              <h2 className="text-xl font-bold text-[#5C4033] mb-4">Gestionar Solicitud del Artesano ID: {editId}</h2>
              <div className="grid grid-cols-1 gap-4">
                
          
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1">Cambiar Estado de Solicitud</label>
                  <select 
                    name="estado_solicitud" 
                    value={editArtesano.estado_solicitud} 
                    onChange={handleEditArtesanoChange} 
                    className="border rounded p-2 w-full border-[#A0522D] bg-white text-[#38312B]"
                  >
                    {Object.keys(ESTADOS).map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                
                
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1">Notas del Administrador</label>
                  <textarea 
                    name="notas_admin" 
                    value={editArtesano.notas_admin} 
                    onChange={handleEditArtesanoChange} 
                    rows={3}
                    placeholder="Ingrese el motivo de rechazo o las modificaciones requeridas (Pendiente por Modificación)."
                    className="border rounded p-2 w-full border-[#A0522D] bg-white text-[#38312B]" 
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <button onClick={handleSaveEdit} className={primaryButtonClass}>
                    Guardar Gestión
                  </button>
                  <button onClick={handleCancelEdit} className={secondaryButtonClass}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {artesanoDetails && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
            <div className="bg-[#FAF0E6] p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-blue-600">
              <h2 className="text-xl font-bold text-[#5C4033] mb-4">Detalles del Puesto de {artesanoDetails.nombre}</h2>
              
              <div className="space-y-3 text-[#38312B]">
                <p><strong>Rubro:</strong> <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded text-white ${RUBROS[artesanoDetails.rubro].badgeColor}`}>{artesanoDetails.rubro}</span></p>
                <p><strong>Dimensiones:</strong> {artesanoDetails.dimensiones} ({artesanoDetails.alto}m Alto x {artesanoDetails.ancho}m Ancho)</p>
                <p><strong>DNI:</strong> {artesanoDetails.dni}</p>
                <p><strong>Teléfono:</strong> {artesanoDetails.telefono}</p>
                
                <h3 className="text-md font-bold mt-4 text-[#5C4033]">Descripción del Puesto:</h3>
                <p className="border border-[#E0DBCF] p-3 rounded bg-white italic text-sm">
                  {artesanoDetails.descripcion_puesto}
                </p>
              </div>
              
              <div className="flex justify-end mt-4">
                <button onClick={() => setArtesanoDetails(null)} className={secondaryButtonClass}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard; */