import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";

const AuthContext = createContext();

// Auth error types
const AUTH_ERRORS = {
  NETWORK_ERROR: "network_error",
  INVALID_CREDENTIALS: "invalid_credentials",
  TOKEN_EXPIRED: "token_expired",
  VALIDATION_ERROR: "validation_error",
  SERVER_ERROR: "server_error",
};

// Cookie utility functions
const cookieUtils = {
  // Set cookie with security options
  set: (name, value, options = {}) => {
    const defaultOptions = {
      path: "/",
      secure: window.location.protocol === "https:",
      sameSite: "Strict",
      ...options,
    };

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    Object.entries(defaultOptions).forEach(([key, val]) => {
      if (val === true) {
        cookieString += `; ${key}`;
      } else if (val !== false && val !== null && val !== undefined) {
        cookieString += `; ${key}=${val}`;
      }
    });

    document.cookie = cookieString;
  },

  // Get cookie value by name
  get: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(";").shift());
    }
    return null;
  },

  // Remove cookie
  remove: (name, options = {}) => {
    const defaultOptions = {
      path: "/",
      ...options,
    };

    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    Object.entries(defaultOptions).forEach(([key, val]) => {
      if (val === true) {
        cookieString += `; ${key}`;
      } else if (val !== false && val !== null && val !== undefined) {
        cookieString += `; ${key}=${val}`;
      }
    });

    document.cookie = cookieString;
  },

  // Check if cookie exists
  exists: (name) => {
    return cookieUtils.get(name) !== null;
  },
};

// Create axios instance with base configuration for Vite proxy
const api = axios.create({
  baseURL: "", // Empty since Vite proxy handles /api/ routing
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important: allows cookies to be sent with requests
});

let responseInterceptorRef = null;

