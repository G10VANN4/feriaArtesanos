import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import MapaGrid from "../components/MapaGrid";
import "../styles/App.css";

const ArtesanoPredio = () => {
  const [parcelasSeleccionadas, setParcelasSeleccionadas] = useState([]);
  const [infoSolicitud, setInfoSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar información de la solicitud del artesano
  const cargarInfoSolicitud = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      console.log("🔑 Cargando información de solicitud...");

      const response = await fetch("/api/v1/artesano/mi-solicitud", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Respuesta:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Datos recibidos:", data);
        setInfoSolicitud(data);
      } else if (response.status === 404) {
        setError(
          "No tienes una solicitud aprobada. Completa el formulario primero."
        );
      } else {
        setError("Error al cargar la información de tu solicitud");
      }
    } catch (error) {
      console.error("Error cargando información de solicitud:", error);
      setError("Error de conexión al cargar tu solicitud");
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección de parcela
  const handleParcelaSeleccionada = (parcela) => {
    if (!parcela || !parcela.parcela_id) return;

    const yaSeleccionada = parcelasSeleccionadas.some(
      (p) => p.parcela_id === parcela.parcela_id
    );

    if (yaSeleccionada) {
      setParcelasSeleccionadas((prev) =>
        prev.filter((p) => p.parcela_id !== parcela.parcela_id)
      );
    } else {
      setParcelasSeleccionadas((prev) => [...prev, parcela]);
    }
  };

  // Calcular costo total
  const calcularCostoTotal = () => {
    if (!infoSolicitud || parcelasSeleccionadas.length === 0) return 0;
    const precioPorParcela = infoSolicitud.precio_parcela || 0;
    return precioPorParcela * parcelasSeleccionadas.length;
  };

  // Manejar pago
  const handlePagar = async () => {
    if (parcelasSeleccionadas.length === 0) {
      alert("Debes seleccionar al menos una parcela");
      return;
    }

    try {
      setLoading(true);
      // Aquí iría la lógica real para procesar el pago
      console.log("Procesando pago para parcelas:", parcelasSeleccionadas);
      alert(`Pago procesado por $${calcularCostoTotal()}`);
    } catch (error) {
      console.error("Error procesando pago:", error);
      alert("Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInfoSolicitud();
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
            />
          </div>

          {/* Información a la derecha */}
          <div className="info-section">
            <div className="info-card">
              <h3>Información de tu puesto</h3>

              {loading ? (
                <div className="cargando-info">
                  Cargando información de tu solicitud...
                </div>
              ) : error ? (
                <div className="error-info">
                  <p>{error}</p>
                  <button
                    className="btn-formulario"
                    onClick={() => (window.location.href = "/formulario")}
                  >
                    Ir al Formulario
                  </button>
                </div>
              ) : infoSolicitud ? (
                <>
                  <div className="info-item">
                    <label>Rubro:</label>
                    <span>{infoSolicitud.rubro_tipo || "No especificado"}</span>
                  </div>

                  <div className="info-item">
                    <label>Dimensiones requeridas:</label>
                    <span>
                      {infoSolicitud.dimensiones_largo || 0}m ×{" "}
                      {infoSolicitud.dimensiones_ancho || 0}m
                    </span>
                  </div>

                  <div className="info-item">
                    <label>Parcelas seleccionadas:</label>
                    <span>
                      {parcelasSeleccionadas.length} de{" "}
                      {infoSolicitud.parcelas_necesarias || 1} parcela(s)
                    </span>
                  </div>

                  <div className="info-item destacado">
                    <label>Total a pagar:</label>
                    <span className="costo-total">${calcularCostoTotal()}</span>
                  </div>

                  <div className="instrucciones">
                    <p>
                      <strong>
                        Tu puesto mide {infoSolicitud.dimensiones_largo || 0}×
                        {infoSolicitud.dimensiones_ancho || 0}m
                      </strong>
                      , por lo que necesitas seleccionar{" "}
                      {infoSolicitud.parcelas_necesarias || 1} parcela(s).
                    </p>
                    <p>
                      Según tu rubro <strong>{infoSolicitud.rubro_tipo}</strong>
                      , el valor por parcela es{" "}
                      <strong>${infoSolicitud.precio_parcela || 0}</strong>.
                    </p>
                  </div>

                  <button
                    className="btn-pagar"
                    onClick={handlePagar}
                    disabled={loading || parcelasSeleccionadas.length === 0}
                  >
                    {loading
                      ? "Procesando..."
                      : `Pagar $${calcularCostoTotal()}`}
                  </button>
                </>
              ) : (
                <div className="sin-info">No se pudo cargar la información</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ArtesanoPredio;
