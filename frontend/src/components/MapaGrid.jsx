import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const MapaGrid = ({ 
  onParcelaSeleccionada, 
  parcelasSeleccionadas = [], 
  infoValidacion,
  parcelasMapa = []
}) => {
  const { user } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [mapaInfo, setMapaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [parcelasSeleccionadasAdmin, setParcelasSeleccionadasAdmin] = useState([]);
  const [modoAdmin, setModoAdmin] = useState("ver");
  const [infoParcela, setInfoParcela] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState("");
  const [cambiandoRubro, setCambiandoRubro] = useState(false);
  const [cargandoRubros, setCargandoRubros] = useState(false);

  const esAdmin = user?.rol_id === 2 || user?.rol_id === 3;
  const esArtesano = user?.rol_id === 1;

  const API_BASE_URL = "http://localhost:5000";
  const endpointParcelas = esAdmin
    ? `${API_BASE_URL}/api/v1/admin/parcelas`
    : `${API_BASE_URL}/api/v1/mapa/parcelas`;

  // Función para calcular dimensiones del mapa
  const calcularDimensionesMapa = (parcelasArray) => {
    if (!parcelasArray || parcelasArray.length === 0) {
      return { totalFilas: 0, totalColumnas: 0 };
    }
    
    const maxFila = Math.max(...parcelasArray.map(p => p.fila));
    const maxColumna = Math.max(...parcelasArray.map(p => p.columna));
    
    return {
      totalFilas: maxFila,
      totalColumnas: maxColumna
    };
  };

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

  const esParcelaSeleccionable = (parcela) => {
    if (!parcela || !parcela.parcela_id) return false;
    if (esAdmin) return true; 
    if (!infoValidacion) return false;

    return (
      infoValidacion.puede_solicitar_parcelas &&
      !infoValidacion.solicitud_completada &&
      parcela.rubro_id === infoValidacion.rubro_id &&
      !parcela.ocupada &&
      parcela.habilitada
    );
  };

  const getMotivoBloqueo = (parcela) => {
    if (esAdmin) return "";
    
    if (!infoValidacion) return "Sin información de validación";
    if (!infoValidacion.puede_solicitar_parcelas) return infoValidacion.motivo;
    if (infoValidacion.ya_tiene_parcela) return "Ya tienes parcela asignada";
    if (parcela.rubro_id !== infoValidacion.rubro_id) return `Rubro diferente (${infoValidacion.rubro_nombre})`;
    if (parcela.ocupada) return "Parcela ocupada";
    if (!parcela.habilitada) return "Parcela no habilitada";
    return "Disponible para selección";
  };

  const inicializarConParcelasPadre = () => {
    if (parcelasMapa && parcelasMapa.length > 0) {
      console.log("Inicializando con parcelas del padre:", parcelasMapa.length);
      setParcelas(parcelasMapa);
      const dimensiones = calcularDimensionesMapa(parcelasMapa);
      setMapaInfo({
        mapa_id: 1,
        cant_total_filas: dimensiones.totalFilas,
        cant_total_columnas: dimensiones.totalColumnas
      });
      return true;
    }
    return false;
  };

  const cargarParcelas = async () => {
    // Si ya tenemos parcelas del padre, no cargar del backend
    if (parcelasMapa && parcelasMapa.length > 0) {
      console.log("✅ Ya tenemos parcelas del padre, omitiendo carga del backend");
      return;
    }

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
          setError("No tenes permisos para acceder al mapa");
        } else {
          setError(`Error ${response.status}: No se pudo cargar el mapa`);
        }
        return;
      }

      const data = await response.json();
      console.log("Datos recibidos del backend:", data);

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

  const getParcelaByCoords = (fila, columna) => {
    return parcelas.find((p) => p.fila === fila && p.columna === columna);
  };

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
      
      if (infoValidacion && parcela.rubro_id === infoValidacion.rubro_id && !esParcelaSeleccionable(parcela)) {
        return "parcela-celda mismo-rubro-bloqueado";
      }
    }

    if (!parcela.habilitada) return "parcela-celda deshabilitada";
    if (parcela.ocupada) return "parcela-celda ocupada";
    return "parcela-celda disponible";
  };

  const getParcelaStyle = (parcela) => {
    if (!parcela || !parcela.rubro_info) return {};

    if (!parcela.habilitada) {
      return { backgroundColor: "#6c757d" };
    }

    if (parcela.ocupada) {
      return { 
        backgroundColor: parcela.rubro_info.color,
        filter: "brightness(0.7)"
      };
    }

    if (esArtesano && infoValidacion && parcela.rubro_id === infoValidacion.rubro_id) {
      return { 
        backgroundColor: parcela.rubro_info.color,
        border: esParcelaSeleccionable(parcela) ? "3px solid #4CAF50" : "2px dashed #4CAF50"
      };
    }

    return { backgroundColor: parcela.rubro_info.color };
  };

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
      if (!esParcelaSeleccionable(parcela)) {
        alert(getMotivoBloqueo(parcela));
        return;
      }
      
      if (onParcelaSeleccionada) {
        onParcelaSeleccionada(parcela);
      }
    }
  };

  const getParcelaTitle = (parcela) => {
    if (!parcela) return "Parcela no cargada";

    let title = `Fila ${parcela.fila}, Columna ${parcela.columna}`;

    if (parcela.rubro_info) {
      title += ` - ${parcela.rubro_info.tipo}`;
    }

    if (esArtesano && infoValidacion) {
      if (parcela.rubro_id === infoValidacion.rubro_id) {
        title += " - TU RUBRO";
      }
      title += ` - ${getMotivoBloqueo(parcela)}`;
    } else {
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
    }

    return title;
  };

  const getParcelaCursor = (parcela) => {
    if (esAdmin) {
      if (modoAdmin === "deshabilitar" || modoAdmin === "asignar_rubro") return "pointer";
      if (modoAdmin === "info" && !parcela.ocupada) return "not-allowed";
      return "pointer";
    } else {
      return esParcelaSeleccionable(parcela) ? "pointer" : "not-allowed";
    }
  };

  const toggleSeleccionParcelaAdmin = (parcela) => {
    setParcelasSeleccionadasAdmin((prev) =>
      prev.includes(parcela.parcela_id)
        ? prev.filter((id) => id !== parcela.parcela_id)
        : [...prev, parcela.parcela_id]
    );
  };

  const cargarRubros = async () => {
    try {
      setCargandoRubros(true);
      const headers = getHeaders();
      if (!headers) {
        setCargandoRubros(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/rubros`, {
        method: "GET",
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
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
        // Si estamos usando parcelas del padre, recargar desde el padre
        if (parcelasMapa && parcelasMapa.length > 0) {
          console.log("");
          // Forzar recarga llamando a cargarParcelas que detectará parcelasMapa
          await cargarParcelas();
        } else {
          await cargarParcelas();
        }
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
        // Si estamos usando parcelas del padre, recargar desde el padre
        if (parcelasMapa && parcelasMapa.length > 0) {
          console.log("Recargando parcelas desde el componente padre...");
          // Forzar recarga llamando a cargarParcelas que detectará parcelasMapa
          await cargarParcelas();
        } else {
          await cargarParcelas();
        }
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
      
      // Si estamos usando parcelas del padre, recargar desde el padre
      if (parcelasMapa && parcelasMapa.length > 0) {
        console.log("🔄 Recargando parcelas desde el componente padre...");
        await cargarParcelas();
      } else {
        await cargarParcelas();
      }
      
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

  const getColorRubro = (rubro) => {
    if (!rubro) return "#CCCCCC";
    return rubro.color_rel?.codigo_hex || "#CCCCCC";
  };

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

  // Efecto principal - inicialización
  useEffect(() => {
    if (!verificarAutenticacion()) {
      return;
    }

    console.log("Inicializando MapaGrid...");
    console.log("parcelasMapa recibidas:", parcelasMapa?.length || 0);

    // Siempre inicializar con parcelas del padre si están disponibles
    const inicializadoConPadre = inicializarConParcelasPadre();
    
    // Solo cargar del backend si NO tenemos parcelas del padre
    if (!inicializadoConPadre) {
      console.log("No hay parcelas del padre, cargando desde backend...");
      cargarParcelas();
    } else {
      console.log("apa inicializado con parcelas del componente padre");
    }

    // Cargar rubros solo si es admin
    if (esAdmin) {
      cargarRubros();
    }
  }, []); // Solo se ejecuta una vez al montar

  // Efecto para actualizar cuando cambian las parcelas del padre
  useEffect(() => {
    if (parcelasMapa && parcelasMapa.length > 0) {
      console.log("Actualizando parcelas desde el padre:", parcelasMapa.length);
      setParcelas(parcelasMapa);
      const dimensiones = calcularDimensionesMapa(parcelasMapa);
      setMapaInfo({
        mapa_id: 1,
        cant_total_filas: dimensiones.totalFilas,
        cant_total_columnas: dimensiones.totalColumnas
      });
    }
  }, [parcelasMapa]);

  // Calcular dimensiones para el render
  const dimensiones = mapaInfo ? {
    totalFilas: mapaInfo.cant_total_filas,
    totalColumnas: mapaInfo.cant_total_columnas
  } : calcularDimensionesMapa(parcelas);

  const { totalFilas, totalColumnas } = dimensiones;

  if (loading) {
    return (
      <div className="mapa-grid-simple">
        <div className="mapa-header">
          <h2>{esAdmin ? "Panel de Administración" : "Selecciona tu parcela"}</h2>
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
          <button className="btn-actualizar" onClick={cargarParcelas}>↻</button>
        </div>
        <div className="error-mapa">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={cargarParcelas}>Reintentar</button>
          </div>
        </div>
      </div>
    );
  }

  if (!mapaInfo && parcelas.length === 0) {
    return (
      <div className="mapa-grid-simple">
        <div className="mapa-header">
          <h2>{esAdmin ? "Panel de Administración" : "Selecciona tu parcela"}</h2>
          <button className="btn-actualizar" onClick={cargarParcelas}>↻</button>
        </div>
        <div className="error-mapa">
          No se encontró información del mapa.
          <button onClick={cargarParcelas}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mapa-grid-simple ${esAdmin ? "modo-admin" : ""}`}>
      {/* Header del mapa */}
      <div className="mapa-header">
        <h2>
          {esAdmin ? "Panel de Administración - Mapa" : "Selecciona tu parcela"}
          ({totalFilas}x{totalColumnas})
          {parcelasMapa && parcelasMapa.length > 0 && " [Desde componente padre]"}
        </h2>
        <button
          className="btn-actualizar"
          onClick={cargarParcelas}
          disabled={loading}
        >
          {loading ? "↻" : "↻"}
        </button>
      </div>

      {/* Información para artesanos */}
      {esArtesano && infoValidacion && (
        <div className="info-validacion-artesano">
          <div className={`estado-validacion ${infoValidacion.puede_solicitar_parcelas ? 'activo' : 'inactivo'}`}>
            <strong></strong> {infoValidacion.puede_solicitar_parcelas ? 
              `Podes seleccionar parcelas de ${infoValidacion.rubro_nombre}` : 
              ` ${infoValidacion.motivo}`}
          </div>
          {infoValidacion.ya_tiene_parcela && (
            <div className="ya-tiene-parcela-info">
              Ya tenes parcelas asigandas
            </div>
          )}
        </div>
      )}

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
              Vista
            </button>
            <button
              className={modoAdmin === "deshabilitar" ? "active" : ""}
              onClick={() => setModoAdmin("deshabilitar")}
            >
              Deshabilitar/Habilitar parcelas
            </button>
            <button
              className={modoAdmin === "asignar_rubro" ? "active" : ""}
              onClick={() => setModoAdmin("asignar_rubro")}
            >
              Asignar Rubro a parcelas
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
            {parcelasMapa && parcelasMapa.length > 0 && (
              <p><strong>Fuente:</strong> Componente padre ({parcelasMapa.length} parcelas)</p>
            )}
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

      {/* Leyenda */}
      <div className={esAdmin ? "leyenda-admin" : "leyenda-minima"}>
        
        {/* Mostrar colores de rubros disponibles para admin */}
        {esAdmin && rubros.length > 0 && (
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
      </div>

      {/* Información del mapa */}
      <div className="mapa-info">
        <p>
          <strong>Dimensiones:</strong> {totalFilas} filas × {totalColumnas} columnas
        </p>
        <p>
          <strong>Total parcelas:</strong> {parcelas.length} cargadas
          {parcelasMapa && parcelasMapa.length > 0 && ""}
        </p>
        {esArtesano && infoValidacion && (
          <p>
            <strong>Tu rubro:</strong> {infoValidacion.rubro_nombre}
          </p>
        )}
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