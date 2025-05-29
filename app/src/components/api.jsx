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
  const message = error.response?.data?.error || error.message;

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

export async function getAllServers() {
  try {
    const response = await api.get("/api/servers");
    return response.data;
  } catch (error) {
    handleAPIError(error, "Getting all servers");
  }
}

// ===========================================
// NODE CRUD OPERATIONS
// ===========================================

/**
 * Get all nodes
 * @returns {Promise<Object>} All nodes data
 */
export async function getAllNodes() {
  try {
    const response = await api.get("/api/nodes");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllNodes");
  }
}

/**
 * Get single node by database ID
 * @param {number} id - Database ID of the node
 * @returns {Promise<Object>} Node data
 */
export async function getNodeById(id) {
  try {
    const response = await api.get(`/api/nodes/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getNodeById");
  }
}

/**
 * Get node by Pterodactyl node ID
 * @param {number} nodeId - Pterodactyl node ID
 * @returns {Promise<Object>} Node data
 */
export async function getNodeByPterodactylId(nodeId) {
  try {
    const response = await api.get(`/api/nodes/pterodactyl/${nodeId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getNodeByPterodactylId");
  }
}

/**
 * Create a new node
 * @param {Object} nodeData - Node data
 * @param {number} nodeData.nodeId - Pterodactyl node ID
 * @param {string} nodeData.location - Node location
 * @returns {Promise<Object>} Created node data
 */
export async function createNode(nodeData) {
  try {
    const response = await api.post("/api/nodes", nodeData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createNode");
  }
}

/**
 * Update node by database ID (full update)
 * @param {number} id - Database ID of the node
 * @param {Object} nodeData - Updated node data
 * @param {number} nodeData.nodeId - Pterodactyl node ID
 * @param {string} nodeData.location - Node location
 * @returns {Promise<Object>} Updated node data
 */
export async function updateNode(id, nodeData) {
  try {
    const response = await api.put(`/api/nodes/${id}`, nodeData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateNode");
  }
}

/**
 * Partially update node by database ID
 * @param {number} id - Database ID of the node
 * @param {Object} nodeData - Partial node data to update
 * @returns {Promise<Object>} Updated node data
 */
export async function patchNode(id, nodeData) {
  try {
    const response = await api.patch(`/api/nodes/${id}`, nodeData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "patchNode");
  }
}

/**
 * Delete node by database ID
 * @param {number} id - Database ID of the node
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteNode(id) {
  try {
    const response = await api.delete(`/api/nodes/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteNode");
  }
}

/**
 * Delete node by Pterodactyl node ID
 * @param {number} nodeId - Pterodactyl node ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteNodeByPterodactylId(nodeId) {
  try {
    const response = await api.delete(`/api/nodes/pterodactyl/${nodeId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteNodeByPterodactylId");
  }
}

// ===========================================
// EGG CRUD OPERATIONS (for consistency)
// ===========================================

/**
 * Get all eggs
 * @returns {Promise<Object>} All eggs data
 */
export async function getAllEggs() {
  try {
    const response = await api.get("/api/eggs");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllEggs");
  }
}

/**
 * Get single egg by database ID
 * @param {number} id - Database ID of the egg
 * @returns {Promise<Object>} Egg data
 */
export async function getEggById(id) {
  try {
    const response = await api.get(`/api/eggs/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getEggById");
  }
}

/**
 * Get egg by Pterodactyl egg ID
 * @param {number} eggId - Pterodactyl egg ID
 * @returns {Promise<Object>} Egg data
 */
export async function getEggByPterodactylId(eggId) {
  try {
    const response = await api.get(`/api/eggs/pterodactyl/${eggId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getEggByPterodactylId");
  }
}

/**
 * Create a new egg
 * @param {Object} eggData - Egg data
 * @param {number} eggData.eggId - Pterodactyl egg ID
 * @param {string} eggData.name - Egg name
 * @param {string} eggData.description - Egg description (optional)
 * @param {string} eggData.img - Egg image URL
 * @returns {Promise<Object>} Created egg data
 */
export async function createEgg(eggData) {
  try {
    const response = await api.post("/api/eggs", eggData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createEgg");
  }
}

/**
 * Update egg by database ID (full update)
 * @param {number} id - Database ID of the egg
 * @param {Object} eggData - Updated egg data
 * @returns {Promise<Object>} Updated egg data
 */
export async function updateEgg(id, eggData) {
  try {
    const response = await api.put(`/api/eggs/${id}`, eggData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateEgg");
  }
}

/**
 * Partially update egg by database ID
 * @param {number} id - Database ID of the egg
 * @param {Object} eggData - Partial egg data to update
 * @returns {Promise<Object>} Updated egg data
 */
export async function patchEgg(id, eggData) {
  try {
    const response = await api.patch(`/api/eggs/${id}`, eggData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "patchEgg");
  }
}

/**
 * Delete egg by database ID
 * @param {number} id - Database ID of the egg
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteEgg(id) {
  try {
    const response = await api.delete(`/api/eggs/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteEgg");
  }
}

/**
 * Delete egg by Pterodactyl egg ID
 * @param {number} eggId - Pterodactyl egg ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteEggByPterodactylId(eggId) {
  try {
    const response = await api.delete(`/api/eggs/pterodactyl/${eggId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteEggByPterodactylId");
  }
}

// ===========================================
// USER CRUD OPERATIONS
// ===========================================

/**
 * Get all users
 * @returns {Promise<Object>} All users data
 */
export async function getAllUsers() {
  try {
    const response = await api.get("/api/users");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllUsers");
  }
}

/**
 * Get single user by database ID
 * @param {number} id - Database ID of the user
 * @returns {Promise<Object>} User data
 */
export async function getUserById(id) {
  try {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserById");
  }
}

/**
 * Get user by Pterodactyl user ID
 * @param {number} pteroId - Pterodactyl user ID
 * @returns {Promise<Object>} User data
 */
export async function getUserByPterodactylId(pteroId) {
  try {
    const response = await api.get(`/api/users/pterodactyl/${pteroId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserByPterodactylId");
  }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object>} User data
 */
export async function getUserByUsername(username) {
  try {
    const response = await api.get(`/api/users/username/${username}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserByUsername");
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User data
 */
export async function getUserByEmail(email) {
  try {
    const response = await api.get(
      `/api/users/email/${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserByEmail");
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.firstName - User's first name (2-50 chars)
 * @param {string} userData.lastName - User's last name (2-50 chars)
 * @param {string} userData.username - Username (3-30 chars, alphanumeric)
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password (6+ chars)
 * @param {number} userData.ptero_id - Pterodactyl user ID
 * @returns {Promise<Object>} Created user data
 */
export async function createUser(userData) {
  try {
    const response = await api.post("/api/users", userData);
    return response.data;
  } catch (error) {
    return handleAPIError(error, "createUser");
  }
}

/**
 * Update user by database ID (full update)
 * @param {number} id - Database ID of the user
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(id, userData) {
  try {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateUser");
  }
}

/**
 * Partially update user by database ID
 * @param {number} id - Database ID of the user
 * @param {Object} userData - Partial user data to update
 * @returns {Promise<Object>} Updated user data
 */
export async function patchUser(id, userData) {
  try {
    const response = await api.patch(`/api/users/${id}`, userData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "patchUser");
  }
}

/**
 * Delete user by database ID
 * @param {number} id - Database ID of the user
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteUser(id) {
  try {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteUser");
  }
}

/**
 * Delete user by Pterodactyl user ID
 * @param {number} pteroId - Pterodactyl user ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteUserByPterodactylId(pteroId) {
  try {
    const response = await api.delete(`/api/users/pterodactyl/${pteroId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteUserByPterodactylId");
  }
}

/**
 * Get user's resources
 * @param {number} id - Database ID of the user
 * @returns {Promise<Object>} User's resources data
 */
export async function getUserResources(id) {
  try {
    const response = await api.get(`/api/users/${id}/resources`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserResources");
  }
}

/**
 * Update user's resources
 * @param {number} id - Database ID of the user
 * @param {Object} resourcesData - Resources data to update
 * @returns {Promise<Object>} Updated resources data
 */
export async function updateUserResources(id, resourcesData) {
  try {
    const response = await api.put(`/api/users/${id}/resources`, resourcesData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateUserResources");
  }
}

/**
 * Search users by various criteria
 * @param {Object} searchParams - Search parameters
 * @param {string} searchParams.query - General search query
 * @param {string} searchParams.firstName - First name filter
 * @param {string} searchParams.lastName - Last name filter
 * @Param {string} searchParams.username - Username filter
 * @param {string} searchParams.email - Email filter
 * @param {number} searchParams.limit - Maximum results to return
 * @param {number} searchParams.offset - Results offset for pagination
 * @returns {Promise<Object>} Search results
 */
export async function searchUsers(searchParams = {}) {
  try {
    const response = await api.get("/api/users/search", {
      params: searchParams,
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "searchUsers");
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
