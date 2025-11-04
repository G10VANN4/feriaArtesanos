// src/pages/GestionUsuarios.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import axios from "../services/api/axiosConfig"; // Cambiar a axios configurado
import "../styles/App.css";

const GestionUsuarios = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Estados para el formulario de creación/edición
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    rol_id: ""
  });
  
  // Estados para la lista de usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [filtroRol, setFiltroRol] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados para edición
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Verificar permisos
  useEffect(() => {
    if (!isAuthenticated || user?.rol_id !== 3) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    if (isAuthenticated && user?.rol_id === 3) {
      cargarUsuarios();
    }
  }, [isAuthenticated, user]);

  // Función para cargar usuarios
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Cargar administradores
      const response = await axios.get("/api/usuarios/buscar/rol?rol_id=2");
      // Cargar organizadores
      const organizadoresResponse = await axios.get("/api/usuarios/buscar/rol?rol_id=3");
      
      const todosUsuarios = [...response.data.usuarios, ...organizadoresResponse.data.usuarios];
      setUsuarios(todosUsuarios);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setError(error.response?.data?.error || "Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  // Función para crear usuario
  const crearUsuario = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setLoading(true);
      const usuarioData = {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        rol_id: parseInt(formData.rol_id)
        // NOTA: El campo 'creado_por' ahora se obtiene automáticamente del token en el backend
      };

      await axios.post("/api/usuarios/crear", usuarioData);
      
      setSuccess("Usuario creado exitosamente");
      resetForm();
      
      // Recargar la lista de usuarios
      cargarUsuarios();
    } catch (error) {
      console.error("Error creando usuario:", error);
      setError(error.response?.data?.error || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  // Función para editar usuario
  const editarUsuario = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones para edición
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos para edición
      const usuarioData = {
        nombre: formData.nombre,
        email: formData.email,
      };

      // Solo incluir password si se proporcionó uno nuevo
      if (formData.password) {
        usuarioData.password = formData.password;
      }

      await axios.put(`/api/usuarios/editar/${usuarioEditando.usuario_id}`, usuarioData);
      
      setSuccess("Usuario actualizado exitosamente");
      cerrarModalEdicion();
      
      // Recargar la lista de usuarios
      cargarUsuarios();
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      setError(error.response?.data?.error || "Error al actualizar el usuario");
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar usuario
  const eliminarUsuario = async (usuarioId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      return;
    }

    try {
      await axios.delete(`/api/usuarios/eliminar/${usuarioId}`);
      setSuccess("Usuario eliminado exitosamente");
      cargarUsuarios();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      setError(error.response?.data?.error || "Error al eliminar el usuario");
    }
  };

  // Función para buscar por nombre
  const buscarPorNombre = async () => {
    if (!busqueda.trim()) {
      cargarUsuarios();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`/api/usuarios/buscar/nombre?nombre=${encodeURIComponent(busqueda)}`);
      setUsuarios(response.data.usuarios);
    } catch (error) {
      console.error("Error buscando usuarios:", error);
      setError(error.response?.data?.error || "Error al buscar usuarios");
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir modal de edición
  const abrirModalEdicion = async (usuarioId) => {
    try {
      const response = await axios.get(`/api/usuarios/${usuarioId}`);
      const usuario = response.data;
      
      setUsuarioEditando(usuario);
      setModoEdicion(true);
      setFormData({
        nombre: usuario.nombre || "",
        email: usuario.email || "",
        password: "",
        confirmPassword: "",
        rol_id: usuario.rol_id?.toString() || ""
      });
      setMostrarModalEdicion(true);
      setError("");
      setSuccess("");
    } catch (error) {
      console.error("Error al cargar datos del usuario:", error);
      setError(error.response?.data?.error || "Error al cargar datos del usuario");
    }
  };

  // Función para cerrar modal de edición
  const cerrarModalEdicion = () => {
    setMostrarModalEdicion(false);
    setUsuarioEditando(null);
    setModoEdicion(false);
    resetForm();
  };

  // Función para resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      email: "",
      password: "",
      confirmPassword: "",
      rol_id: ""
    });
  };

  // Filtrar usuarios por rol
  const usuariosFiltrados = usuarios.filter(usuario => {
    if (filtroRol === "todos") return true;
    if (filtroRol === "administradores") return usuario.rol_id === 2;
    if (filtroRol === "organizadores") return usuario.rol_id === 3;
    return true;
  });

  if (!isAuthenticated || user?.rol_id !== 3) {
    return null;
  }

  return (
    <div className="gestion-usuarios-container">
      <Navbar />
      
      <div className="gestion-usuarios-content">
        <div className="gestion-header">
          <h1>Gestión de Usuarios</h1>
        </div>

        {/* Mensajes de éxito y error */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Formulario de creación */}
        <div className="crear-usuario-section">
          <h2>Agregar Nuevo Usuario</h2>
          <form onSubmit={crearUsuario} className="usuario-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre del usuario</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingrese nombre..."
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select
                  className="form-input"
                  value={formData.rol_id}
                  onChange={(e) => setFormData({...formData, rol_id: e.target.value})}
                  required
                >
                  <option value="">Seleccione rol...</option>
                  <option value="2">Administrador</option>
                  <option value="3">Organizador</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Ingrese email..."
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Ingrese contraseña..."
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Repetir contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirmar contraseña..."
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary crear-usuario-btn"
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </form>
        </div>

        {/* Listado de usuarios */}
        <div className="listado-usuarios-section">
          <div className="listado-header">
            <h2>Listado de Usuarios</h2>
            
            <div className="filtros-container">
              <div className="filtro-rol">
                <button 
                  className={`filtro-btn ${filtroRol === "todos" ? "active" : ""}`}
                  onClick={() => setFiltroRol("todos")}
                >
                  Todos
                </button>
                <button 
                  className={`filtro-btn ${filtroRol === "administradores" ? "active" : ""}`}
                  onClick={() => setFiltroRol("administradores")}
                >
                  Administradores
                </button>
                <button 
                  className={`filtro-btn ${filtroRol === "organizadores" ? "active" : ""}`}
                  onClick={() => setFiltroRol("organizadores")}
                >
                  Organizadores
                </button>
              </div>
              
              <div className="busqueda-container">
                <input
                  type="text"
                  className="busqueda-input"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && buscarPorNombre()}
                />
                <button 
                  className="btn-buscar"
                  onClick={buscarPorNombre}
                >
                  Buscar
                </button>
                {busqueda && (
                  <button 
                    className="btn-limpiar"
                    onClick={() => {
                      setBusqueda("");
                      cargarUsuarios();
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">Cargando usuarios...</div>
          ) : (
            <div className="usuarios-table-container">
              <table className="usuarios-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>USUARIO</th>
                    <th>ROL</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(usuario => (
                    <tr key={usuario.usuario_id}>
                      <td>{usuario.usuario_id}</td>
                      <td>
                        <div className="usuario-info">
                          <div className="usuario-nombre">{usuario.nombre}</div>
                          <div className="usuario-email">{usuario.email}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`rol-badge ${usuario.rol_id === 2 ? "admin" : "organizador"}`}>
                          {usuario.rol_id === 2 ? "Administrador" : "Organizador"}
                        </span>
                      </td>
                      <td>
                        <span className={`estado-badge ${usuario.estado_id === 1 ? "activo" : "inactivo"}`}>
                          {usuario.estado_id === 1 ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="acciones-container">
                          <button 
                            className="btn-editar"
                            onClick={() => abrirModalEdicion(usuario.usuario_id)}
                            title="Editar usuario"
                            disabled={usuario.estado_id === 2} // No editar usuarios inactivos
                          >
                            Editar
                          </button>
                          <button 
                            className="btn-eliminar"
                            onClick={() => eliminarUsuario(usuario.usuario_id)}
                            title="Eliminar usuario"
                            disabled={usuario.estado_id === 2} // No eliminar usuarios ya inactivos
                          >
                            {usuario.estado_id === 2 ? "Eliminado" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {usuariosFiltrados.length === 0 && (
                <div className="no-usuarios">
                  No se encontraron usuarios
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de edición */}
        {mostrarModalEdicion && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Editando Usuario: {usuarioEditando?.nombre}</h2>
                <button 
                  className="btn-cerrar"
                  onClick={cerrarModalEdicion}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={editarUsuario} className="usuario-form">
                <div className="form-group">
                  <label className="form-label">Nombre del usuario</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select
                    className="form-input"
                    value={formData.rol_id}
                    disabled
                  >
                    <option value="2">Administrador</option>
                    <option value="3">Organizador</option>
                  </select>
                  <small className="form-help">El rol no se puede modificar</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                       Nueva contraseña <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>(Opcional)</span>
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Dejar vacío para no cambiar"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Confirmar contraseña</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Confirmar contraseña..."
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={cerrarModalEdicion}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Actualizando..." : "Actualizar Usuario"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUsuarios;