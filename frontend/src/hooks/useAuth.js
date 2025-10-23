import { useState } from "react";
import axios from "axios";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  //REGISTRO
  const register = async (formData) => {
    try {
      const response = await axios.post("http://localhost:5000/auth/register", {
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre || formData.email.split("@")[0],
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error en el registro:", error);
      return {
        success: false,
        message:
          error.response?.data?.msg || "Error en el registro. Inténtalo nuevamente.",
      };
    }
  };

  //LOGIN
  const login = async (email, password) => {
    try {
      const response = await axios.post("http://localhost:5000/auth/login", {
        email,
        password,
      });

      // Guardar token y usuario
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          email,
          rol_id: response.data.rol_id,
        })
      );

      setIsAuthenticated(true);
      setUser({ email, rol_id: response.data.rol_id });

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error en el login:", error);
      return {
        success: false,
        message: error.response?.data?.msg || "Credenciales inválidas",
      };
    }
  };

  //LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  return { register, login, logout, isAuthenticated, user };
};
