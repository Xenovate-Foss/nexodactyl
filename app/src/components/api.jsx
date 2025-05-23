import axios from "axios";
//import { api } from "@/context/AuthProvider";

const api = axios.create({
  baseURL: "", // Empty since Vite proxy handles /api/ routing
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important: allows cookies to be sent with requests
});

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status, endpoint) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

// Helper function to handle API errors consistently
const handleAPIError = (error, endpoint) => {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;

  console.error(`API Error [${endpoint}]:`, {
    status,
    message,
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
  });

  throw new APIError(message, status, endpoint);
};

/**
 * Fetch application configuration
 * @returns {Promise<Object|null>} Configuration object or null if failed
 */
export async function config() {
  try {
    // Use the authenticated api instance for consistency
    const response = await api.get("/api/config");
    return response.data?.config || response.data;
  } catch (error) {
    handleAPIError(error, "config");
    return null; // Fallback for non-critical config
  }
}

/**
 * Fetch current user data
 * @returns {Promise<Object>} User data object
 * @throws {APIError} When the request fails
 */
export async function userData() {
  try {
    const response = await api.get("/api/auth/me");
    return response.data;
  } catch (error) {
    // Don't return null for user data as it's critical
    handleAPIError(error, "userData");
  }
}

/**
 * Update user profile
 * @param {Object} updates - User profile updates
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUserProfile(updates) {
  try {
    const response = await api.put("/api/auth/profile", updates);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateUserProfile");
  }
}

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success response
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await api.post("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "changePassword");
  }
}

/**
 * Generic GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
export async function get(endpoint, params = {}) {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    handleAPIError(error, `GET ${endpoint}`);
  }
}

/**
 * Generic POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function post(endpoint, data = {}) {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    handleAPIError(error, `POST ${endpoint}`);
  }
}

/**
 * Generic PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function put(endpoint, data = {}) {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error) {
    handleAPIError(error, `PUT ${endpoint}`);
  }
}

/**
 * Generic DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
export async function del(endpoint) {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    handleAPIError(error, `DELETE ${endpoint}`);
  }
}

// Export the API instance for direct use if needed
export { api };

// Export common HTTP status codes for error handling
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
