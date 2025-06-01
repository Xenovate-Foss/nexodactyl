import axios from "axios";

const api = axios.create({
  baseURL: "", // Empty since Vite proxy handles /api/ routing
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important: allows cookies to be sent with requests
});

// Request interceptor for adding auth tokens or logging
api.interceptors.request.use(
  (config) => {
    // Add timestamp for request tracking
    config.metadata = { startTime: new Date() };

    // Optional: Add auth token if available
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling and logging
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${
          response.status
        } (${duration}ms)`
      );
    }

    return response;
  },
  (error) => {
    const duration = error.config?.metadata
      ? new Date() - error.config.metadata.startTime
      : 0;
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;

    if (process.env.NODE_ENV === "development") {
      console.error(
        `❌ ${method} ${url} - ${status} (${duration}ms)`,
        error.response?.data
      );
    }

    // Handle common HTTP errors
    if (status === 401) {
      // Redirect to login or refresh token
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    } else if (status === 403) {
      window.dispatchEvent(new CustomEvent("auth:forbidden"));
    } else if (status >= 500) {
      window.dispatchEvent(
        new CustomEvent("api:server-error", {
          detail: { status, message: error.response?.data?.error },
        })
      );
    }

    return Promise.reject(error);
  }
);

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status, endpoint, details = null) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  // Helper method to check error type
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  isServerError() {
    return this.status >= 500;
  }

  isNetworkError() {
    return !this.status;
  }
}

// Helper function to handle API errors consistently
const handleAPIError = (error, endpoint) => {
  const status = error.response?.status;
  const message =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message;
  const details = error.response?.data;

  // Enhanced error logging
  console.error(`API Error [${endpoint}]:`, {
    status,
    message,
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
    details,
    timestamp: new Date().toISOString(),
  });

  throw new APIError(message, status, endpoint, details);
};

// Retry mechanism for failed requests
const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || error.response?.status < 500) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Validation helpers
const validateRequired = (data, requiredFields) => {
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
};

const validateUsername = (username) => {
  if (username.length < 3 || username.length > 30) {
    throw new Error("Username must be between 3 and 30 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error(
      "Username can only contain letters, numbers, underscores, and hyphens"
    );
  }
};

// ===========================================
// CORE API FUNCTIONS
// ===========================================

/**
 * Fetch application configuration
 * @returns {Promise<Object|null>} Configuration object or null if failed
 */
export async function config() {
  try {
    const response = await retryRequest(() => api.get("/api/config"));
    return response.data?.config || response.data;
  } catch (error) {
    // Config is non-critical, so we can return null
    console.warn("Failed to fetch config:", error.message);
    return null;
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
    // Validate email if provided
    if (updates.email) {
      validateEmail(updates.email);
    }

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
    validateRequired({ currentPassword, newPassword }, [
      "currentPassword",
      "newPassword",
    ]);

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const response = await api.post("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "changePassword");
  }
}

// ===========================================
// GENERIC CRUD OPERATIONS
// ===========================================

/**
 * Generic GET request with pagination support
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
 * Generic PATCH request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function patch(endpoint, data = {}) {
  try {
    const response = await api.patch(endpoint, data);
    return response.data;
  } catch (error) {
    handleAPIError(error, `PATCH ${endpoint}`);
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

// ===========================================
// SERVER OPERATIONS
// ===========================================

/**
 * Get all servers with optional pagination
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} Servers data
 */
export async function getAllServers(params = {}) {
  try {
    const response = await api.get("/api/servers", { params });
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllServers");
  }
}

/**
 * Get server by ID
 * @param {number} id - Server ID
 * @returns {Promise<Object>} Server data
 */
export async function getServerById(id) {
  try {
    const response = await api.get(`/api/servers/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getServerById");
  }
}

/**
 * Create a new server
 * @param {Object} serverData - Server configuration
 * @returns {Promise<Object>} Created server data
 */
