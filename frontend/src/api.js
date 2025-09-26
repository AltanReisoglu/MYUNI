import axios from 'axios';

// Create an instance of axios with the base URL
const api = axios.create({
  baseURL: "/choreo-apis/myuni-tn/backend/v1"
});

// Export the Axios instance

export default api;