// Request interceptor - cookies are automatically sent, but we can add CSRF token if needed
api.interceptors.request.use(
  (config) => {
    // If you need to send CSRF token from cookie
    const csrfToken = cookieUtils.get("csrf_token");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
responseInterceptorRef = api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Token expired or invalid, clear cookies and redirect
      cookieUtils.remove("auth_token");
      cookieUtils.remove("user_data");
      cookieUtils.remove("csrf_token");

      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    login: false,
    register: false,
    profile: false,
    validation: false,
    initial: true,
  });

  const isValidatingRef = useRef(false);
  const mountedRef = useRef(true);

  // Helper to update loading states
  const updateLoadingState = useCallback((key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Validate token and get user data
  const validateToken = useCallback(async () => {
    if (isValidatingRef.current) return;

    // Check if auth token cookie exists
    const hasAuthToken = cookieUtils.exists("auth_token");
    if (!hasAuthToken) {
      updateLoadingState("initial", false);
      return;
    }

    isValidatingRef.current = true;
    updateLoadingState("validation", true);

    try {
      const response = await api.get("/api/auth/me");
      if (response.data.success && mountedRef.current) {
        setUser(response.data.user);
        // Store user data in cookie for quick access (optional)
        cookieUtils.set("user_data", JSON.stringify(response.data.user), {
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      } else {
        // Invalid token, clear cookies
        cookieUtils.remove("auth_token");
        cookieUtils.remove("user_data");
        cookieUtils.remove("csrf_token");
        if (mountedRef.current) setUser(null);
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      cookieUtils.remove("auth_token");
      cookieUtils.remove("user_data");
      cookieUtils.remove("csrf_token");
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) {
        updateLoadingState("validation", false);
        updateLoadingState("initial", false);
      }
      isValidatingRef.current = false;
    }
  }, [updateLoadingState]);

  // Initialize auth state from cookies
  useEffect(() => {
    // Check for existing user data in cookie first (for quick loading)
    const userData = cookieUtils.get("user_data");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data from cookie:", error);
        cookieUtils.remove("user_data");
      }
    }

    // Then validate with server
    validateToken();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (responseInterceptorRef) {
        api.interceptors.response.eject(responseInterceptorRef);
      }
    };
  }, [validateToken]);

  // Enhanced error handling
  const handleApiError = useCallback(
    (error, defaultMessage = "An error occurred") => {
      let errorType = AUTH_ERRORS.SERVER_ERROR;
      let errorMessage = defaultMessage;

      if (!error.response) {
        errorType = AUTH_ERRORS.NETWORK_ERROR;
        errorMessage = "Network error. Please check your connection.";
      } else {
        switch (error.response.status) {
          case 400:
            errorType = AUTH_ERRORS.VALIDATION_ERROR;
            errorMessage =
              error.response.data?.error || "Invalid input provided";
            break;
          case 401:
            errorType = AUTH_ERRORS.INVALID_CREDENTIALS;
            errorMessage = error.response.data?.error || "Invalid credentials";
            break;
          case 500:
            errorType = AUTH_ERRORS.SERVER_ERROR;
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage =
              error.response.data?.error || error.message || defaultMessage;
        }
      }

      console.error(`Auth error (${errorType}):`, error);
      return { type: errorType, message: errorMessage };
    },
    []
  );

  // Login function
  const login = async (email, password) => {
    updateLoadingState("login", true);
    setError(null);

    try {
      // Input validation
      if (!email?.trim() || !password?.trim()) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Please provide email and password",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Please provide a valid email address",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        const { user: userData } = response.data;

        // Note: Server should set httpOnly auth cookie automatically
        // We only store user data for quick access
        cookieUtils.set("user_data", JSON.stringify(userData), {
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Store CSRF token if provided
        if (response.data.csrfToken) {
          cookieUtils.set("csrf_token", response.data.csrfToken, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });
        }

        setUser(userData);
        setError(null);

        // Redirect to home page after successful login
        window.location.href = "/";

        return { success: true, user: userData };
      } else {
        const error = {
          type: AUTH_ERRORS.INVALID_CREDENTIALS,
          message: response.data.error || "Login failed",
        };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Login failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState("login", false);
    }
  };

  // Register function
  const register = async (formData) => {
    updateLoadingState("register", true);
    setError(null);

    try {
      const {
        firstname,
        lastname,
        username,
        email,
        password,
        confirmPassword,
      } = formData;

      // Input validation
      const requiredFields = { firstname, lastname, username, email, password };
      const emptyFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value?.trim())
        .map(([key]) => key);

      if (emptyFields.length > 0) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: `Please fill in all required fields: ${emptyFields.join(
            ", "
          )}`,
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Please provide a valid email address",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Password validation
      if (password !== confirmPassword) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Passwords do not match",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      if (password.length < 8) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Password must be at least 8 characters long",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Username validation
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message:
            "Username can only contain letters, numbers, and underscores",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.post("/api/auth/register", {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        const { user: userData } = response.data;

        // Note: Server should set httpOnly auth cookie automatically
        // We only store user data for quick access
        cookieUtils.set("user_data", JSON.stringify(userData), {
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Store CSRF token if provided
        if (response.data.csrfToken) {
          cookieUtils.set("csrf_token", response.data.csrfToken, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });
        }

        setUser(userData);
        setError(null);

        // Redirect to home page after successful registration
        window.location.href = "/";

        return { success: true, user: userData };
      } else {
        const error = {
          type: AUTH_ERRORS.SERVER_ERROR,
          message: response.data.error || "Registration failed",
        };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Registration failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState("register", false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint to invalidate server-side session
      await api.post("/api/auth/logout").catch(() => {
        // Ignore errors on logout endpoint
      });
    } finally {
      // Clear all auth-related cookies
      cookieUtils.remove("auth_token");
      cookieUtils.remove("user_data");
      cookieUtils.remove("csrf_token");

      setUser(null);
      setError(null);

      // Redirect to login page after logout
      window.location.href = "/auth/login";
    }
  }, []);

  // Update user profile
  const updateProfile = async (profileData) => {
    updateLoadingState("profile", true);
    setError(null);

    try {
      // Basic validation
      if (!profileData || typeof profileData !== "object") {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Invalid profile data",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.put("/api/auth/profile", profileData);

      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        cookieUtils.set("user_data", JSON.stringify(updatedUser), {
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        return { success: true, user: updatedUser };
      } else {
        const error = {
          type: AUTH_ERRORS.SERVER_ERROR,
          message: response.data.error || "Profile update failed",
        };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Profile update failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState("profile", false);
    }
  };

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get("/api/auth/me");
      if (response.data.success && mountedRef.current) {
        setUser(response.data.user);
        cookieUtils.set("user_data", JSON.stringify(response.data.user), {
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        return { success: true, user: response.data.user };
      }
      return { success: false, error: "Failed to refresh user data" };
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      return { success: false, error: "Failed to refresh user data" };
    }
  }, [user]);

  // Change password function
  const changePassword = async (
    currentPassword,
    newPassword,
    confirmNewPassword
  ) => {
    updateLoadingState("profile", true);
    setError(null);

    try {
      // Validation
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "Please fill in all password fields",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      if (newPassword !== confirmNewPassword) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "New passwords do not match",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      if (newPassword.length < 8) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: "New password must be at least 8 characters long",
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.put("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        return { success: true, message: "Password changed successfully" };
      } else {
        const error = {
          type: AUTH_ERRORS.SERVER_ERROR,
          message: response.data.error || "Password change failed",
        };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Password change failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState("profile", false);
    }
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if any operation is loading
  const isLoading = Object.values(loadingStates).some(Boolean);

  const value = {
    user,
    error,
    isAuthenticated: !!user,
    isLoading,
    loadingStates,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
    api, // Expose configured axios instance for other components
    AUTH_ERRORS, // Expose error types for components
    cookieUtils, // Expose cookie utilities for components that need them
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
