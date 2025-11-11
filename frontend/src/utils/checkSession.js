/* eslint-disable no-unused-vars */
import axios from "axios";

const checkSession = async () => {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const res = await axios.post(
      "http://localhost:5000/auth/validate-session",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.data.valid) {
      alert("Tu sesión se cerró porque iniciaste sesión en otro lugar.");
      localStorage.clear();
      window.location.href = "/login";
    }
  } catch (error) {
    localStorage.clear();
    window.location.href = "/login";
  }
};

export default checkSession;
