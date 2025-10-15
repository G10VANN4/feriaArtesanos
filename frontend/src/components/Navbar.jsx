import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="logo-link">
          <img src="/images/logo.png" alt="Logo Fiesta del Mondongo" className="logo-image" />
          <span className="logo-text">Fiesta Nacional del Mondongo y la Torta Frita</span>
        </Link>
      </div>
      <nav className="navbar-links">
        <Link to="/">Inicio</Link>
        <a href="#contacto">Contacto</a>
        
        {isAuthenticated ? (
          <>
            <span className="user-greeting">
              Hola, {user?.nombre || user?.email}
            </span>
            <button className="btn-login" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </>
        ) : (
          <button 
            className="btn-login" 
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
        )}
      </nav>
    </header>
  );
};

export default Navbar;