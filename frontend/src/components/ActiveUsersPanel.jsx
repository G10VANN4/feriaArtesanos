import React, { useState, useEffect } from 'react';
import { FiUsers } from 'react-icons/fi';

const ActiveUsersPanel = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="active-users-panel">
      <div className="panel-header">
        <FiUsers size={24} />
        <h3>Panel de Usuarios</h3>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card total-users">
          <div className="metric-value">Sistema con Cookies</div>
          <div className="metric-label">Autenticación Activa</div>
          <div className="metric-breakdown">
            <span>✅ Sesiones persistentes</span>
            <span>✅ Logout automático</span>
          </div>
        </div>
      </div>

      <div className="info-message">
        <p>El sistema de gestión de sesiones activas fue removido.</p>
        <p>Ahora se usa autenticación con cookies JWT.</p>
      </div>
    </div>
  );
};

export default ActiveUsersPanel;