import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import './index.css'
import App from './App.jsx'

// CONFIGURACIÓN ALTERNATIVA que usa el endpoint de Google directamente
ReactGA.initialize('G-CZE9J6QW0D', {
  gtagOptions: {
    debug_mode: true,
    // Esta línea puede ayudar a evitar bloqueadores básicos
    transport_type: 'beacon'
  },
  // Fuerza el uso de la vía estándar
  testMode: false
});

ReactGA.send('pageview');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)