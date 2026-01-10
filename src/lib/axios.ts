// Klien Axios utama untuk seluruh frontend. Tugasnya:
// - Menentukan `baseURL` ke backend (default `http://localhost:4000`).
// - Menyisipkan prefix `/api` untuk endpoint relatif agar semua
//   request diarahkan ke `http://localhost:4000/api/...`.
// - Menambahkan Authorization token dari NextAuth jika tersedia.
// - Mengelola indikator loading (NProgress) saat ada request berjalan.
import axios from "axios";
import { getSession } from "next-auth/react";
import NProgress from "nprogress";

// Gunakan domain backend secara langsung agar Request URL mengarah ke
// server backend (port 4000). Ketika ENDPOINT relatif (mis. `/products`)
// dikirim, interceptor akan menambahkan prefix `/api` sehingga
// `http://localhost:4000` + `/api/products`.
// Pastikan NEXT_PUBLIC_BACKEND_URL diset ke contoh: http://localhost:4000
// FIX: Default ke string kosong agar menggunakan relative path (via Next.js Proxy)
// Ini mencegah CORS error karena request akan melalui same-origin (localhost:3000)
const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export const axiosInstance = axios.create({
  baseURL,
  headers: {
    // Biarkan default kosong; akan di-set dinamis di interceptor
  },
});

// Tambah counter untuk mengelola state loader saat banyak request paralel
let activeRequests = 0;

// Request interceptor:
// - Memulai NProgress (loader) ketika ada request.
// - Mengambil session NextAuth untuk token dan menyisipkannya.
axiosInstance.interceptors.request.use(
  async (config) => {
    if (activeRequests === 0) {
      NProgress.start();
    }
    activeRequests++;

    // Pastikan headers ada
    if (!config.headers) {
      config.headers = {} as any;
    }

    // Jika URL adalah relatif (mis. /products), tambahkan prefix /api
    // jika belum ada.
    if (
      config.url &&
      !config.url.startsWith("http") &&
      !config.url.startsWith("/api")
    ) {
      // Pastikan config.url diawali "/"
      const path = config.url.startsWith("/") ? config.url : `/${config.url}`;

      // FIX: If targeting backend directly (baseURL is set), use /api/v1
      // Otherwise (proxy), use /api
      if (baseURL) {
        if (path.startsWith("/v1")) {
          config.url = `/api${path}`;
        } else {
          config.url = `/api/v1${path}`;
        }
      } else {
        config.url = `/api${path}`;
      }
    }

    // Ambil session
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }

    return config;
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    return Promise.reject(error);
  }
);

// Response interceptor:
// - Menghentikan NProgress saat request selesai.
axiosInstance.interceptors.response.use(
  (response) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    return response;
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
