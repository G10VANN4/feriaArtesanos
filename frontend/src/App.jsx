import React from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import Home from './pages/Home';

import Login from './pages/Login';

import Registro from './pages/Registro';

import './styles/App.css';



function App() {

  return (

    <AuthProvider>

      <Router>

        <div className="app-container">

          <Routes>

            {/* La ruta principal / debe mostrar el Home */}

            <Route path="/" element={<Home />} />

            

            {/* Otras rutas */}

            <Route path="/login" element={<Login />} />

            <Route path="/registro" element={<Registro />} />

  

            {/* Redirección para cualquier ruta no definida: va al Home, NO al registro */}

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>

        </div>

      </Router>

    </AuthProvider>

  );

}

export default App;