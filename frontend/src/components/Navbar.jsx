import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "../services/api/axiosConfig";

const ROLES = {
  1: "Artesano!",
  2: "Administrador",
  3: "Organizador",
};

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(false);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [tieneSolicitud, setTieneSolicitud] = useState(false);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".notificaciones-container")) {
        setMostrarNotificaciones(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.rol_id === 1) {
      cargarNotificaciones();
      verificarSolicitud();
    }
  }, [isAuthenticated, user, location.pathname]);

  const verificarSolicitud = async () => {
    if (isAuthenticated && user?.rol_id === 1) {
      try {
        setCargandoSolicitud(true);
        const token = localStorage.getItem("token");
        const response = await axios.get("/solicitudes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTieneSolicitud(!!response.data.solicitud);
      } catch (error) {
        console.error("Error verificando solicitud:", error);
        setTieneSolicitud(false);
      } finally {
        setCargandoSolicitud(false);
      }
    }
  };

  const cargarNotificaciones = async () => {
    try {
      setLoadingNotificaciones(true);
      const response = await axios.get("/api/v1/artesano/notificaciones");
      setNotificaciones(response.data.notificaciones);

      const noLeidas = response.data.notificaciones.filter(
        (notif) => !notif.leido
      ).length;
      setTotalNoLeidas(noLeidas);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setLoadingNotificaciones(false);
    }
  };

  const marcarComoLeida = async (notificacionId) => {
    try {
      await axios.put(
        `/api/v1/artesano/notificaciones/${notificacionId}/marcar-leida`
      );

      setNotificaciones((prev) =>
        prev.map((notif) =>
          notif.notificacion_id === notificacionId
            ? { ...notif, leido: true }
            : notif
        )
      );

      setTotalNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marcando notificación como leída:", error);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await axios.put("/api/v1/artesano/notificaciones/marcar-todas-leidas");

      setNotificaciones((prev) =>
        prev.map((notif) => ({ ...notif, leido: true }))
      );

      setTotalNoLeidas(0);
    } catch (error) {
      console.error("Error marcando todas como leídas:", error);
    }
  };

  const formatearFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parsearNotificacion = (mensaje) => {
    const partes = mensaje.split("Comentarios del administrador:");
    const mensajePrincipal = partes[0].trim();
    const comentarioAdmin = partes[1] ? partes[1].trim() : null;

    return { mensajePrincipal, comentarioAdmin };
  };

  const getTipoNotificacion = (mensaje) => {
    if (mensaje.includes("aprobada") || mensaje.includes("Aprobada"))
      return "aprobada";
    if (mensaje.includes("rechazada") || mensaje.includes("Rechazada"))
      return "rechazada";
    if (mensaje.includes("cancelada") || mensaje.includes("Cancelada"))
      return "cancelada";
    if (mensaje.includes("modificaciones") || mensaje.includes("modificación"))
      return "modificacion";
    if (mensaje.includes("parcelas")) return "info";
    return "general";
  };

  const CampanaIcon = () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
        stroke="#8B4513"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
        stroke="#8B4513"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="logo-link">
          <img
            src="/images/logo.png"
            alt="Logo Fiesta del Mondongo"
            className="logo-image"
          />
          <span className="logo-text">
            Fiesta Nacional del Mondongo y la Torta Frita
          </span>
        </Link>
      </div>

      <nav className="navbar-links">
        {location.pathname !== "/" &&
          user?.rol_id === 1 && (
            <Link to="/">Inicio</Link>
          )}


        {isAuthenticated && user?.rol_id === 1 && tieneSolicitud && (
          <Link to="/predio">Predio</Link>
        )}

        {isAuthenticated && user?.rol_id === 1 && (
          <>
            {/* Historial visible solo cuando también aparece Mi Perfil */}
            {tieneSolicitud && (
              <Link to="/historial-solicitudes" className="btn-historial">
                Historial
              </Link>
            )}

            {/* Mostrar Mi Perfil o Formulario según tenga solicitud activa */}
            {location.pathname === "/" &&
              !cargandoSolicitud &&
              (tieneSolicitud ? (
                <Link to="/mi-perfil" className="btn-formulario">
                  Mi Perfil
                </Link>
                
              ) : (
                <Link to="/formulario" className="btn-formulario">
                  Formulario
                </Link>
              ))}
          </>
        )}

        {isAuthenticated ? (
          <>
            {/* Campanita de notificaciones para artesanos */}
            {user?.rol_id === 1 && (
              <div className="notificaciones-container">
                <button
                  className="notificaciones-btn"
                  onClick={() =>
                    setMostrarNotificaciones(!mostrarNotificaciones)
                  }
                  title="Notificaciones"
                >
                  <CampanaIcon />
                  {totalNoLeidas > 0 && (
                    <span className="notificaciones-badge">
                      {totalNoLeidas}
                    </span>
                  )}
                </button>

                {/* Dropdown de notificaciones */}
                {mostrarNotificaciones && (
                  <div className="notificaciones-dropdown">
                    <div className="notificaciones-header">
                      <h3>Notificaciones</h3>
                      {notificaciones.some((n) => !n.leido) && (
                        <button
                          className="marcar-todas-btn"
                          onClick={marcarTodasLeidas}
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>

                    <div className="notificaciones-list">
                      {loadingNotificaciones ? (
                        <div className="notificacion-loading">
                          Cargando notificaciones...
                        </div>
                      ) : notificaciones.length === 0 ? (
                        <div className="notificacion-vacia">
                          No hay notificaciones
                        </div>
                      ) : (
                        notificaciones.map((notificacion) => {
                          const { mensajePrincipal, comentarioAdmin } =
                            parsearNotificacion(notificacion.mensaje);
                          const tipo = getTipoNotificacion(
                            notificacion.mensaje
                          );

                          return (
                            <div
                              key={notificacion.notificacion_id}
                              className={`notificacion-item ${
                                notificacion.leido ? "leida" : "no-leida"
                              } ${tipo}`}
                              onClick={() =>
                                marcarComoLeida(notificacion.notificacion_id)
                              }
                            >
                              <div className="notificacion-contenido">
                                <div className="notificacion-mensaje">
                                  {mensajePrincipal}
                                </div>
                                {comentarioAdmin && (
                                  <div className="notificacion-comentario">
                                    <strong>Comentario:</strong>{" "}
                                    {comentarioAdmin}
                                  </div>
                                )}
                                <div className="notificacion-fecha">
                                  {formatearFecha(notificacion.fecha_envio)}
                                </div>
                              </div>
                              {!notificacion.leido && (
                                <div className="notificacion-punto"></div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {isAuthenticated && user?.rol_id === 2 && (
              <>
                <Link to="/dashboard" className="btn-config"> 
                  Dashboard
                </Link>
              </>
            )}
            {isAuthenticated && user?.rol_id === 3 && (
              <>
                <Link to="/configurar-mapa" className="btn-config">
                  Configurar Mapa
                </Link>

                <Link to="/gestion-usuarios" className="btn-config">
                  Gestión de Usuarios
                </Link>
              </>
            )}
            <span className="user-greeting">
              Hola, {ROLES[user?.rol_id] || "Usuario"}
            </span>

            <button className="btn-login" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </>
        ) : (
          <button className="btn-login" onClick={() => navigate("/login")}>
            Iniciar sesión
          </button>
        )}
      </nav>
    </header>
  );
};

export default Navbar;