import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth, AuthProvider } from "./hooks/useAuth.jsx";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import AdminDashboard from "./pages/AdminDashboard";
import Formulario from "./pages/Formulario";
import GestionUsuarios from "./pages/GestionUsuarios";
import PerfilArtesano from "./pages/PerfilArtesano";
import HistorialSolicitudes from "./pages/HistorialSolicitudes";
import ArtesanoPredio from "./pages/ArtesanoPredio.jsx";
import TerminosPage from "./pages/TerminosPage"; 

import "./styles/App.css";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/formulario" element={<Formulario />} />
            <Route path="/terminos" element={<TerminosPage />} /> 
            <Route path="/mi-perfil" element={<PerfilArtesano />} />
            <Route
              path="/historial-solicitudes"
              element={<HistorialSolicitudes />}
            />

            <Route
              path="/predio"
              element={
                <PrivateRoute>
                  <ArtesanoPredio />
                </PrivateRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/gestion-usuarios"
              element={
                <PrivateRoute>
                  <GestionUsuarios />
                </PrivateRoute>
              }
            />

            {/* Fallback para rutas desconocidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;