export async function createServer(serverData) {
  try {
    validateRequired(serverData, ["name", "nodeId", "eggId"]);

    const response = await api.post("/api/servers", serverData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createServer");
  }
}

/**
 * Update server
 * @param {number} id - Server ID
 * @param {Object} serverData - Updated server data
 * @returns {Promise<Object>} Updated server data
 */
export async function updateServer(id, serverData) {
  try {
    const response = await api.put(`/api/servers/${id}`, serverData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateServer");
  }
}

/**
 * Delete server
 * @param {number} id - Server ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteServer(id) {
  try {
    const response = await api.delete(`/api/servers/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteServer");
  }
}

// ===========================================
// NODE CRUD OPERATIONS
// ===========================================

/**
 * Get all nodes with optional pagination
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} All nodes data
 */
export async function getAllNodes(params = {}) {
  try {
    const response = await api.get("/api/nodes", { params });
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
    validateRequired(nodeData, ["nodeId", "location"]);

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
// EGG CRUD OPERATIONS
// ===========================================

/**
 * Get all eggs with optional pagination
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} All eggs data
 */
export async function getAllEggs(params = {}) {
  try {
    const response = await api.get("/api/eggs", { params });
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
    validateRequired(eggData, ["eggId", "name", "img"]);

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
 * Get all users with optional pagination and filtering
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {boolean} params.include_resources - Include user resources
 * @returns {Promise<Object>} All users data
 */
export async function getAllUsers(params = {}) {
  try {
    const response = await api.get("/api/users", { params });
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllUsers");
  }
}

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStats() {
  try {
    const response = await api.get("/api/users/stats");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserStats");
  }
}

/**
 * Search users by query
 * @param {string} query - Search query
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Search results
 */
export async function searchUsers(query, params = {}) {
  try {
    const response = await api.get(
      `/api/users/search/${encodeURIComponent(query)}`,
      { params }
    );
    return response.data;
  } catch (error) {
    handleAPIError(error, "searchUsers");
  }
}

/**
 * Sync users with Pterodactyl
 * @returns {Promise<Object>} Sync results
 */
export async function syncUsers() {
  try {
    const response = await api.post("/api/users/sync");
    return response.data;
  } catch (error) {
    handleAPIError(error, "syncUsers");
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
    const response = await api.get(`/api/users/ptero/${pteroId}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserByPterodactylId");
  }
}

/**
 * Get user's servers
 * @param {number} id - Database ID of the user
 * @returns {Promise<Object>} User's servers
 */
export async function getUserServers(id) {
  try {
    const response = await api.get(`/api/users/${id}/servers`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getUserServers");
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
 * @returns {Promise<Object>} Created user data
 */
export async function createUser(userData) {
  try {
    validateRequired(userData, [
      "firstName",
      "lastName",
      "username",
      "email",
      "password",
    ]);
    validateEmail(userData.email);
    validateUsername(userData.username);

    if (userData.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const response = await api.post("/api/users", userData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createUser");
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
    if (userData.email) {
      validateEmail(userData.email);
    }
    if (userData.username) {
      validateUsername(userData.username);
    }

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
    if (userData.email) {
      validateEmail(userData.email);
    }
    if (userData.username) {
      validateUsername(userData.username);
    }

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

// ===========================================
// RESOURCES CRUD OPERATIONS (Admin Only)
// ===========================================

/**
 * Get all resources with optional pagination
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} All resources data
 */
export async function getAllResources(params = {}) {
  try {
    const response = await api.get("/api/resources", { params });
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAllResources");
  }
}

/**
 * Get single resource by ID
 * @param {number} id - Resource ID
 * @returns {Promise<Object>} Resource data
 */
export async function getResourceById(id) {
  try {
    const response = await api.get(`/api/resources/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "getResourceById");
  }
}

/**
 * Create a new resource
 * @param {Object} resourceData - Resource data
 * @param {number} resourceData.ram - RAM in MB (optional, uses env default)
 * @param {number} resourceData.disk - Disk in MB (optional, uses env default)
 * @param {number} resourceData.cpu - CPU percentage (optional, uses env default)
 * @param {number} resourceData.allocations - Number of allocations (optional, uses env default)
 * @param {number} resourceData.databases - Number of databases (optional, uses env default)
 * @param {number} resourceData.slots - Number of slots (optional, uses env default)
 * @param {number} resourceData.coins - Coins amount (optional, defaults to 0)
 * @returns {Promise<Object>} Created resource data
 */
export async function createResource(resourceData = {}) {
  try {
    // Validate numeric values if provided
    const numericFields = ['ram', 'disk', 'cpu', 'allocations', 'databases', 'slots', 'coins'];
    
    for (const field of numericFields) {
      if (resourceData[field] !== undefined) {
        const value = parseInt(resourceData[field]);
        if (isNaN(value) || value < 0) {
          throw new Error(`${field} must be a non-negative number`);
        }
        resourceData[field] = value;
      }
    }

    const response = await api.post("/api/resources", resourceData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createResource");
  }
}

/**
 * Update resource by ID (full update)
 * @param {number} id - Resource ID
 * @param {Object} resourceData - Updated resource data
 * @returns {Promise<Object>} Updated resource data
 */
export async function updateResource(id, resourceData) {
  try {
    // Validate numeric values if provided
    const numericFields = ['ram', 'disk', 'cpu', 'allocations', 'databases', 'slots', 'coins'];
    
    for (const field of numericFields) {
      if (resourceData[field] !== undefined) {
        const value = parseInt(resourceData[field]);
        if (isNaN(value) || value < 0) {
          throw new Error(`${field} must be a non-negative number`);
        }
        resourceData[field] = value;
      }
    }

    const response = await api.put(`/api/resources/${id}`, resourceData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "updateResource");
  }
}

/**
 * Partially update resource by ID
 * @param {number} id - Resource ID
 * @param {Object} resourceData - Partial resource data to update
 * @returns {Promise<Object>} Updated resource data
 */
export async function patchResource(id, resourceData) {
  try {
    // Validate numeric values if provided
    const numericFields = ['ram', 'disk', 'cpu', 'allocations', 'databases', 'slots', 'coins'];
    
    for (const field of numericFields) {
      if (resourceData[field] !== undefined) {
        const value = parseInt(resourceData[field]);
        if (isNaN(value) || value < 0) {
          throw new Error(`${field} must be a non-negative number`);
        }
        resourceData[field] = value;
      }
    }

    const response = await api.patch(`/api/resources/${id}`, resourceData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "patchResource");
  }
}

/**
 * Delete resource by ID
 * @param {number} id - Resource ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteResource(id) {
  try {
    const response = await api.delete(`/api/resources/${id}`);
    return response.data;
  } catch (error) {
    handleAPIError(error, "deleteResource");
  }
}

/**
 * Get resource statistics summary
 * @returns {Promise<Object>} Resource statistics including totals and averages
 */
export async function getResourceStats() {
  try {
    const response = await api.get("/api/resources/stats/summary");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getResourceStats");
  }
}

/**
 * Bulk create resources
 * @param {Array<Object>} resourcesArray - Array of resource objects to create
 * @returns {Promise<Object>} Bulk creation results
 */
export async function bulkCreateResources(resourcesArray) {
  try {
    if (!Array.isArray(resourcesArray) || resourcesArray.length === 0) {
      throw new Error("Resources array must be a non-empty array");
    }

    // Validate each resource object
    const numericFields = ['ram', 'disk', 'cpu', 'allocations', 'databases', 'slots', 'coins'];
    
    const validatedResources = resourcesArray.map((resourceData, index) => {
      const validated = { ...resourceData };
      
      for (const field of numericFields) {
        if (validated[field] !== undefined) {
          const value = parseInt(validated[field]);
          if (isNaN(value) || value < 0) {
            throw new Error(`Resource ${index + 1}: ${field} must be a non-negative number`);
          }
          validated[field] = value;
        }
      }
      
      return validated;
    });

    const response = await api.post("/api/resources/bulk", {
      resources: validatedResources
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "bulkCreateResources");
  }
}

/**
 * Get resource templates (common resource configurations)
 * @returns {Promise<Object>} Available resource templates
 */
export async function getResourceTemplates() {
  try {
    const response = await api.get("/api/resources/templates");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getResourceTemplates");
  }
}

/**
 * Create resource from template
 * @param {string} templateName - Name of the template to use
 * @param {Object} overrides - Optional field overrides
 * @returns {Promise<Object>} Created resource data
 */
export async function createResourceFromTemplate(templateName, overrides = {}) {
  try {
    validateRequired({ templateName }, ["templateName"]);

    const response = await api.post(`/api/resources/templates/${templateName}`, overrides);
    return response.data;
  } catch (error) {
    handleAPIError(error, "createResourceFromTemplate");
  }
}

/**
 * Validate resource allocation
 * @param {Object} resourceData - Resource data to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateResourceAllocation(resourceData) {
  try {
    const response = await api.post("/api/resources/validate", resourceData);
    return response.data;
  } catch (error) {
    handleAPIError(error, "validateResourceAllocation");
  }
}

/**
 * Get resource usage analytics
 * @param {Object} params - Query parameters
 * @param {string} params.period - Time period ('day', 'week', 'month', 'year')
 * @param {number} params.limit - Number of records to return
 * @returns {Promise<Object>} Resource usage analytics
 */
export async function getResourceAnalytics(params = {}) {
  try {
    const response = await api.get("/api/resources/analytics", { params });
    return response.data;
  } catch (error) {
    handleAPIError(error, "getResourceAnalytics");
  }
}

/**
 * Export resources data
 * @param {Object} params - Export parameters
 * @param {string} params.format - Export format ('csv', 'json', 'xlsx')
 * @param {Array<string>} params.fields - Fields to include in export
 * @returns {Promise<Blob>} Export file data
 */
export async function exportResources(params = {}) {
  try {
    const response = await api.get("/api/resources/export", {
      params,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "exportResources");
  }
}

/**
 * Import resources from file
 * @param {File} file - File to import
 * @param {Object} options - Import options
 * @param {boolean} options.skipDuplicates - Skip duplicate resources
 * @param {boolean} options.updateExisting - Update existing resources
 * @returns {Promise<Object>} Import results
 */
export async function importResources(file, options = {}) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await api.post("/api/resources/import", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    handleAPIError(error, "importResources");
  }
}// ===========================================
// ADMIN OPERATIONS
// ===========================================

/**
 * Get admin dashboard statistics
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getAdminStats() {
  try {
    const response = await api.get("/api/admin/stats");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getAdminStats");
  }
}

/**
 * Get system health status
 * @returns {Promise<Object>} System health data
 */
export async function getSystemHealth() {
  try {
    const response = await api.get("/api/admin/health");
    return response.data;
  } catch (error) {
    handleAPIError(error, "getSystemHealth");
  }
}

// Export the API instance for direct use if needed
export { api, APIError };

// Export common HTTP status codes for error handling
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Export validation helpers for use in components
export const validators = {
  validateRequired,
  validateEmail,
  validateUsername,
};

// Export utility functions
export const utils = {
  retryRequest,
};
