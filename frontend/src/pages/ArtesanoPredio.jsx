import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import MapaGrid from "../components/MapaGrid";
import "../styles/App.css";

const ArtesanoPredio = () => {
  const [parcelasSeleccionadas, setParcelasSeleccionadas] = useState([]);
  const [infoValidacion, setInfoValidacion] = useState(null);
  const [parcelasNecesarias, setParcelasNecesarias] = useState(1);
  const [dimensiones, setDimensiones] = useState({ largo: 0, ancho: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parcelasMapa, setParcelasMapa] = useState([]);
  const [procesandoPago, setProcesandoPago] = useState(false);

  const API_BASE_URL = "http://localhost:5000";

  const iniciarPago = async () => {
    console.log("🔍 DEBUG - Estado actual:");
    console.log(" - infoValidacion:", infoValidacion);
    console.log(" - parcelasSeleccionadas:", parcelasSeleccionadas.length);
    console.log(" - esSeleccionCorrecta:", esSeleccionCorrecta());
    console.log(
      " - puede_solicitar_parcelas:",
      infoValidacion?.puede_solicitar_parcelas
    );
    setProcesandoPago(true);
    try {
      // ✅ VERIFICAR ANTES DE PAGAR
      if (!infoValidacion?.puede_solicitar_parcelas) {
        alert(
          infoValidacion?.motivo ||
            "No puedes solicitar parcelas en este momento"
        );
        return;
      }

      if (parcelasSeleccionadas.length === 0) {
        alert("Debes seleccionar al menos una parcela antes de pagar");
        return;
      }

      if (!esSeleccionCorrecta()) {
        alert(`Debes seleccionar exactamente ${parcelasNecesarias} parcela(s)`);
        return;
      }

      console.log("🔄 Iniciando proceso de pago...");
      console.log("📦 Parcelas a enviar:", parcelasSeleccionadas);

      const res = await fetch(`${API_BASE_URL}/api/v1/pago/crear-preferencia`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parcelas_seleccionadas: parcelasSeleccionadas,
        }),
      });

      console.log("📡 Response status:", res.status);
      console.log("📡 Response ok:", res.ok);

      // OBTENER LA RESPUESTA COMPLETA SIN IMPORTAR EL STATUS
      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonError) {
        console.error("❌ Error parseando JSON:", jsonError);
        throw new Error("Respuesta inválida del servidor");
      }

      console.log("📡 Response data COMPLETA:", responseData);

      if (!res.ok) {
        console.error("❌ Error del backend:", responseData);
        if (
          responseData.error &&
          responseData.error.includes("Ya tenés un pago generado")
        ) {
          // Verificar si el pago es cancelable (estado pendiente)
          if (responseData.estado_actual === "Pendiente") {
            const cancelar = confirm(
              `Ya tienes un pago en estado: ${responseData.estado_actual}. ¿Quieres cancelarlo automáticamente y crear uno nuevo?`
            );

            if (cancelar) {
              const cancelado = await cancelarPagoExistente();
              if (cancelado) {
                // Reintentar el pago después de cancelar
                iniciarPago();
                return;
              }
            }
          } else {
            alert(
              `No puedes crear un nuevo pago porque tienes uno en estado: ${responseData.estado_actual}`
            );
          }
          return;
        }

        throw new Error(responseData.error || `Error ${res.status}`);
      }

      console.log("✅ Preferencia creada:", responseData);

      // Redirigir a MercadoPago
      if (responseData.preference_id) {
        console.log("🔑 Preference ID recibido:", responseData.preference_id);
        console.log("💰 Monto:", responseData.monto);

        try {
          // 1. Cargar SDK
          console.log("🔄 Cargando SDK de MercadoPago...");
          const MercadoPagoSDK = await inicializarMercadoPago();

          if (!MercadoPagoSDK) {
            throw new Error("SDK no se pudo cargar después de 10 segundos");
          }

          console.log("✅ SDK cargado correctamente");

          // 2. INGRESA TU PUBLIC KEY REAL AQUÍ (OBLIGATORIO)
          const publicKey = "TEST-TU-PUBLIC-KEY-REAL-AQUÍ"; // ⚠️ CAMBIAR ESTO

          if (!publicKey || publicKey.includes("TU-PUBLIC-KEY")) {
            throw new Error(
              "❌ Public Key no configurada. Usa la tuya de MercadoPago"
            );
          }

          console.log(
            "🔑 Public Key configurada:",
            publicKey.substring(0, 10) + "..."
          );

          // 3. Inicializar
          const mp = new MercadoPagoSDK(publicKey, {
            locale: "es-AR",
          });

          console.log(
            "🎯 Inicializando checkout con preference_id:",
            responseData.preference_id
          );

          // 4. Crear checkout con manejo de errores
          mp.checkout({
            preference: {
              id: responseData.preference_id,
            },
            render: {
              container: ".cho-container",
              label: "Pagar",
              type: "modal",
            },
            theme: {
              elementsColor: "#007bff",
              headerColor: "#007bff",
            },
          });

          console.log("✅ Checkout inicializado");

          // 5. Mostrar modal
          const container = document.querySelector(".cho-container");
          if (container) {
            container.style.display = "block";
            console.log("🖥️ Modal mostrado");
          }
        } catch (error) {
          console.error("❌ ERROR CRÍTICO en MercadoPago:", error);
          console.error("Stack trace:", error.stack);

          // Fallback automático
          console.log("🔄 Intentando fallback con init_point...");
          if (responseData.sandbox_init_point) {
            console.log(
              "🔗 Usando sandbox_init_point:",
              responseData.sandbox_init_point
            );
            window.open(
              responseData.sandbox_init_point,
              "_blank",
              "noopener,noreferrer"
            );
          } else if (responseData.init_point) {
            console.log("🔗 Usando init_point:", responseData.init_point);
            window.open(
              responseData.init_point,
              "_blank",
              "noopener,noreferrer"
            );
          } else {
            alert(
              `Error: ${error.message}\n\nNo hay enlace de respaldo. Revisa la consola.`
            );
          }
        }
      } else {
        console.error("❌ No hay preference_id en la respuesta:", responseData);
        alert(
          "El servidor no devolvió un ID de preferencia. Revisa el backend."
        );
      }
    } catch (err) {
      console.error("❌ Error en pago:", err);
      alert("Error iniciando pago: " + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  const cancelarPagoExistente = async () => {
    try {
      setProcesandoPago(true);
      // Verificar primero si podemos cancelar/reiniciar
      const resEstado = await fetch(`${API_BASE_URL}/api/v1/pago/estado`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (resEstado.ok) {
        const estadoPago = await resEstado.json();
        console.log("Estado actual del pago:", estadoPago);

        // Si el pago está rechazado o cancelado, usar el endpoint de reinicio
        if (estadoPago.estado_id === 3 || estadoPago.estado_id === 4) {
          const resReinicio = await fetch(
            `${API_BASE_URL}/api/v1/pago/reiniciar-pago`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );

          const resultadoReinicio = await resReinicio.json();

          if (resReinicio.ok) {
            alert(
              "✅ Pago anterior reiniciado exitosamente. Ahora puedes crear un nuevo pago."
            );
            console.log("Pago reiniciado:", resultadoReinicio);
            await cargarInfoValidacion();
            return true;
          } else {
            alert("❌ Error reiniciando pago: " + resultadoReinicio.error);
            return false;
          }
        }
        // Si el pago está pendiente, usar el endpoint de cancelación normal
        else if (estadoPago.estado_id === 1) {
          const resCancelar = await fetch(
            `${API_BASE_URL}/api/v1/pago/cancelar-pago-actual`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );

          const resultadoCancelar = await resCancelar.json();

          if (resCancelar.ok) {
            alert(
              "✅ Pago anterior cancelado exitosamente. Ahora puedes crear un nuevo pago."
            );
            console.log("Pago cancelado:", resultadoCancelar);
            await cargarInfoValidacion();
            return true;
          } else {
            alert("❌ Error cancelando pago: " + resultadoCancelar.error);
            return false;
          }
        } else {
          alert(
            `No se puede cancelar/reiniciar un pago en estado: ${estadoPago.estado}`
          );
          return false;
        }
      } else {
        alert("❌ No se pudo verificar el estado del pago");
        return false;
      }
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Error: " + err.message);
      return false;
    } finally {
      setProcesandoPago(false);
    }
  };

  const inicializarMercadoPago = async () => {
    return new Promise((resolve) => {
      // Si ya está cargado, lo usamos
      if (window.MercadoPago) {
        console.log("✅ SDK ya estaba cargado");
        resolve(window.MercadoPago);
        return;
      }

      console.log("⬇️ Descargando SDK desde https://sdk.mercadopago.com/js/v2");

      // Cargar el SDK
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        console.log("✅ SDK de MercadoPago cargado correctamente");
        if (window.MercadoPago) {
          resolve(window.MercadoPago);
        } else {
          reject(
            new Error("MercadoPago no está en window después de cargar script")
          );
        }
      };

      script.onerror = (error) => {
        console.error("❌ Error cargando SDK de MercadoPago:", error);
        reject(new Error("No se pudo cargar el SDK de MercadoPago"));
      };

      script.onabort = () => {
        console.error("❌ Carga del SDK abortada");
        reject(new Error("Carga del SDK abortada"));
      };

      // Timeout después de 10 segundos
      setTimeout(() => {
        if (!window.MercadoPago) {
          reject(new Error("Timeout cargando SDK de MercadoPago"));
        }
      }, 10000);

      document.body.appendChild(script);
      console.log("📝 Script agregado al DOM");
    });
  };

  const cargarInfoValidacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      console.log("Cargando información de validación para el mapa...");

      const responseSolicitud = await fetch(`${API_BASE_URL}/solicitudes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Respuesta solicitud:", responseSolicitud.status);

      if (!responseSolicitud.ok) {
        throw new Error(
          `Error ${responseSolicitud.status} al cargar solicitud`
        );
      }

      const dataSolicitud = await responseSolicitud.json();
      console.log("Datos de solicitud recibidos:", dataSolicitud);

      if (dataSolicitud.solicitud === null) {
        setError(
          dataSolicitud.msg || "No tienes una solicitud activa para este año."
        );
        setInfoValidacion({
          puede_solicitar_parcelas: false,
          motivo: "No tienes una solicitud activa",
          tiene_solicitud: false,
          pago_aprobado: false,
        });
        setLoading(false);
        return;
      }

      // Obtener estado del pago
      const resPago = await fetch(`${API_BASE_URL}/api/v1/pago/estado`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      let pagoEstado = null;
      let pagoPendiente = false;
      let pagoAprobado = false;
      let pagoCancelable = false;

      if (resPago.ok) {
        pagoEstado = await resPago.json(); // <-- AQUÍ guardamos los datos reales
        console.log("Estado del pago:", pagoEstado);
        pagoPendiente = pagoEstado.estado_id === 1; // Pendiente
        pagoAprobado = pagoEstado.estado_id === 2; // Aprobado
        pagoCancelable = pagoEstado.estado_id === 1; // Solo pendientes se pueden cancelar
      } else {
        console.warn("No se pudo obtener el estado del pago");
      }

      const solicitud = dataSolicitud.solicitud;
      const rubroInfo = await cargarInfoRubroActual(solicitud.rubro_id);
      const infoParcelas = await verificarParcelaAsignada();
      const estadoInfo = await verificarEstadoSolicitud(
        solicitud.estado_solicitud_id
      );

      const puedeSolicitar =
        estadoInfo.aprobada &&
        !infoParcelas.solicitudCompletada &&
        infoParcelas.totalAsignadas < solicitud.parcelas_necesarias;
      !pagoPendiente && // No puede solicitar si tiene pago pendiente
        !pagoAprobado; // No puede solicitar si ya tiene pago aprobado

      let motivo = "";
      if (!estadoInfo.aprobada) {
        motivo = `La solicitud está ${estadoInfo.nombre}`;
      } else if (pagoPendiente) {
        motivo =
          "Tienes un pago pendiente. Debes cancelarlo para crear uno nuevo.";
      } else if (pagoAprobado) {
        motivo = "Ya tienes un pago aprobado. No puedes crear uno nuevo.";
      } else if (infoParcelas.solicitudCompletada) {
        motivo = `Ya completaste las ${solicitud.parcelas_necesarias} parcelas necesarias`;
      } else if (infoParcelas.totalAsignadas >= solicitud.parcelas_necesarias) {
        motivo = `Ya tienes ${infoParcelas.totalAsignadas} de ${solicitud.parcelas_necesarias} parcelas asignadas`;
      } else {
        motivo = "Puedes seleccionar parcelas";
      }

      setInfoValidacion({
        puede_solicitar_parcelas: puedeSolicitar,
        motivo: motivo,
        tiene_solicitud: true,
        pago_pendiente: pagoPendiente,
        pago_aprobado: pagoAprobado,
        pago_cancelable: pagoCancelable,
        pago_estado: pagoEstado,
        solicitud_id: solicitud.solicitud_id,
        rubro_id: solicitud.rubro_id,
        rubro_nombre: rubroInfo?.tipo || "Sin nombre",
        color_rubro: rubroInfo?.color_rel?.codigo_hex || "#CCCCCC",
        estado_solicitud: estadoInfo.nombre,
        ya_tiene_parcela: infoParcelas.tieneParcela,
        solicitud_completada: infoParcelas.solicitudCompletada,
        parcelas_asignadas: infoParcelas.totalAsignadas,
        parcelas_necesarias: solicitud.parcelas_necesarias,
        costo_total: solicitud.costo_total,
        info_parcelas: infoParcelas.parcelas,
      });

      setDimensiones({
        largo: solicitud.dimensiones_largo || 0,
        ancho: solicitud.dimensiones_ancho || 0,
      });
      setParcelasNecesarias(solicitud.parcelas_necesarias || 1);

      await cargarParcelasMapa();
    } catch (error) {
      console.error("Error en cargarInfoValidacion:", error);
      setError(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarInfoRubroActual = async (rubroId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/v1/rubros`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const rubros = await response.json();
        const rubroEncontrado = rubros.find(
          (rubro) => rubro.rubro_id === rubroId
        );

        if (rubroEncontrado) {
          console.log("Rubro encontrado:", rubroEncontrado);
          return rubroEncontrado;
        } else {
          console.warn("Rubro no encontrado, usando primer rubro disponible");
          return rubros.length > 0 ? rubros[0] : null;
        }
      }

      return null;
    } catch (error) {
      console.error("Error cargando rubro actual:", error);
      return null;
    }
  };

  const verificarEstadoSolicitud = async (estadoSolicitudId) => {
    const estados = {
      1: { nombre: "Pendiente", aprobada: false },
      2: { nombre: "Aprobada", aprobada: true },
      3: { nombre: "Rechazada", aprobada: false },
      4: { nombre: "Corrección Requerida", aprobada: false },
      5: { nombre: "Parcialmente Asignada", aprobada: true },
    };

    return (
      estados[estadoSolicitudId] || { nombre: "Desconocido", aprobada: false }
    );
  };

  const verificarParcelaAsignada = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/artesano/mi-parcela`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log("Información de parcelas:", data);

        return {
          tieneParcela: data.total_parcelas_asignadas > 0,
          totalAsignadas: data.total_parcelas_asignadas,
          necesarias: data.parcelas_necesarias,
          solicitudCompletada: data.solicitud_completada,
          parcelas: data.parcelas || [],
        };
      } else if (response.status === 404) {
        console.log("No tiene parcelas asignadas");
        return {
          tieneParcela: false,
          totalAsignadas: 0,
          necesarias: 0,
          solicitudCompletada: false,
          parcelas: [],
        };
      } else {
        console.error("Error en mi-parcela:", response.status);
        return {
          tieneParcela: false,
          totalAsignadas: 0,
          necesarias: 0,
          solicitudCompletada: false,
          parcelas: [],
        };
      }
    } catch (error) {
      console.error("Error verificando parcelas:", error);
      return {
        tieneParcela: false,
        totalAsignadas: 0,
        necesarias: 0,
        solicitudCompletada: false,
        parcelas: [],
      };
    }
  };
  const cargarParcelasMapa = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/v1/mapa/parcelas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setParcelasMapa(data.parcelas || []);
        console.log("Parcelas del mapa cargadas:", data.parcelas?.length);
      } else {
        throw new Error(`Error ${response.status} al cargar parcelas`);
      }
    } catch (error) {
      console.error("Error cargando parcelas del mapa:", error);
      throw error;
    }
  };

  // Manejar selección de parcela
  const handleParcelaSeleccionada = (parcela) => {
    if (!parcela || !parcela.parcela_id) return;

    if (!esParcelaSeleccionable(parcela)) {
      mostrarMotivoBloqueo(parcela);
      return;
    }

    const yaSeleccionada = parcelasSeleccionadas.some(
      (p) => p.parcela_id === parcela.parcela_id
    );

    if (yaSeleccionada) {
      setParcelasSeleccionadas((prev) =>
        prev.filter((p) => p.parcela_id !== parcela.parcela_id)
      );
    } else {
      if (parcelasSeleccionadas.length < parcelasNecesarias) {
        setParcelasSeleccionadas((prev) => [...prev, parcela]);
      } else {
        alert(
          `Solo puedes seleccionar ${parcelasNecesarias} parcela(s) para tu puesto`
        );
      }
    }
  };

  const esParcelaSeleccionable = (parcela) => {
    if (!infoValidacion) return false;
    if (!infoValidacion.puede_solicitar_parcelas) return false;
    if (infoValidacion.ya_tiene_parcela) return false;
    if (parcela.rubro_id !== infoValidacion.rubro_id) return false;
    if (parcela.ocupada) return false;
    if (!parcela.habilitada) return false;

    return true;
  };

  const mostrarMotivoBloqueo = (parcela) => {
    if (!infoValidacion) {
      alert("No hay información de validación disponible");
      return;
    }

    if (!infoValidacion.puede_solicitar_parcelas) {
      alert(infoValidacion.motivo);
      return;
    }

    if (infoValidacion.ya_tiene_parcela) {
      alert("Ya tienes una parcela asignada");
      return;
    }

    if (parcela.rubro_id !== infoValidacion.rubro_id) {
      alert(
        `Esta parcela es de otro rubro. Tu rubro es: ${infoValidacion.rubro_nombre}`
      );
      return;
    }

    if (parcela.ocupada) {
      alert("Esta parcela ya está ocupada");
      return;
    }

    if (!parcela.habilitada) {
      alert("Esta parcela no está habilitada");
      return;
    }
  };

  const calcularCostoTotal = () => {
    if (!infoValidacion || parcelasSeleccionadas.length === 0) return 0;

    if (infoValidacion.costo_total && infoValidacion.parcelas_necesarias) {
      const costoPorParcela =
        infoValidacion.costo_total / infoValidacion.parcelas_necesarias;
      return costoPorParcela * parcelasSeleccionadas.length;
    }

    return 100 * parcelasSeleccionadas.length;
  };

  const esSeleccionCorrecta = () => {
    return parcelasSeleccionadas.length === parcelasNecesarias;
  };

  const handleConfirmarParcelas = async () => {
    if (parcelasSeleccionadas.length === 0) {
      alert("Debes seleccionar al menos una parcela");
      return;
    }

    if (!esSeleccionCorrecta()) {
      alert(
        `Debes seleccionar exactamente ${parcelasNecesarias} parcela(s) para tu puesto`
      );
      return;
    }

    try {
      setLoading(true);

      const resultados = [];

      for (const parcela of parcelasSeleccionadas) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/parcelas/${parcela.parcela_id}/seleccionar`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            resultados.push({
              parcela_id: parcela.parcela_id,
              success: true,
              message: data.message,
            });
            console.log(
              `Parcela ${parcela.parcela_id} seleccionada correctamente`
            );
          } else {
            const errorData = await response.json();
            resultados.push({
              parcela_id: parcela.parcela_id,
              success: false,
              message: errorData.error,
            });
            console.error(
              `Error en parcela ${parcela.parcela_id}:`,
              errorData.error
            );
          }
        } catch (error) {
          resultados.push({
            parcela_id: parcela.parcela_id,
            success: false,
            message: `Error de conexión: ${error.message}`,
          });
        }
      }

      const exitosas = resultados.filter((r) => r.success).length;
      const fallidas = resultados.filter((r) => !r.success);

      if (exitosas > 0) {
        alert(`¡${exitosas} parcela(s) asignadas exitosamente!`);

        if (fallidas.length > 0) {
          console.warn("Parcelas con errores:", fallidas);
        }

        setParcelasSeleccionadas([]);
        await cargarInfoValidacion();
      } else {
        alert(
          "No se pudo asignar ninguna parcela. Verifica los errores en la consola."
        );
      }
    } catch (error) {
      console.error("Error confirmando parcelas:", error);
      alert(`Error al confirmar parcelas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecargar = async () => {
    await cargarInfoValidacion();
  };

  useEffect(() => {
    cargarInfoValidacion();
  }, []);

  return (
    <>
      <Navbar />

      <main className="artesano-predio-page">
        <div className="predio-container">
          {/* Grid a la izquierda */}
          <div className="grid-section">
            <MapaGrid
              onParcelaSeleccionada={handleParcelaSeleccionada}
              parcelasSeleccionadas={parcelasSeleccionadas}
              infoValidacion={infoValidacion}
              parcelasMapa={parcelasMapa}
            />
          </div>

          {/* Información a la derecha */}
          <div className="info-section">
            <div className="info-card">
              <div className="info-header">
                <h3>Selección de Parcelas</h3>
                <button
                  className="btn-reload"
                  onClick={handleRecargar}
                  disabled={loading}
                  title="Recargar información"
                >
                  ↻
                </button>
              </div>

              {loading ? (
                <div className="cargando-info">
                  <div className="spinner"></div>
                  <p>Cargando información...</p>
                </div>
              ) : error ? (
                <div className="error-info">
                  <div className="error-icon"></div>
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                  <button className="btn-reintentar" onClick={handleRecargar}>
                    Reintentar
                  </button>
                </div>
              ) : infoValidacion ? (
                <>
                  {infoValidacion.puede_solicitar_parcelas && (
                    <>
                      <div className="info-item">
                        <label>Tu rubro:</label>
                        <span className="rubro-nombre">
                          {infoValidacion.rubro_nombre}
                          <span
                            className="color-muestra"
                            style={{
                              backgroundColor: infoValidacion.color_rubro,
                            }}
                            title={infoValidacion.color_rubro}
                          ></span>
                        </span>
                      </div>

                      <div className="info-item">
                        <label>Dimensiones del puesto:</label>
                        <span className="dimensiones">
                          {dimensiones.largo}m × {dimensiones.ancho}m
                        </span>
                      </div>

                      <div className="info-item">
                        <label>Parcelas necesarias:</label>
                        <span className="parcelas-necesarias">
                          {parcelasNecesarias} parcela(s)
                        </span>
                      </div>

                      <div className="info-item">
                        <label>Costo total de tu puesto:</label>
                        <span className="costo-total-puesto">
                          ${infoValidacion.costo_total || 0}
                        </span>
                      </div>

                      <div className="info-item">
                        <label>Parcelas seleccionadas:</label>
                        <span
                          className={`seleccion-actual ${
                            esSeleccionCorrecta() ? "correcto" : "advertencia"
                          }`}
                        >
                          {parcelasSeleccionadas.length} de {parcelasNecesarias}
                          {!esSeleccionCorrecta() && (
                            <span className="icono-advertencia"> </span>
                          )}
                          {esSeleccionCorrecta() && (
                            <span className="icono-correcto"> </span>
                          )}
                        </span>
                      </div>

                      <div className="info-item total">
                        <label>Costo a pagar ahora:</label>
                        <span className="costo-actual">
                          ${calcularCostoTotal()}
                        </span>
                      </div>

                      {parcelasSeleccionadas.length > 0 && (
                        <div className="parcelas-lista">
                          <label>Parcelas seleccionadas:</label>
                          <div className="lista-parcelas">
                            {parcelasSeleccionadas.map((parcela) => (
                              <div
                                key={parcela.parcela_id}
                                className="parcela-item"
                              >
                                Fila {parcela.fila}, Columna {parcela.columna}
                                {parcela.rubro_info && (
                                  <span className="rubro-parcela">
                                    {" "}
                                    - {parcela.rubro_info.tipo}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="instrucciones">
                        <h4>Instrucciones:</h4>
                        <ul>
                          <li>
                            Solo puedes seleccionar parcelas de tu rubro:{" "}
                            <strong>{infoValidacion.rubro_nombre}</strong>
                          </li>
                          <li>
                            Las parcelas deben estar{" "}
                            <strong>disponibles</strong> (no ocupadas)
                          </li>
                          <li>
                            Selecciona exactamente{" "}
                            <strong>{parcelasNecesarias} parcela(s)</strong>
                          </li>
                          <li>
                            Clickee en una parcela para
                            seleccionarla/deseleccionarla
                          </li>
                        </ul>
                      </div>

                      <button
                        className="btn-pagar"
                        onClick={iniciarPago}
                        disabled={
                          !infoValidacion?.puede_solicitar_parcelas ||
                          parcelasSeleccionadas.length === 0 ||
                          !esSeleccionCorrecta() ||
                          procesandoPago
                        }
                      >
                        {procesandoPago
                          ? "Procesando..."
                          : `Pagar reserva - $${calcularCostoTotal()}`}
                      </button>

                      {/* BOTÓN PARA CANCELAR PAGO EXISTENTE - Solo se muestra si hay pago pendiente */}
                      {infoValidacion?.pago_estado && (
                        <div
                          className={`pago-estado-alerta ${
                            infoValidacion.pago_estado.estado_id === 1
                              ? "pendiente"
                              : infoValidacion.pago_estado.estado_id === 2
                              ? "aprobado"
                              : infoValidacion.pago_estado.estado_id === 3
                              ? "rechazado"
                              : infoValidacion.pago_estado.estado_id === 4
                              ? "cancelado"
                              : "desconocido"
                          }`}
                        >
                          <div className="alerta-contenido">
                            <h4>
                              {infoValidacion.pago_estado.estado_id === 1 &&
                                " Pago Pendiente"}
                              {infoValidacion.pago_estado.estado_id === 2 &&
                                " Pago Aprobado"}
                              {infoValidacion.pago_estado.estado_id === 3 &&
                                " Pago Rechazado"}
                              {infoValidacion.pago_estado.estado_id === 4 &&
                                " Pago Cancelado"}
                            </h4>
                            <p>
                              Estado actual:{" "}
                              <strong>
                                {infoValidacion.pago_estado.estado}
                              </strong>
                            </p>

                            {(infoValidacion.pago_estado.estado_id === 1 ||
                              infoValidacion.pago_estado.estado_id === 3 ||
                              infoValidacion.pago_estado.estado_id === 4) && (
                              <button
                                className="btn-cancelar-pago"
                                onClick={cancelarPagoExistente}
                                disabled={procesandoPago}
                              >
                                {procesandoPago
                                  ? "Procesando..."
                                  : infoValidacion.pago_estado.estado_id === 1
                                  ? "Cancelar Pago Anterior"
                                  : "Reiniciar Para Nuevo Pago"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {infoValidacion?.pago_aprobado && (
                        <div className="pago-aprobado-alerta">
                          <div className="alerta-contenido">
                            <h4>✅ Pago aprobado</h4>
                            <p>
                              Tu pago ha sido aprobado. No puedes crear un nuevo
                              pago.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="acciones">
                        <button
                          className="btn-confirmar"
                          onClick={handleConfirmarParcelas}
                          disabled={
                            !(
                              infoValidacion?.pago_pendiente ||
                              infoValidacion?.pago_aprobado
                            )
                          }
                        >
                          {loading ? (
                            <>
                              <div className="spinner-btn"></div>
                              Procesando...
                            </>
                          ) : (
                            `Confirmar ${
                              parcelasSeleccionadas.length
                            } Parcela(s) - $${calcularCostoTotal()}`
                          )}
                        </button>

                        {!esSeleccionCorrecta() && (
                          <div className="mensaje-advertencia">
                            Selecciona {parcelasNecesarias} parcela(s) para
                            continuar
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {infoValidacion.ya_tiene_parcela && (
                    <div className="ya-tiene-parcela">
                      <p>
                        <strong>Ya tenes parcelas asignadas</strong>
                      </p>
                      <p>
                        No podes seleccionar nuevas parcelas porque ya tenes
                        asignadas.
                      </p>
                    </div>
                  )}

                  {!infoValidacion.puede_solicitar_parcelas &&
                    !infoValidacion.ya_tiene_parcela && (
                      <div className="no-puede-solicitar">
                        <p>
                          <strong>
                            No podes solicitar parcelas en este momento
                          </strong>
                        </p>
                        <p>{infoValidacion.motivo}</p>
                      </div>
                    )}
                </>
              ) : (
                <div className="sin-info">
                  <p>No se pudo cargar la información de validación</p>
                  <button className="btn-reintentar" onClick={handleRecargar}>
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ArtesanoPredio;
