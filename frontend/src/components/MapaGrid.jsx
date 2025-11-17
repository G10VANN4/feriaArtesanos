import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const MapaGrid = ({ onParcelaSeleccionada, parcelasSeleccionadas = [] }) => {
  const { user } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [mapaInfo, setMapaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parcelaConfirmando, setParcelaConfirmando] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  // Estados para administrador
  const [parcelasSeleccionadasAdmin, setParcelasSeleccionadasAdmin] = useState([]);
  const [modoAdmin, setModoAdmin] = useState("ver"); // 'ver', 'deshabilitar', 'asignar_rubro'
  const [infoParcela, setInfoParcela] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState("");
  const [cambiandoRubro, setCambiandoRubro] = useState(false);
  const [cargandoRubros, setCargandoRubros] = useState(false);

  // Determinar roles
  const esAdmin = user?.rol_id === 2 || user?.rol_id === 3;
  const esArtesano = user?.rol_id === 1;

  // URL del backend
  const API_BASE_URL = "http://localhost:5000";
  const endpointParcelas = esAdmin
    ? `${API_BASE_URL}/api/v1/admin/parcelas`
    : `${API_BASE_URL}/api/v1/mapa/parcelas`;

  // Función para obtener headers
  const getHeaders = () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      if (!token) {
        setError("No estás autenticado. Por favor, inicia sesión nuevamente.");
        return null;
      }
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error("Error obteniendo token:", error);
      setError("Error de autenticación");
      return null;
    }
  };

  // Cargar parcelas del mapa
  const cargarParcelas = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getHeaders();
      if (!headers) {
        setLoading(false);
        return;
      }

      const response = await fetch(endpointParcelas, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
        } else if (response.status === 403) {
          setError("No tienes permisos para acceder al mapa");
        } else {
          setError(`Error ${response.status}: No se pudo cargar el mapa`);
        }
        return;
      }

      const data = await response.json();
      console.log("Datos recibidos:", data);

      if (data.mapa) {
        setParcelas(data.parcelas || []);
        setMapaInfo(data.mapa);
      } else {
        setError("El servidor no devolvió información del mapa");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      setError(`Error de conexión: ${error.message}. Verifica que el backend esté corriendo en ${API_BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  // Cargar rubros disponibles desde la base de datos
  const cargarRubros = async () => {
    try {
      setCargandoRubros(true);
      const headers = getHeaders();
      if (!headers) {
        setCargandoRubros(false);
        return;
      }

      console.log("Cargando rubros desde la base de datos...");
      const response = await fetch(`${API_BASE_URL}/api/v1/rubros`, {
        method: "GET",
        headers: headers,
      });

      console.log("Respuesta rubros:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Rubros cargados desde BD:", data);
        setRubros(data);
      } else {
        console.error("Error al cargar rubros:", response.status);
        setRubros([]);
      }
    } catch (error) {
      console.error("Error cargando rubros:", error);
      setRubros([]);
    } finally {
      setCargandoRubros(false);
    }
  };

  // Obtener parcela por coordenadas
  const getParcelaByCoords = (fila, columna) => {
    return parcelas.find((p) => p.fila === fila && p.columna === columna);
  };

  // Obtener clase CSS para parcela - UNIFICADA
  const getParcelaClass = (parcela) => {
    if (!parcela || !parcela.parcela_id) return "parcela-celda desconocida";

    if (esAdmin) {
      const estaSeleccionadaAdmin = parcelasSeleccionadasAdmin.includes(parcela.parcela_id);
      if (estaSeleccionadaAdmin) return "parcela-celda seleccionada-admin";
    } else {
      const estaSeleccionada = parcelasSeleccionadas.some(
        (ps) => ps.parcela_id === parcela.parcela_id
      );
      if (estaSeleccionada) return "parcela-celda seleccionada";
    }

    if (!parcela.habilitada) return "parcela-celda deshabilitada";
    if (parcela.ocupada) return "parcela-celda ocupada";
    return "parcela-celda disponible";
  };

  // Obtener estilo de color basado en rubro
  const getParcelaStyle = (parcela) => {
    if (!parcela || !parcela.rubro_info) return {};

    // Si está deshabilitada, mostrar en gris
    if (!parcela.habilitada) {
      return { backgroundColor: "#6c757d" };
    }

    // Si está ocupada, mostrar color más oscuro
    if (parcela.ocupada) {
      return { 
        backgroundColor: parcela.rubro_info.color,
        filter: "brightness(0.7)"
      };
    }

    // Disponible - mostrar color normal del rubro
    return { backgroundColor: parcela.rubro_info.color };
  };

  // Manejar clic en parcela - UNIFICADO
  const handleParcelaClick = (parcela) => {
    if (!parcela || !parcela.parcela_id) return;

    if (esAdmin) {
      if (modoAdmin === "ver") {
        setInfoParcela(parcela);
        setMostrarModal(true);
      } else if (modoAdmin === "deshabilitar") {
        toggleSeleccionParcelaAdmin(parcela);
      } else if (modoAdmin === "asignar_rubro") {
        toggleSeleccionParcelaAdmin(parcela);
      } else if (modoAdmin === "info" && parcela.ocupada) {
        setInfoParcela(parcela);
        setMostrarModal(true);
      }
    } else {
      if (!parcela.habilitada) return;
      if (parcela.ocupada) return;
      if (onParcelaSeleccionada) {
        onParcelaSeleccionada(parcela);
      }
    }
  };

  // Funciones específicas para administrador
  const toggleSeleccionParcelaAdmin = (parcela) => {
    setParcelasSeleccionadasAdmin((prev) =>
      prev.includes(parcela.parcela_id)
        ? prev.filter((id) => id !== parcela.parcela_id)
        : [...prev, parcela.parcela_id]
    );
  };

  // Deshabilitar parcelas seleccionadas
  const deshabilitarParcelas = async () => {
    try {
      const headers = getHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/parcelas/deshabilitar`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ parcelas_ids: parcelasSeleccionadasAdmin }),
        }
      );

      if (response.ok) {
        await cargarParcelas();
        setParcelasSeleccionadasAdmin([]);
        setModoAdmin("ver");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al deshabilitar parcelas");
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  // Habilitar parcelas seleccionadas
  const habilitarParcelas = async () => {
    try {
      const headers = getHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/parcelas/habilitar`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ parcelas_ids: parcelasSeleccionadasAdmin }),
        }
      );

      if (response.ok) {
        await cargarParcelas();
        setParcelasSeleccionadasAdmin([]);
        setModoAdmin("ver");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al habilitar parcelas");
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  // Asignar rubro a parcelas seleccionadas
  const asignarRubroParcelas = async () => {
    if (!rubroSeleccionado) {
      setError("Por favor selecciona un rubro");
      return;
    }

    try {
      setCambiandoRubro(true);
      const headers = getHeaders();
      if (!headers) return;

      const promises = parcelasSeleccionadasAdmin.map(async (parcelaId) => {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/admin/parcelas/${parcelaId}/rubro`,
          {
            method: "PUT",
            headers: headers,
            body: JSON.stringify({ rubro_id: parseInt(rubroSeleccionado) }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error en parcela ${parcelaId}`);
        }

        return response.json();
      });

      await Promise.all(promises);
      
      await cargarParcelas();
      setParcelasSeleccionadasAdmin([]);
      setRubroSeleccionado("");
      setModoAdmin("ver");
      setError(null);
    } catch (error) {
      setError(`Error al asignar rubro: ${error.message}`);
    } finally {
      setCambiandoRubro(false);
    }
  };


  // Helper para tooltip
  const getParcelaTitle = (parcela) => {
    if (!parcela) return "Parcela no cargada";

    let title = `Fila ${parcela.fila}, Columna ${parcela.columna}`;

    if (parcela.rubro_info) {
      title += ` - ${parcela.rubro_info.tipo}`;
    }

    if (!parcela.habilitada) {
      title += " - NO DISPONIBLE";
    } else if (parcela.ocupada) {
      title += " - OCUPADA";
      if (parcela.artesano_info) {
        title += ` por ${parcela.artesano_info.nombre}`;
      }
    } else {
      title += " - DISPONIBLE";
    }

    if (esAdmin && (modoAdmin === "deshabilitar" || modoAdmin === "asignar_rubro")) {
      title += " - Click para seleccionar/deseleccionar";
    }

    return title;
  };

  // Helper para cursor
  const getParcelaCursor = (parcela) => {
    if (esAdmin) {
      if (modoAdmin === "deshabilitar" || modoAdmin === "asignar_rubro") return "pointer";
      if (modoAdmin === "info" && !parcela.ocupada) return "not-allowed";
      return "pointer";
    } else {
      return parcela?.habilitada && !parcela?.ocupada ? "pointer" : "not-allowed";
    }
  };

  // Obtener color de un rubro
  const getColorRubro = (rubro) => {
    if (!rubro) return "#CCCCCC";
    return rubro.color_rel?.codigo_hex || "#CCCCCC";
  };

  // Verificación de autenticación
  const verificarAutenticacion = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No estás autenticado. Redirigiendo al login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!verificarAutenticacion()) {
      return;
    }
    cargarParcelas();
    if (esAdmin) {
      cargarRubros();
    }
  }, []);

  // Renderizado condicional según el rol
  if (loading) {
    return (
      <div className="mapa-grid-simple">
        <div className="mapa-header">
          <h2>{esAdmin ? "Panel de Administración" : "Selecciona tu parcela"}</h2>
          <button className="btn-actualizar" disabled>🔄</button>
        </div>
        <div className="cargando-parcelas">Cargando mapa...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mapa-grid-simple">
        <div className="mapa-header">
          <h2>{esAdmin ? "Panel de Administración" : "Selecciona tu parcela"}</h2>
          <button className="btn-actualizar" onClick={cargarParcelas}>🔄</button>
        </div>
        <div className="error-mapa">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={cargarParcelas}>Reintentar</button>
            <button
              onClick={() => (window.location.href = "/login")}
              style={{ marginLeft: "0.5rem", background: "#dc3545" }}
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!mapaInfo) {
    return (
      <div className="mapa-grid-simple">
        <div className="mapa-header">
          <h2>{esAdmin ? "Panel de Administración" : "Selecciona tu parcela"}</h2>
          <button className="btn-actualizar" onClick={cargarParcelas}>🔄</button>
        </div>
        <div className="error-mapa">
          No se encontró información del mapa.
          <button onClick={cargarParcelas}>Reintentar</button>
        </div>
      </div>
    );
  }

  const { cant_total_filas: totalFilas, cant_total_columnas: totalColumnas } = mapaInfo;

  return (
    <div className={`mapa-grid-simple ${esAdmin ? "modo-admin" : ""}`}>
      {/* Header del mapa */}
      <div className="mapa-header">
        <h2>
          {esAdmin ? "Panel de Administración - Mapa" : "Selecciona tu parcela"}
          ({totalFilas}x{totalColumnas})
        </h2>
        <button
          className="btn-actualizar"
          onClick={cargarParcelas}
          disabled={loading}
        >
          {loading ? "🔄" : "🔄"}
        </button>
      </div>

      {/* Controles de administrador */}
      {esAdmin && (
        <div className="admin-controls">
          <div className="modos-administrador">
            <button
              className={modoAdmin === "ver" ? "active" : ""}
              onClick={() => {
                setModoAdmin("ver");
                setParcelasSeleccionadasAdmin([]);
              }}
            >
              Modo Ver
            </button>
            <button
              className={modoAdmin === "deshabilitar" ? "active" : ""}
              onClick={() => setModoAdmin("deshabilitar")}
            >
              Modo Deshabilitar/Habilitar
            </button>
            <button
              className={modoAdmin === "asignar_rubro" ? "active" : ""}
              onClick={() => setModoAdmin("asignar_rubro")}
            >
              Asignar Rubro
            </button>
            <button
              className={modoAdmin === "info" ? "active" : ""}
              onClick={() => {
                setModoAdmin("info");
                setParcelasSeleccionadasAdmin([]);
              }}
            >
              Información Artesanos
            </button>
          </div>

          {/* Panel de acciones según el modo */}
          {modoAdmin === "deshabilitar" && parcelasSeleccionadasAdmin.length > 0 && (
            <div className="acciones-lote">
              <p><strong>{parcelasSeleccionadasAdmin.length}</strong> parcelas seleccionadas</p>
              <div className="botones-accion">
                <button onClick={deshabilitarParcelas} className="btn-deshabilitar">
                  Deshabilitar Seleccionadas
                </button>
                <button onClick={habilitarParcelas} className="btn-habilitar">
                  Habilitar Seleccionadas
                </button>
                <button onClick={() => setParcelasSeleccionadasAdmin([])} className="btn-cancelar">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {modoAdmin === "asignar_rubro" && (
            <div className="panel-asignar-rubro">
              <div className="selector-rubro">
                <label>Seleccionar Rubro:</label>
                <select
                  value={rubroSeleccionado}
                  onChange={(e) => setRubroSeleccionado(e.target.value)}
                  disabled={cargandoRubros}
                >
                  <option value="">-- {cargandoRubros ? "Cargando rubros..." : "Selecciona un rubro"} --</option>
                  {rubros.map((rubro) => (
                    <option key={rubro.rubro_id} value={rubro.rubro_id}>
                      {rubro.tipo} ({getColorRubro(rubro)})
                    </option>
                  ))}
                </select>
                {cargandoRubros && <span className="cargando-texto">Cargando rubros...</span>}
              </div>

              {rubros.length === 0 && !cargandoRubros && (
                <div className="sin-rubros">
                  <p>No hay rubros disponibles en la base de datos.</p>
                </div>
              )}

              {parcelasSeleccionadasAdmin.length > 0 && rubros.length > 0 && (
                <div className="acciones-rubro">
                  <p><strong>{parcelasSeleccionadasAdmin.length}</strong> parcelas seleccionadas</p>
                  <div className="botones-accion">
                    <button 
                      onClick={asignarRubroParcelas} 
                      className="btn-asignar-rubro"
                      disabled={cambiandoRubro || !rubroSeleccionado}
                    >
                      {cambiandoRubro ? "Asignando..." : "Asignar Rubro"}
                    </button>
                    <button 
                      onClick={() => setParcelasSeleccionadasAdmin([])} 
                      className="btn-cancelar"
                    >
                      Limpiar Selección
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="info-modo">
            <p><strong>Modo actual:</strong> {
              modoAdmin === "ver" ? "Visualización" :
              modoAdmin === "deshabilitar" ? "Gestión de disponibilidad" :
              modoAdmin === "asignar_rubro" ? "Asignación de rubros" :
              "Información de artesanos"
            }</p>
          </div>
        </div>
      )}

      {/* Grid de parcelas */}
      <div className="parcelas-grid-dinamico">
        {/* Encabezados de columnas */}
        <div className="grid-coordenadas">
          {[...Array(totalColumnas)].map((_, index) => (
            <div key={index} className="coordenada-header">
              {index + 1}
            </div>
          ))}
        </div>

        {/* Grid de parcelas */}
        <div className="grid-parcelas">
          {[...Array(totalFilas)].map((_, filaIndex) => {
            const fila = filaIndex + 1;
            return (
              <div key={filaIndex} className="fila-container">
                <div className="fila-numero">{fila}</div>
                <div className="parcelas-fila">
                  {[...Array(totalColumnas)].map((_, columnaIndex) => {
                    const columna = columnaIndex + 1;
                    const parcela = getParcelaByCoords(fila, columna);
                    const estiloParcela = getParcelaStyle(parcela);

                    return (
                      <div
                        key={`${fila}-${columna}`}
                        className={getParcelaClass(parcela)}
                        onClick={() => handleParcelaClick(parcela)}
                        title={getParcelaTitle(parcela)}
                        style={{
                          cursor: getParcelaCursor(parcela),
                          ...estiloParcela
                        }}
                      >
                        <span className="parcela-coordenadas">
                          {fila},{columna}
                        </span>
                        {parcela?.ocupada && (
                          <span className="indicador-ocupada"></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección de confirmación para artesanos */}
      {esArtesano && parcelasSeleccionadas.length > 0 && (
        <div className="confirmar-seleccion">
          <button
            className={`btn-confirmar ${parcelaConfirmando ? "success" : ""}`}
            onClick={confirmarSeleccionParcela}
            disabled={confirmando}
          >
            {confirmando ? (
              <span>Confirmando...</span>
            ) : parcelaConfirmando ? (
              <span>Parcela Confirmada</span>
            ) : (
              <span>Confirmar Parcela Seleccionada</span>
            )}
          </button>

          {getParcelaSeleccionadaInfo() && (
            <div className="confirmar-info">
              <p>
                Parcela seleccionada:{" "}
                <span className="parcela-info">
                  Fila {getParcelaSeleccionadaInfo().fila}, Columna{" "}
                  {getParcelaSeleccionadaInfo().columna}
                </span>
              </p>
              {getParcelaSeleccionadaInfo().rubro_info && (
                <p>
                  Rubro:{" "}
                  <span className="parcela-info">
                    {getParcelaSeleccionadaInfo().rubro_info.tipo}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className={esAdmin ? "leyenda-admin" : "leyenda-minima"}>
        <div className="leyenda-item">
          <div className="leyenda-color disponible"></div>
          <span>Disponible</span>
        </div>
        <div className="leyenda-item">
          <div className="leyenda-color ocupada"></div>
          <span>{esAdmin ? "Ocupada por Artesano" : "Ocupada"}</span>
        </div>
        <div className="leyenda-item">
          <div className="leyenda-color deshabilitada"></div>
          <span>{esAdmin ? "No Disponible" : "No disponible"}</span>
        </div>
        {esAdmin && (
          <>
            <div className="leyenda-item">
              <div className="leyenda-color seleccionada-admin"></div>
              <span>Seleccionada para acción</span>
            </div>
            {/* Mostrar colores de rubros disponibles */}
            {rubros.length > 0 && (
              <div className="rubros-leyenda">
                <h4>Rubros Disponibles:</h4>
                {rubros.map((rubro) => (
                  <div key={rubro.rubro_id} className="leyenda-item">
                    <div 
                      className="leyenda-color" 
                      style={{ backgroundColor: getColorRubro(rubro) }}
                    ></div>
                    <span>{rubro.tipo}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {!esAdmin && (
          <div className="leyenda-item">
            <div className="leyenda-color seleccionada"></div>
            <span>Seleccionada</span>
          </div>
        )}
      </div>

      {/* Información del mapa */}
      <div className="mapa-info">
        <p>
          <strong>Dimensiones:</strong> {totalFilas} filas × {totalColumnas} columnas
        </p>
        <p>
          <strong>Total parcelas:</strong> {parcelas.length} cargadas
        </p>
        {esAdmin && (
          <>
            <p>
              <strong>Rol:</strong> {user?.rol_id === 2 ? "Administrador" : "Organizador"}
            </p>
            <p>
              <strong>Rubros cargados:</strong> {rubros.length}
            </p>
          </>
        )}
      </div>

      {/* Modal de información (SOLO ADMIN) */}
      {esAdmin && mostrarModal && infoParcela && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              Información de Parcela {infoParcela.fila}, {infoParcela.columna}
            </h3>

            <div className="info-parcela">
              <p>
                <strong>Estado:</strong>{" "}
                {infoParcela.habilitada ? "Habilitada" : "No habilitada"}
              </p>
              <p>
                <strong>Ocupada:</strong> {infoParcela.ocupada ? "Sí" : "No"}
              </p>

              {infoParcela.rubro_info && (
                <div className="info-rubro">
                  <p><strong>Rubro:</strong> {infoParcela.rubro_info.tipo}</p>
                  <div className="color-muestra" style={{ 
                    backgroundColor: infoParcela.rubro_info.color,
                    width: '20px', 
                    height: '20px', 
                    display: 'inline-block',
                    marginLeft: '10px',
                    border: '1px solid #ccc'
                  }}></div>
                </div>
              )}

              {infoParcela.ocupada && infoParcela.artesano_info && (
                <div className="info-artesano">
                  <h4>Información del Artesano:</h4>
                  <p><strong>Nombre:</strong> {infoParcela.artesano_info.nombre}</p>
                  <p><strong>DNI:</strong> {infoParcela.artesano_info.dni}</p>
                  <p><strong>Teléfono:</strong> {infoParcela.artesano_info.telefono}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-cerrar-modal"
                onClick={() => setMostrarModal(false)}
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

export default MapaGrid;