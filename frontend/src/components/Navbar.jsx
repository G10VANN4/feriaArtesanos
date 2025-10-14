// src/components/Navbar.jsx

import React from 'react';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="navbar-logo">
        <a href="/">Gestión Artesanal</a>
      </div>
      <nav className="navbar-links">
        {/* Enlaces de navegación según el Figma */}
        <a href="#inicio">Inicio</a>
        <a href="#contacto">Contacto</a>
        <button className="btn-login">Iniciar sesión</button> 
      </nav>
    </header>
  );
};

export default Navbar;