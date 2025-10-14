// src/pages/Home.jsx

//import React, { useState } from 'react'; no se usa todavia
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Carousel from '../components/Carousel';
import "../styles/App.css"; 


function Home() { 
  //const [count, setCount] = useState(0); //no se usa todavia

  return (
    <>
      <Navbar /> 

      <Carousel /> 

      <main className="home-content">
        
        
        <section className="hero-section">
          <h1>Fiesta Nacional del Mondongo y la Torta Frita</h1>
          
          <p className="subtitle">
            Cada 1° de mayo, Santa Coloma celebra con orgullo la tradicional Festa Nacional del Mondongo y la Torta Frita, una jornada que reúne a vecinos y visitantes en torno al sabor, la música y la comunidad.
          </p>
          <p className="subtitle">
            En el predio de la vieja estación, se sirven miles de porciones de mondongo y tortas fritas, acompañadas por ferias de artesanos locales, espectáculos en vivo y actividades para toda la familia.
          </p>
          <p className="subtitle">
            Una cita imperdible para disfrutar de la esencia del campo bonaerense, sus costumbres y su calidez inigualable.
          </p>
        </section>

        <section className="registration-cta-section">
          <div className="registration-card">
            <h3>¿Quieres Participar en la Próxima fiesta?</h3>
            <p>Únite a nuestra comunidad de artesanos. Crea tu perfil para participar de la feria y gestionar tu inscripción.</p>
            
            <a href="/registro" className="btn-register">Regístrate Ahora</a> 
          </div>
        </section>

        <section className="info-section">
          <h2>Conoce la Feria</h2>
          <div className="info-cards-container">
            <div className="info-card">
              <h3>Inscripción Simplificada</h3>
              <p>Proceso 100% digital para que los artesanos postulen y reserven su espacio de forma rápida y transparente.</p>
            </div>
            <div className="info-card">
              <h3>Experiencias</h3>
              <p>Un encuentro que reúne a artesanos, músicos y propuestas gastronómicas típicas en un ambiente festivo y familiar.</p>
            </div>
            <div className="info-card">
              <h3>Impacto Local</h3>
              <p>Promovemos la economía regional y el encuentro cultural, fortaleciendo el ecosistema artesanal.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;