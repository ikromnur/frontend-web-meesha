import axios from "axios";
import { getSession } from "next-auth/react";

// Axios client untuk memanggil endpoint relatif yang di-rewrite ke backend.
// Header Authorization otomatis diambil dari localStorage.
export const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  validateStatus: (status) => {
    return (status >= 200 && status < 300) || status === 304;
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      // Ambil token dari NextAuth session agar konsisten dengan login admin
      const session = await getSession();
      const token =
        (session as any)?.accessToken ||
        (typeof window !== "undefined"
          ? localStorage.getItem("token")
          : undefined);
      if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    } catch {}
    // Log khusus untuk operasi orders v1 agar mudah di-trace di Console
    try {
      const method = (config.method || "GET").toUpperCase();
      const url = String(config.url || "");
      if (method === "PATCH" && url.includes("/api/v1/orders")) {
        console.log("[API] Request", { method, url, data: config.data });
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response logging (ringkas) untuk orders v1
api.interceptors.response.use(
  (response) => {
    try {
      const method = (response.config?.method || "GET").toUpperCase();
      const url = String(response.config?.url || "");
      if (method === "PATCH" && url.includes("/api/v1/orders")) {
        console.log("[API] Response", {
          status: response.status,
          data: response.data,
        });
      }
    } catch {}
    return response;
  },
  (error) => {
    try {
      const method = (error?.config?.method || "").toUpperCase();
      const url = String(error?.config?.url || "");
      if (method === "PATCH" && url.includes("/api/v1/orders")) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        console.log("[API] Error Response", { status, data });
      }
    } catch {}
    return Promise.reject(error);
  }
);

export default api;
