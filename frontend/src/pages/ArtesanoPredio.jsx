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
  const [pagoEstado, setPagoEstado] = useState(null); // Nuevo estado para guardar info del pago

  const API_BASE_URL = "http://localhost:5000";

  // ================ FUNCIONES NUEVAS/MODIFICADAS ================
  
  // 1. Función para descargar el comprobante PDF
  const descargarComprobante = async (pagoId) => {
    if (!pagoId) {
      alert("No hay información de pago para descargar");
      return;
    }

    try {
      console.log(`📥 Descargando comprobante para pago ID: ${pagoId}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/pago/descargar-comprobante/${pagoId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Obtener nombre del archivo del header o crear uno
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `comprobante_pago_${pagoId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar URL
      window.URL.revokeObjectURL(url);
      
      console.log("✅ Comprobante descargado exitosamente");
      
    } catch (error) {
      console.error("❌ Error descargando comprobante:", error);
      alert(`Error al descargar comprobante: ${error.message}`);
    }
  };

  // 2. Función para verificar si se puede descargar comprobante
  const puedeDescargarComprobante = () => {
    return pagoEstado && 
          pagoEstado.estado_pago_id === 2 && // Aprobado
          pagoEstado.pago_id;
  };

  // 3. Función para previsualizar PDF (opcional)
  const previsualizarComprobante = async (pagoId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/pago/descargar-comprobante/${pagoId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Abrir en nueva pestaña
      window.open(url, '_blank');
      
    } catch (error) {
      console.error("❌ Error previsualizando:", error);
      alert("No se pudo previsualizar el comprobante");
    }
  };
  // 1. FUNCIÓN SIMPLIFICADA PARA INICIAR PAGO
  const iniciarPago = async () => {
    console.log("Iniciando proceso de pago...");
    
    if (!infoValidacion?.puede_solicitar_parcelas) {
      alert(infoValidacion?.motivo || "No puedes solicitar parcelas en este momento");
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

    setProcesandoPago(true);
    
    try {
      const parcelasIds = parcelasSeleccionadas.map(p => p.parcela_id);
      console.log("Enviando parcelas:", parcelasIds);

      const res = await fetch(`${API_BASE_URL}/api/v1/pago/crear-preferencia`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parcelas_seleccionadas: parcelasIds,
        }),
      });

      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonError) {
        throw new Error("Respuesta inválida del servidor");
      }

      if (!res.ok) {
        throw new Error(responseData.error || `Error ${res.status}`);
      }

      console.log("Preferencia creada:", responseData);

      let redirectUrl = responseData.init_point;
      
      console.log("URL recibida del backend:", redirectUrl);
      console.log("Flag sandbox:", responseData.sandbox);
      
      // PASO 1: Si el backend dice que es sandbox PERO la URL NO es sandbox
      if (responseData.sandbox && redirectUrl && !redirectUrl.includes('sandbox.')) {
        console.log("Convirtiendo URL producción → sandbox");
        
        // Convertir SOLO si NO es ya sandbox
        if (redirectUrl.includes('www.mercadopago.com.ar')) {
          redirectUrl = redirectUrl.replace('www.mercadopago.com.ar', 'sandbox.mercadopago.com.ar');
        } else if (redirectUrl.includes('mercadopago.com.ar')) {
          redirectUrl = redirectUrl.replace('mercadopago.com.ar', 'sandbox.mercadopago.com.ar');
        }
      }
      
      // PASO 2: Si por error ya tenía "sandbox.sandbox", corregir
      if (redirectUrl && redirectUrl.includes('sandbox.sandbox')) {
        console.log("Corrigiendo doble sandbox");
        redirectUrl = redirectUrl.replace('sandbox.sandbox', 'sandbox');
      }
      
      // PASO 3: Si no hay URL pero tenemos preference_id, construirla
      if (!redirectUrl && responseData.preference_id) {
        console.log("Construyendo URL desde preference_id");
        redirectUrl = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=${responseData.preference_id}`;
      }
      
      console.log("URL final para redirección:", redirectUrl);
      
      if (!redirectUrl || !redirectUrl.startsWith('http')) {
        throw new Error("URL de pago inválida recibida: " + redirectUrl);
      }
      
      // ABRIR MERCADO PAGO SANDBOX
      console.log("Redirigiendo a MercadoPago Sandbox...");
      
      // Abrir en nueva pestaña con configuración segura
      const mpWindow = window.open(
        redirectUrl, 
        '_blank',
        'noopener,noreferrer,width=800,height=600'
      );
      
      if (!mpWindow) {
        // Si el navegador bloqueó la ventana emergente
        const shouldCopy = confirm(
          "El navegador bloqueó la ventana emergente.\n\n" +
          "¿Quieres copiar la URL de MercadoPago para abrirla manualmente?\n\n" +
          "URL: " + redirectUrl
        );
        
        if (shouldCopy) {
          navigator.clipboard.writeText(redirectUrl)
            .then(() => alert("URL copiada al portapapeles. Pégalo en una nueva pestaña."))
            .catch(() => {
              // Fallback para navegadores antiguos
              const textarea = document.createElement('textarea');
              textarea.value = redirectUrl;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              alert("URL copiada. Pégalo en una nueva pestaña.");
            });
        }
      }
      
    } catch (err) {
      console.error("Error en pago:", err);
      alert("Error iniciando pago: " + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  // 2. NUEVA FUNCIÓN: SIMULAR PAGO (para desarrollo sin webhook)
  const simularPago = async (preferenceId) => {
    if (!preferenceId) {
      alert("No hay preference_id para simular");
      return;
    }

    const estado = prompt("¿Qué estado quieres simular?\n(approved, pending, rejected, cancelled)", "approved");
    
    if (!estado) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pago/simular-webhook/${preferenceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ estado: estado })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Pago simulado como: ${estado}\n${result.message}`);
        // Recargar información
        await cargarInfoValidacion();
      } else {
        throw new Error(result.error || "Error simulando pago");
      }
    } catch (error) {
      console.error("Error simulando pago:", error);
      alert(`Error: ${error.message}`);
    }
  };


  // 6. FUNCIÓN MODIFICADA: CARGAR INFORMACIÓN DE VALIDACIÓN (con estado de pago)
  const cargarInfoValidacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      console.log("Cargando información de validación para el mapa...");

      // Cargar solicitud
      const responseSolicitud = await fetch(`${API_BASE_URL}/solicitudes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!responseSolicitud.ok) {
        throw new Error(`Error ${responseSolicitud.status} al cargar solicitud`);
      }

      const dataSolicitud = await responseSolicitud.json();
      console.log("Datos de solicitud recibidos:", dataSolicitud);

      if (dataSolicitud.solicitud === null) {
        setError(dataSolicitud.msg || "No tienes una solicitud activa para este año.");
        setInfoValidacion({
          puede_solicitar_parcelas: false,
          motivo: "No tienes una solicitud activa",
          tiene_solicitud: false,
          pago_aprobado: false,
        });
        setLoading(false);
        return;
      }

      // Obtener estado del pago - AÑADE manejo de estado "sin_pago"
      const resPago = await fetch(`${API_BASE_URL}/api/v1/pago/estado`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      let pagoEstado = null;
      let pagoPendiente = false;
      let pagoAprobado = false;
      let pagoRechazado = false;
      let pagoCancelado = false;

      if (resPago.ok) {
        pagoEstado = await resPago.json();
        console.log("Estado del pago:", pagoEstado);
        
        // Guardar estado del pago en el estado local
        setPagoEstado(pagoEstado);
        
        // Verificar si es respuesta de "sin_pago"
        if (pagoEstado.estado === "sin_pago" || pagoEstado.estado_pago === "sin_pago") {
          // No hay pago, todos los estados son false
          console.log("No hay pago registrado para esta solicitud");
        } else {
          // Hay pago, leer los estados
          pagoPendiente = pagoEstado.estado_pago_id === 1; // Pendiente
          pagoAprobado = pagoEstado.estado_pago_id === 2; // Aprobado
          pagoRechazado = pagoEstado.estado_pago_id === 3; // Rechazado
          pagoCancelado = pagoEstado.estado_pago_id === 4; // Cancelado
        }
      }

      const solicitud = dataSolicitud.solicitud;
      const rubroInfo = await cargarInfoRubroActual(solicitud.rubro_id);
      const infoParcelas = await verificarParcelaAsignada();
      const estadoInfo = await verificarEstadoSolicitud(solicitud.estado_solicitud_id);

      // LÓGICA MODIFICADA: Permitir pago solo si puede_pagar es true
      const puedeSolicitar = 
        estadoInfo.aprobada &&
        !infoParcelas.solicitudCompletada &&
        infoParcelas.totalAsignadas < solicitud.parcelas_necesarias &&
        (pagoEstado?.puede_pagar !== false); // <-- USA el campo puede_pagar del backend

      let motivo = "";
      if (!estadoInfo.aprobada) {
        motivo = `La solicitud está ${estadoInfo.nombre}`;
      } else if (pagoPendiente) {
        motivo = "Tienes un pago pendiente. Debes cancelarlo para crear uno nuevo.";
      } else if (pagoAprobado) {
        motivo = "Ya tienes un pago aprobado. No puedes crear uno nuevo.";
      } else if (infoParcelas.solicitudCompletada) {
        motivo = `Ya completaste las ${solicitud.parcelas_necesarias} parcelas necesarias`;
      } else if (infoParcelas.totalAsignadas >= solicitud.parcelas_necesarias) {
        motivo = `Ya tienes ${infoParcelas.totalAsignadas} de ${solicitud.parcelas_necesarias} parcelas asignadas`;
      } else if (pagoEstado?.puede_pagar === false) {
        motivo = pagoEstado.motivo || "No puedes crear un nuevo pago en este momento";
      } else {
        motivo = "Puedes seleccionar parcelas y pagar";
      }

      setInfoValidacion({
        puede_solicitar_parcelas: puedeSolicitar,
        motivo: motivo,
        tiene_solicitud: true,
        pago_pendiente: pagoPendiente,
        pago_aprobado: pagoAprobado,
        pago_rechazado: pagoRechazado,
        pago_cancelado: pagoCancelado,
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
        // AÑADE estos campos nuevos para usar en la UI
        parcelas_asignadas_actuales: pagoEstado?.parcelas_asignadas_actuales || infoParcelas.totalAsignadas,
        parcelas_seleccionadas_en_pago: pagoEstado?.parcelas_seleccionadas_en_pago || [],
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

  // ================ FUNCIONES NUEVAS PARA AUTO-APROBACIÓN ================

  // 1. Función para detectar si venimos de MercadoPago
  const detectarRetornoMercadoPago = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const preferenceId = urlParams.get('pref_id') || urlParams.get('preference_id');
    const pagoStatus = urlParams.get('pago');
    
    console.log("🔍 Detectando retorno de MP:", { preferenceId, pagoStatus });
    
    if (preferenceId) {
      console.log(`Detectado retorno de MercadoPago con preference_id: ${preferenceId}`);
      
      // Limpiar URL para no tener parámetros visibles
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Iniciar verificación automática
      iniciarVerificacionAutomatica(preferenceId);
      
      return true;
    }
    
    return false;
  };

  // 2. Función para verificar y auto-aprobar pagos
  const verificarYAutoAprobarPago = async (preferenceId) => {
    if (!preferenceId) return null;
    
    try {
      console.log(`Verificando pago con preference_id: ${preferenceId}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/pago/check-and-auto-approve/${preferenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (!response.ok) {
        console.log("No se pudo verificar el pago");
        return null;
      }
      
      const data = await response.json();
      console.log("Estado del pago:", data);
      
      return data;
      
    } catch (error) {
      console.error("Error verificando pago:", error);
      return null;
    }
  };

  // 3. Función para iniciar verificación automática
  const iniciarVerificacionAutomatica = (preferenceId) => {
    if (!preferenceId) return;
    
    console.log("Iniciando verificación automática para pago:", preferenceId);
    
    // Mostrar mensaje al usuario
    alert("Detectamos que volviste de MercadoPago.\n\nVerificando estado de tu pago Pago Fácil...");
    
    // Verificar inmediatamente
    verificarYAutoAprobarPago(preferenceId).then(data => {
      if (!data) return;
      
      if (data.status === "auto_approved" || data.status === "already_approved") {
        // Pago aprobado - mostrar mensaje y recargar
        alert(` ${data.message}\n\nTu pago ha sido procesado y las parcelas asignadas.`);
        
        // Recargar información
        cargarInfoValidacion();
        
        // Recargar página para ver cambios en el mapa
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else if (data.status === "pending") {
        // Programar nueva verificación en 10 segundos
        console.log(`Pago pendiente. Reintentando en 10s...`);
        setTimeout(() => {
          verificarYAutoAprobarPago(preferenceId).then(newData => {
            if (newData && (newData.status === "auto_approved" || newData.status === "already_approved")) {
              alert(`Pago aprobado automáticamente!\n\nLas parcelas han sido asignadas.`);
              cargarInfoValidacion();
              setTimeout(() => window.location.reload(), 2000);
            }
          });
        }, 10000);
      }
    });
  };

  // 4. Función para simular "Ya pagué en Pago Fácil"
  const simularYaPaguePagoFacil = async () => {
    if (!pagoEstado?.preference_id) {
      alert("No hay un pago pendiente para simular");
      return;
    }
    
    if (!confirm("¿Confirmas que ya pagaste en Pago Fácil?\n\nEsto marcará automáticamente tu pago como APROBADO y asignará las parcelas.")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/pago/auto-aprobar-pago-facil/${pagoEstado.preference_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        alert(`${result.message}\n\n• Pago ID: ${result.pago_id}\n• Parcelas asignadas: ${result.parcelas_asignadas?.length || 0}\n• Referencia: ${result.referencia || 'N/A'}`);
        
        // Recargar información
        await cargarInfoValidacion();
        
        // Recargar la página para ver cambios en el mapa
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || "Error simulando pago");
      }
    } catch (error) {
      console.error("Error simulando pago:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // 5. Función para copiar referencia de pago
  const copiarReferenciaPago = () => {
    if (!pagoEstado?.preference_id) {
      alert("No hay referencia para copiar");
      return;
    }
    
    const referencia = pagoEstado.preference_id.substring(0, 12) + "...";
    
    navigator.clipboard.writeText(pagoEstado.preference_id)
      .then(() => alert(`Referencia copiada:\n\n${referencia}`))
      .catch(() => {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = pagoEstado.preference_id;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert(`Referencia copiada:\n\n${referencia}`);
      });
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
    detectarRetornoMercadoPago();
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
                      {/* BOTÓN PRINCIPAL DE PAGO */}
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

                      {/* SECCIÓN DE AUTO-APROBACIÓN PAGO FÁCIL - VERSIÓN SIMPLE */}
                      {pagoEstado && pagoEstado.estado_pago_id === 1 && (
                        <div style={{
                          marginTop: '25px',
                          padding: '20px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '15px',
                            paddingBottom: '15px',
                            borderBottom: '1px solid #f0f4f8'
                          }}>
                            <div style={{
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px',
                              color: '#905e29ff'
                            }}>
                            </div>
                            <h5 style={{
                              margin: 0,
                              color: '#905e29ff',
                              fontWeight: '600',
                              fontSize: '1rem'
                            }}>
                              ¿Ya realizaste el pago en efectivo?
                            </h5>
                          </div>
                          
                          <button
                            onClick={simularYaPaguePagoFacil}
                            style={{
                              width: '100%',
                              padding: '14px',
                              backgroundColor: '#905e29ff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              marginBottom: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#905e29ff'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#905e29ff'}
                          >
                            <i className="bi bi-check2-circle" style={{ marginRight: '8px' }}></i>
                            Confirmar que ya pagué
                          </button>
                          
      
                        </div>
                      )}
                      

                      {infoValidacion.pago_aprobado && (
                        <div className="pago-estado-alerta aprobado">
                          <div className="alerta-contenido">
                            <h4>Pago Aprobado</h4>
                            <p>Tu pago ha sido aprobado. No puedes crear un nuevo pago.</p>
                          </div>
                        </div>
                      )}
                      
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
                  {/* SECCIÓN DE COMPROBANTE PDF  */}
                  {pagoEstado && pagoEstado.estado_pago_id === 2 && (
                    <div className="seccion-comprobante">
                      <div className="d-grid gap-3"> {/* Cambiado de gap-2 a gap-3 */}
                        <button
                          className="btn btn-danger"
                          onClick={() => descargarComprobante(pagoEstado.pago_id)}
                          style={{ 
                            backgroundColor: '#905e29ff', 
                            borderColor: '#905e29ff',
                            marginBottom: '8px' 
                          }}
                        >
                          <i className="bi bi-download me-2"></i>
                          Descargar Comprobante PDF
                        </button>
                        
                        <button
                          className="btn btn-outline-success"
                          onClick={() => previsualizarComprobante(pagoEstado.pago_id)}
                          style={{ 
                            backgroundColor: '#553f27ff', 
                            borderColor: '#553f27ff',
                            marginTop: '8px' 
                          }}
                        >
                          <i className="bi bi-eye me-2"></i>
                          Ver Comprobante
                        </button>
                      </div>
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