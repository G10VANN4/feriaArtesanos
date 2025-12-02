import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import './index.css'
import App from './App.jsx'

const GA_MEASUREMENT_ID = 'G-CZE9J6QW0D'; //modificar

ReactGA.initialize(GA_MEASUREMENT_ID, { 
  gtagOptions: {
    debug_mode: true,
    transport_type: 'beacon'
  },
  testMode: false
});

ReactGA.send('pageview');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)