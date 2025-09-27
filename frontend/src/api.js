// api.js
import axios from "axios";
import { API_BASE_URL } from "./util";

// axios instance: baseURL olarak API_BASE_URL kullan
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});



