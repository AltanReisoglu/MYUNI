// api.js
import axios from "axios";
import { API_BASE_URL } from "./util";

// axios instance: baseURL olarak API_BASE_URL kullan
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// request interceptor: localStorage'dan token alır ve header ekler
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
