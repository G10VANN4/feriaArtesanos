// src/pages/ConfigurarMapa.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import "../styles/App.css";

export default function ConfigurarMapa() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [filas, setFilas] = useState("");
  const [columnas, setColumnas] = useState("");
  const [respuesta, setRespuesta] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.rol_id !== 3) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const configurarMapa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRespuesta(null);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/mapa/configurar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filas: Number(filas),
          columnas: Number(columnas),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al procesar la solicitud");
      } else {
        setRespuesta(data);
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor");
    }

    setLoading(false);
  };

  return (
    <div className="gestion-usuarios-container">
      <Navbar />

      <div className="gestion-usuarios-content">
        <div className="gestion-header">
          <h1>Configuración del Mapa</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {respuesta && <div className="alert alert-success">Mapa configurado correctamente</div>}

        <div className="crear-usuario-section">
          <h2>Definir tamaño del predio</h2>

          <form onSubmit={configurarMapa} className="usuario-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cantidad de filas</label>
                <input
                  type="number"
                  className="form-input"
                  value={filas}
                  onChange={(e) => setFilas(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad de columnas</label>
                <input
                  type="number"
                  className="form-input"
                  value={columnas}
                  onChange={(e) => setColumnas(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? "Procesando..." : "Configurar Mapa"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
