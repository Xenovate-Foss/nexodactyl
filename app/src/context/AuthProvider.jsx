import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const AuthContext = createContext();

// Auth error types
const AUTH_ERRORS = {
  NETWORK_ERROR: 'network_error',
  INVALID_CREDENTIALS: 'invalid_credentials',
  TOKEN_EXPIRED: 'token_expired',
  VALIDATION_ERROR: 'validation_error',
  SERVER_ERROR: 'server_error'
};

// Create axios instance with base configuration for Vite proxy
const api = axios.create({
  baseURL: '', // Empty since Vite proxy handles /api/ routing
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

let responseInterceptorRef = null;

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      
      // Try to refresh token first
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          if (response.data.success) {
            const newToken = response.data.token;
            localStorage.setItem("authToken", newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }
      }
      
      // If refresh fails or no refresh token, logout
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
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
    initial: true
  });
  
  const isValidatingRef = useRef(false);
  const mountedRef = useRef(true);

  // Helper to update loading states
  const updateLoadingState = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  // Validate token and get user data
  const validateToken = useCallback(async () => {
    if (isValidatingRef.current) return;
    
    const token = localStorage.getItem("authToken");
    if (!token) {
      updateLoadingState('initial', false);
      return;
    }

    isValidatingRef.current = true;
    updateLoadingState('validation', true);

    try {
      const response = await api.get("/api/auth/me");
      if (response.data.success && mountedRef.current) {
        setUser(response.data.user);
        localStorage.setItem("userData", JSON.stringify(response.data.user));
      } else {
        // Invalid token
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userData");
        if (mountedRef.current) setUser(null);
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) {
        updateLoadingState('validation', false);
        updateLoadingState('initial', false);
      }
      isValidatingRef.current = false;
    }
  }, [updateLoadingState]);

  // Check authentication status on app start
  useEffect(() => {
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
  const handleApiError = useCallback((error, defaultMessage = "An error occurred") => {
    let errorType = AUTH_ERRORS.SERVER_ERROR;
    let errorMessage = defaultMessage;

    if (!error.response) {
      errorType = AUTH_ERRORS.NETWORK_ERROR;
      errorMessage = "Network error. Please check your connection.";
    } else {
      switch (error.response.status) {
        case 400:
          errorType = AUTH_ERRORS.VALIDATION_ERROR;
          errorMessage = error.response.data?.error || "Invalid input provided";
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
          errorMessage = error.response.data?.error || error.message || defaultMessage;
      }
    }

    console.error(`Auth error (${errorType}):`, error);
    return { type: errorType, message: errorMessage };
  }, []);

  // Login function
  const login = async (email, password) => {
    updateLoadingState('login', true);
    setError(null);

    try {
      // Input validation
      if (!email?.trim() || !password?.trim()) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Please provide email and password" };
        setError(error);
        return { success: false, error: error.message };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Please provide a valid email address" };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        const { token, refreshToken, user: userData } = response.data;

        // Store authentication data
        localStorage.setItem("authToken", token);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("userData", JSON.stringify(userData));
        
        setUser(userData);
        setError(null);

        return { success: true, user: userData };
      } else {
        const error = { type: AUTH_ERRORS.INVALID_CREDENTIALS, message: response.data.error || "Login failed" };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Login failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState('login', false);
    }
  };

  // Register function
  const register = async (formData) => {
    updateLoadingState('register', true);
    setError(null);

    try {
      const { firstname, lastname, username, email, password, confirmPassword } = formData;

      // Input validation
      const requiredFields = { firstname, lastname, username, email, password };
      const emptyFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value?.trim())
        .map(([key]) => key);

      if (emptyFields.length > 0) {
        const error = { 
          type: AUTH_ERRORS.VALIDATION_ERROR, 
          message: `Please fill in all required fields: ${emptyFields.join(', ')}` 
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Please provide a valid email address" };
        setError(error);
        return { success: false, error: error.message };
      }

      // Password validation
      if (password !== confirmPassword) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Passwords do not match" };
        setError(error);
        return { success: false, error: error.message };
      }

      if (password.length < 8) {
        const error = { 
          type: AUTH_ERRORS.VALIDATION_ERROR, 
          message: "Password must be at least 8 characters long" 
        };
        setError(error);
        return { success: false, error: error.message };
      }

      // Username validation
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        const error = { 
          type: AUTH_ERRORS.VALIDATION_ERROR, 
          message: "Username can only contain letters, numbers, and underscores" 
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
        const { token, refreshToken, user: userData } = response.data;

        // Store authentication data
        localStorage.setItem("authToken", token);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("userData", JSON.stringify(userData));
        
        setUser(userData);
        setError(null);

        return { success: true, user: userData };
      } else {
        const error = { type: AUTH_ERRORS.SERVER_ERROR, message: response.data.error || "Registration failed" };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Registration failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState('register', false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Optional: Call backend logout endpoint for token blacklisting
      await api.post("/api/auth/logout").catch(() => {
        // Ignore errors on logout endpoint
      });
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      setUser(null);
      setError(null);
    }
  }, []);

  // Update user profile
  const updateProfile = async (profileData) => {
    updateLoadingState('profile', true);
    setError(null);

    try {
      // Basic validation
      if (!profileData || typeof profileData !== 'object') {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Invalid profile data" };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.put("/api/auth/profile", profileData);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        localStorage.setItem("userData", JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      } else {
        const error = { type: AUTH_ERRORS.SERVER_ERROR, message: response.data.error || "Profile update failed" };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Profile update failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState('profile', false);
    }
  };

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get("/api/auth/me");
      if (response.data.success && mountedRef.current) {
        setUser(response.data.user);
        localStorage.setItem("userData", JSON.stringify(response.data.user));
        return { success: true, user: response.data.user };
      }
      return { success: false, error: "Failed to refresh user data" };
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      return { success: false, error: "Failed to refresh user data" };
    }
  }, [user]);

  // Change password function
  const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
    updateLoadingState('profile', true);
    setError(null);

    try {
      // Validation
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "Please fill in all password fields" };
        setError(error);
        return { success: false, error: error.message };
      }

      if (newPassword !== confirmNewPassword) {
        const error = { type: AUTH_ERRORS.VALIDATION_ERROR, message: "New passwords do not match" };
        setError(error);
        return { success: false, error: error.message };
      }

      if (newPassword.length < 8) {
        const error = { 
          type: AUTH_ERRORS.VALIDATION_ERROR, 
          message: "New password must be at least 8 characters long" 
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await api.put("/api/auth/change-password", {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        return { success: true, message: "Password changed successfully" };
      } else {
        const error = { type: AUTH_ERRORS.SERVER_ERROR, message: response.data.error || "Password change failed" };
        setError(error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const authError = handleApiError(error, "Password change failed");
      setError(authError);
      return { success: false, error: authError.message };
    } finally {
      updateLoadingState('profile', false);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};