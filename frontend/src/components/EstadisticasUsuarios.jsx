// src/components/EstadisticasUsuarios.jsx
import React, { useState, useEffect } from 'react';
import { FiUsers, FiTrendingUp, FiCalendar, FiDownload, FiBarChart2 } from 'react-icons/fi';
import axios from 'axios';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = "http://localhost:5000/api/v1";

const EstadisticasUsuarios = () => {
  const [estadisticasData, setEstadisticasData] = useState({
    estadisticas: [],
    total_general: 0,
    rango_fechas: { inicio: '', fin: '' },
    agrupacion: 'dia'
  });
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [agrupacion, setAgrupacion] = useState('dia');
  const [error, setError] = useState('');

  // Establecer fechas por defecto (últimos 7 días)
  useEffect(() => {
    const hoy = new Date();
    const haceSieteDias = new Date();
    haceSieteDias.setDate(hoy.getDate() - 7);

    setFechaInicio(haceSieteDias.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  // Cargar estadísticas cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      obtenerEstadisticas();
    }
  }, [fechaInicio, fechaFin, agrupacion]);

  const obtenerEstadisticas = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona ambas fechas');
      return;
    }

    setLoading(true);
    setError('');

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

      setEstadisticasData(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      if (error.response?.data?.msg) {
        setError(error.response.data.msg);
      } else {
        setError('Error al cargar las estadísticas');
      }
      setEstadisticasData({
        estadisticas: [],
        total_general: 0,
        rango_fechas: { inicio: fechaInicio, fin: fechaFin },
        agrupacion: agrupacion
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarAExcel = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona ambas fechas');
      return;
    }

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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_usuarios_${fechaInicio}_${fechaFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      if (error.response?.data?.msg) {
        setError(error.response.data.msg);
      } else {
        setError('Error al exportar el reporte');
      }
    }
  };

  // Calcular totales
  const estadisticas = estadisticasData.estadisticas || [];
  const totalUsuarios = estadisticasData.total_general || 0;
  const promedioUsuarios = estadisticas.length > 0 ? (totalUsuarios / estadisticas.length).toFixed(1) : 0;

  // Preparar datos para gráficos
  const datosGrafico = {
    labels: estadisticas.map(item => item.fecha),
    datasets: [
      {
        label: 'Nuevos Usuarios',
        data: estadisticas.map(item => item.nuevos_usuarios),
        backgroundColor: 'rgba(160, 82, 45, 0.6)',
        borderColor: 'rgba(160, 82, 45, 1)',
        borderWidth: 2,
      },
    ],
  };

  const opcionesGrafico = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Evolución de Nuevos Usuarios (${agrupacion})`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-header">
        <h2>
          <FiBarChart2 className="icon-stats" />
          Estadísticas de Usuarios
        </h2>
        <p>Monitorea el crecimiento de usuarios en tu plataforma</p>
      </div>

      {/* Filtros */}
      <div className="filtros-estadisticas">
        <div className="filtro-group">
          <label>
            <FiCalendar className="icon-filter" />
            Fecha Inicio:
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="filtro-input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="filtro-group">
          <label>
            <FiCalendar className="icon-filter" />
            Fecha Fin:
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="filtro-input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="filtro-group">
          <label>
            <FiTrendingUp className="icon-filter" />
            Agrupación:
          </label>
          <select
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value)}
            className="filtro-select"
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
            className="btn-refresh"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>

          <button
            onClick={exportarAExcel}
            disabled={estadisticas.length === 0}
            className="btn-export"
          >
            <FiDownload size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="resumen-cards">
        <div className="resumen-card">
          <div className="resumen-icon total">
            <FiUsers size={24} />
          </div>
          <div className="resumen-content">
            <h3>Total Usuarios</h3>
            <p className="resumen-number">{totalUsuarios}</p>
            <span className="resumen-label">En el período seleccionado</span>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-icon promedio">
            <FiTrendingUp size={24} />
          </div>
          <div className="resumen-content">
            <h3>Promedio Diario</h3>
            <p className="resumen-number">{promedioUsuarios}</p>
            <span className="resumen-label">Usuarios por {agrupacion}</span>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-icon periodos">
            <FiCalendar size={24} />
          </div>
          <div className="resumen-content">
            <h3>Períodos</h3>
            <p className="resumen-number">{estadisticas.length}</p>
            <span className="resumen-label">{agrupacion === 'dia' ? 'Días' : agrupacion === 'semana' ? 'Semanas' : 'Meses'}</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {estadisticas.length > 0 && (
        <div className="graficos-container">
          <div className="grafico-section">
            <h3>Evolución Temporal</h3>
            <div className="grafico-wrapper">
              <Line data={datosGrafico} options={opcionesGrafico} />
            </div>
          </div>

          <div className="grafico-section">
            <h3>Distribución por Período</h3>
            <div className="grafico-wrapper">
              <Bar data={datosGrafico} options={opcionesGrafico} />
            </div>
          </div>
        </div>
      )}

      {/* Tabla de datos */}
      {estadisticas.length > 0 && (
        <div className="tabla-estadisticas">
          <h3>Datos Detallados</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha/Período</th>
                  <th>Nuevos Usuarios</th>
                </tr>
              </thead>
              <tbody>
                {estadisticas.map((item, index) => (
                  <tr key={index}>
                    <td>{item.fecha}</td>
                    <td>
                      <span className="badge-count">
                        {item.nuevos_usuarios}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>Total</strong></td>
                  <td><strong>{totalUsuarios}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {estadisticas.length === 0 && !loading && !error && (
        <div className="empty-state">
          <FiBarChart2 size={48} />
          <h3>No hay datos para mostrar</h3>
          <p>Selecciona un rango de fechas para ver las estadísticas</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      )}
    </div>
  );
};

export default EstadisticasUsuarios;