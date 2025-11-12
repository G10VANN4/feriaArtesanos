// src/pages/TerminosPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/App.css";

const TerminosPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Navbar />
      <div className="terminos-page-container">
        <div className="terminos-page-content">
          <div className="terminos-header">
            <h1>Términos y Condiciones</h1>
          </div>

          <div className="terminos-content-page">
            <div className="terminos-section">
              <h3>1. Aceptación de los Términos</h3>
              <p>
                Al enviar el formulario de solicitud, usted acepta expresamente los siguientes 
                términos y condiciones para participar en la Feria de Artesanos.
              </p>
            </div>

            <div className="terminos-section">
              <h3>2. Uso de Datos Personales</h3>
              <p>
                Sus datos personales serán utilizados exclusivamente para:
              </p>
              <ul>
                <li>Gestión de su participación en la feria</li>
                <li>Comunicación sobre el estado de su solicitud</li>
                <li>Asignación de espacios y ubicación</li>
                <li>Facturación y procesos administrativos</li>
                <li>Notificaciones importantes sobre la feria</li>
              </ul>
            </div>

            <div className="terminos-section">
              <h3>3. Modificación de Datos por Administradores</h3>
              <p>
                <strong>Autoriza expresamente que los administradores del sistema puedan:</strong>
              </p>
              <ul>
                <li>Modificar el rubro asignado según disponibilidad y necesidades organizativas</li>
              </ul>
            </div>

            <div className="terminos-section">
              <h3>4. Responsabilidades del Artesano</h3>
              <ul>
                <li>Mantener la información actualizada en el sistema</li>
                <li>Cumplir con las normas de convivencia de la feria</li>
                <li>Respetar el espacio asignado y las dimensiones aprobadas</li>
                <li>Cancelar los costos establecidos en los plazos acordados</li>
                <li>Presentar productos que cumplan con las normativas de calidad</li>
                <li>Asistir en las fechas y horarios establecidos</li>
              </ul>
            </div>

            <div className="terminos-section">
              <h3>5. Política de Solicitudes</h3>
              <ul>
                <li>Solo se permite una solicitud por persona por año</li>
                <li>Las solicitudes están sujetas a aprobación por parte de los administradores</li>
                <li>El incumplimiento de términos puede resultar en rechazo de futuras solicitudes</li>
              </ul>
            </div>

            <div className="terminos-section">
              <h3>6. Propiedad Intelectual</h3>
              <p>
                Usted garantiza que los productos que exhibirá son de su autoría o 
                cuenta con los permisos correspondientes para su comercialización.
                La feria no se responsabiliza por infracciones a derechos de autor.
              </p>
            </div>

            <div className="terminos-section">
              <h3>7. Imágenes y Contenido</h3>
              <p>
                Las imágenes enviadas serán utilizadas para:
              </p>
              <ul>
                <li>Evaluación de la solicitud por parte de los administradores</li>
                <li>Documentación interna del proceso de selección</li>
                <li>Visualización en el sistema de gestión de la feria</li>
              </ul>
            </div>

            <div className="terminos-advertencia">
              <h4> Importante</h4>
              <p>
                La aceptación de estos términos es obligatoria para participar en la feria. 
                El incumplimiento de cualquiera de estas condiciones puede resultar en la 
                cancelación de su participación sin derecho a reembolso.
              </p>
            </div>
          </div>

          <div className="terminos-actions">
            <button 
              className="btn-primary"
              onClick={() => navigate("/formulario")}
            >
              Volver al Formulario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminosPage;