// src/components/EstadisticasUsuarios.jsx
import React, { useState } from 'react';
import { FiDownload, FiUsers, FiCalendar } from 'react-icons/fi';
import axios from 'axios';

const API_BASE_URL = "http://localhost:5000/api/v1";

const EstadisticasUsuarios = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [agrupacion, setAgrupacion] = useState('dia');
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validarFechas = () => {
    if (!fechaInicio || !fechaFin) {
      setError('Ambas fechas son requeridas');
      return false;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError('La fecha de inicio no puede ser mayor a la fecha de fin');
      return false;
    }

    const hoy = new Date();
    if (new Date(fechaInicio) > hoy || new Date(fechaFin) > hoy) {
      setError('No se permiten fechas futuras');
      return false;
    }

    setError('');
    return true;
  };

  const obtenerEstadisticas = async () => {
    if (!validarFechas()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_BASE_URL}/estadisticas/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          agrupacion: agrupacion
        }
      });

      setEstadisticas(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      setError(error.response?.data?.msg || 'Error al obtener estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async () => {
    if (!validarFechas()) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_BASE_URL}/estadisticas/usuarios/exportar-excel`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          agrupacion: agrupacion
        },
        responseType: 'blob'
      });

      // Crear enlace de descarga para Excel
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_usuarios_${fechaInicio}_${fechaFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error al exportar Excel:', error);
      setError(error.response?.data?.msg || 'Error al exportar Excel');
    }
  };

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-header">
        <h2>
          <FiUsers className="icon" />
          Estadísticas de Usuarios Registrados
        </h2>
        <p>Visualiza y exporta el número de usuarios registrados por período</p>
      </div>

      {/* Selector de fechas */}
      <div className="filtros-estadisticas">
        <div className="fecha-group">
          <label>
            <FiCalendar className="icon" />
            Fecha Inicio:
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="fecha-group">
          <label>
            <FiCalendar className="icon" />
            Fecha Fin:
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="agrupacion-group">
          <label>Agrupación:</label>
          <select
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value)}
          >
            <option value="dia">Por Día</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mes</option>
          </select>
        </div>

        <div className="acciones-estadisticas">
          <button
            onClick={obtenerEstadisticas}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Cargando...' : 'Ver Estadísticas'}
          </button>

          <button
            onClick={exportarExcel}
            disabled={!estadisticas || loading}
            className="btn-secondary"
          >
            <FiDownload className="icon" />
            Exportar Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Resultados */}
      {estadisticas && (
        <div className="resultados-estadisticas">
          <div className="total-general">
            <h3>Total de Usuarios Registrados</h3>
            <div className="total-number">
              {estadisticas.total_general}
            </div>
            <p>
              Período: {estadisticas.rango_fechas.inicio} 
              {' - '} 
              {estadisticas.rango_fechas.fin}
            </p>
          </div>

          <div className="grafico-container">
            <h3>Distribución por {agrupacion === 'dia' ? 'Día' : agrupacion === 'semana' ? 'Semana' : 'Mes'}</h3>
            <div className="datos-lista">
              {estadisticas.datos.map((item, index) => (
                <div key={index} className="dato-item">
                  <span className="periodo">{item.label}</span>
                  <span className="total">{item.total} usuarios</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasUsuarios;