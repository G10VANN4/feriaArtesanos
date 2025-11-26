import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PagoExitoso = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Evitar que el usuario pueda volver atrás a esta página
    const handleBackButton = (e) => {
      e.preventDefault();
      navigate("/predio", { replace: true });
    };

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener("popstate", handleBackButton);

    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [navigate]);

  return (
    <div className="pago-exitoso">
      <h1>✅ Pago Exitoso</h1>
      <p>Tu pago se ha procesado correctamente.</p>
      <button onClick={() => navigate("/predio")}>Volver al Predio</button>
    </div>
  );
};

export default PagoExitoso;
