import React, { useState, useEffect } from 'react';
import { FiUsers, FiMonitor, FiSmartphone, FiGlobe } from 'react-icons/fi';
import axios from 'axios';

const API_BASE_URL = "http://localhost:5000/api/v1"; 

const ActiveUsersPanel = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/metrics/active-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Cargando métricas...</div>;

  return (
    <div className="active-users-panel">
      <div className="panel-header">
        <FiUsers size={24} />
        <h3>Usuarios Activos en Tiempo Real</h3>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card total-users">
          <div className="metric-value">{metrics?.total_active || 0}</div>
          <div className="metric-label">Usuarios Conectados</div>
          <div className="metric-breakdown">
            <span> Admins: {metrics?.by_role?.admin || 0}</span>
            <span> Artesanos: {metrics?.by_role?.artesano || 0}</span>
          </div>
        </div>

        <div className="metric-card devices">
          <FiMonitor size={20} />
          <div className="metric-value">--</div>
          <div className="metric-label">Escritorio</div>
        </div>

        <div className="metric-card devices">
          <FiSmartphone size={20} />
          <div className="metric-value">--</div>
          <div className="metric-label">Móvil</div>
        </div>

        <div className="metric-card location">
          <FiGlobe size={20} />
          <div className="metric-value">--</div>
          <div className="metric-label">Regiones</div>
        </div>
      </div>

      {/* Lista de usuarios activos */}
      {metrics?.active_users && metrics.active_users.length > 0 && (
        <div className="active-users-list">
          <h4>Usuarios Conectados:</h4>
          <div className="users-grid">
            {metrics.active_users.map(user => (
              <div key={user.user_id} className="user-card">
                <div className="user-email">{user.email}</div>
                <div className="user-role">
                  {user.rol_id === 2 ? 'Admin' : 'Artesano'}
                </div>
                <div className="user-activity">
                  Activo hace {Math.floor(user.inactive_seconds)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsersPanel;