import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
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
  CONFLICT_ERROR: "conflict_error",
};

// Cookie utility functions (only for non-httpOnly cookies)
const cookieUtils = {
  // Set cookie with security options
  set: (name, value, options = {}) => {
    // Don't try to set httpOnly cookies from client-side
    if (name === "auth_token") {
      console.warn("Cannot set httpOnly auth_token from client-side");
      return;
    }

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

  // Get cookie value by name (works for both httpOnly and regular cookies in some cases)
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

  // Check if cookie exists (limited for httpOnly cookies)
  exists: (name) => {
    return cookieUtils.get(name) !== null;
  },
};

// Create axios instance with base configuration
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: "", // Empty since Vite proxy handles /api/ routing
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // Important: allows cookies to be sent with requests
  });

  return instance;
};

// Input validation helpers
const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email?.trim());
  },

  password: (password) => {
    return password && password.length >= 8;
  },

  username: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username?.trim());
  },

  required: (value) => {
    return value && value.toString().trim().length > 0;
  },

  name: (name) => {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name?.trim());
  },
};

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

  // Refs for managing component lifecycle and preventing race conditions
  const isValidatingRef = useRef(false);
  const mountedRef = useRef(true);
  const apiRef = useRef(null);
  const interceptorRef = useRef(null);

  // Initialize API instance
  useEffect(() => {
    apiRef.current = createApiInstance();

    // Request interceptor for CSRF token
    apiRef.current.interceptors.request.use(
      (config) => {
        const csrfToken = cookieUtils.get("csrf_token");
        if (csrfToken) {
          config.headers["X-CSRF-Token"] = csrfToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    interceptorRef.current = apiRef.current.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Clear client-side stored data
          cookieUtils.remove("user_data");
          cookieUtils.remove("csrf_token");

          if (mountedRef.current) {
            setUser(null);
            setError({
              type: AUTH_ERRORS.TOKEN_EXPIRED,
              message: "Your session has expired. Please log in again.",
            });
          }

          // Redirect to login
          /*setTimeout(() => {
            window.location.href = "/auth/login";
          }, 1000);*/
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current) {
        apiRef.current.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, []);

  // Helper to update loading states
  const updateLoadingState = useCallback((key, value) => {
    if (mountedRef.current) {
      setLoadingStates((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  // Enhanced error handling
  const handleApiError = useCallback(
    (error, defaultMessage = "An error occurred") => {
      let errorType = AUTH_ERRORS.SERVER_ERROR;
      let errorMessage = defaultMessage;

      if (!error.response) {
        errorType = AUTH_ERRORS.NETWORK_ERROR;
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else {
        const { status, data } = error.response;
        switch (status) {
          case 400:
            errorType = AUTH_ERRORS.VALIDATION_ERROR;
            errorMessage = data?.error || "Invalid input provided";
            break;
          case 401:
            errorType = AUTH_ERRORS.INVALID_CREDENTIALS;
            errorMessage = data?.error || "Invalid credentials";
            break;
          case 409:
            errorType = AUTH_ERRORS.CONFLICT_ERROR;
            errorMessage = data?.error || "Resource already exists";
            break;
          case 429:
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
            break;
          case 500:
          case 502:
          case 503:
            errorType = AUTH_ERRORS.SERVER_ERROR;
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage = data?.error || error.message || defaultMessage;
        }
      }

      console.error(`Auth error (${errorType}):`, error);
      return {
        type: errorType,
        message: errorMessage,
        status: error.response?.status,
      };
    },
    []
  );

  // Validate token and get user data
  const validateToken = useCallback(async () => {
    if (isValidatingRef.current || !apiRef.current) return;

    isValidatingRef.current = true;
    updateLoadingState("validation", true);

    try {
      const response = await apiRef.current.get("/api/auth/me");

      if (response.data.success && mountedRef.current) {
        const userData = response.data.user;
        setUser(userData);

        // Store user data in cookie for quick access (non-sensitive data only)
        cookieUtils.set(
          "user_data",
          JSON.stringify({
            id: userData.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            email: userData.email,
          }),
          {
            maxAge: 24 * 60 * 60, // 24 hours to match JWT expiry
          }
        );
      } else {
        cookieUtils.remove("user_data");
        if (mountedRef.current) setUser(null);
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      cookieUtils.remove("user_data");
      if (mountedRef.current) {
        setUser(null);
        // Only set error if it's not a 401 (handled by interceptor)
        if (error.response?.status !== 401) {
          const authError = handleApiError(error, "Session validation failed");
          setError(authError);
        }
      }
    } finally {
      if (mountedRef.current) {
        updateLoadingState("validation", false);
        updateLoadingState("initial", false);
      }
      isValidatingRef.current = false;
    }
  }, [updateLoadingState, handleApiError]);

  // Initialize auth state
  useEffect(() => {
    // Quick load from stored user data
    const userData = cookieUtils.get("user_data");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (mountedRef.current) {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        cookieUtils.remove("user_data");
      }
    }

    // Validate with server
    validateToken();

    // Cleanup function
    return () => {
      mountedRef.current = false;
    };
  }, [validateToken]);

  // Enhanced validation helper
  const validateForm = useCallback((data, rules) => {
    const errors = [];

    Object.entries(rules).forEach(([field, validationRules]) => {
      const value = data[field];

      validationRules.forEach((rule) => {
        if (typeof rule === "string") {
          // Simple required check
          if (rule === "required" && !validators.required(value)) {
            errors.push(`${field} is required`);
          }
        } else if (typeof rule === "object") {
          // Custom validation rule
          if (!rule.validator(value)) {
            errors.push(rule.message || `${field} is invalid`);
          }
        }
      });
    });

    return errors;
  }, []);

  // Login function
  const login = async (email, password) => {
    if (!apiRef.current)
      return { success: false, error: "API not initialized" };

    updateLoadingState("login", true);
    setError(null);

    try {
      // Enhanced validation
      const validationErrors = validateForm(
        { email, password },
        {
          email: [
            "required",
            {
              validator: validators.email,
              message: "Please provide a valid email address",
            },
          ],
          password: [
            "required",
            {
              validator: validators.password,
              message: "Password must be at least 8 characters long",
            },
          ],
        }
      );

      if (validationErrors.length > 0) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: validationErrors[0],
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await apiRef.current.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        const { user: userData } = response.data;

        // Store non-sensitive user data
        cookieUtils.set(
          "user_data",
          JSON.stringify({
            id: userData.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            email: userData.email,
          }),
          {
            maxAge: 24 * 60 * 60, // 24 hours
          }
        );

        // Store CSRF token if provided
        if (response.data.csrfToken) {
          cookieUtils.set("csrf_token", response.data.csrfToken, {
            maxAge: 24 * 60 * 60, // 24 hours
          });
        }

        setUser(userData);
        setError(null);

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
    if (!apiRef.current)
      return { success: false, error: "API not initialized" };

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

      // Enhanced validation
      const validationErrors = validateForm(formData, {
        firstname: [
          "required",
          {
            validator: validators.name,
            message:
              "First name must be 2-50 characters and contain only letters",
          },
        ],
        lastname: [
          "required",
          {
            validator: validators.name,
            message:
              "Last name must be 2-50 characters and contain only letters",
          },
        ],
        username: [
          "required",
          {
            validator: validators.username,
            message:
              "Username must be 3-20 characters and contain only letters, numbers, and underscores",
          },
        ],
        email: [
          "required",
          {
            validator: validators.email,
            message: "Please provide a valid email address",
          },
        ],
        password: [
          "required",
          {
            validator: validators.password,
            message: "Password must be at least 8 characters long",
          },
        ],
      });

      // Password confirmation check
      if (password !== confirmPassword) {
        validationErrors.push("Passwords do not match");
      }

      if (validationErrors.length > 0) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: validationErrors[0],
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await apiRef.current.post("/api/auth/register", {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        const { user: userData } = response.data;

        // Store non-sensitive user data
        cookieUtils.set(
          "user_data",
          JSON.stringify({
            id: userData.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            email: userData.email,
          }),
          {
            maxAge: 24 * 60 * 60, // 24 hours
          }
        );

        // Store CSRF token if provided
        if (response.data.csrfToken) {
          cookieUtils.set("csrf_token", response.data.csrfToken, {
            maxAge: 24 * 60 * 60, // 24 hours
          });
        }

        setUser(userData);
        setError(null);

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
      if (apiRef.current) {
        await apiRef.current.post("/api/auth/logout").catch(() => {
          // Ignore errors on logout endpoint
        });
      }
    } finally {
      // Clear client-side data
      cookieUtils.remove("user_data");
      cookieUtils.remove("csrf_token");

      if (mountedRef.current) {
        setUser(null);
        setError(null);
      }
    }
  }, []);

  // Update user profile
  const updateProfile = async (profileData) => {
    if (!apiRef.current)
      return { success: false, error: "API not initialized" };

    updateLoadingState("profile", true);
    setError(null);

    try {
      const response = await apiRef.current.put(
        "/api/auth/profile",
        profileData
      );

      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);

        cookieUtils.set(
          "user_data",
          JSON.stringify({
            id: updatedUser.id,
            firstname: updatedUser.firstname,
            lastname: updatedUser.lastname,
            username: updatedUser.username,
            email: updatedUser.email,
          }),
          {
            maxAge: 24 * 60 * 60, // 24 hours
          }
        );

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
    if (!user || !apiRef.current)
      return { success: false, error: "No user or API not ready" };

    try {
      const response = await apiRef.current.get("/api/auth/me");
      if (response.data.success && mountedRef.current) {
        const userData = response.data.user;
        setUser(userData);

        cookieUtils.set(
          "user_data",
          JSON.stringify({
            id: userData.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            email: userData.email,
          }),
          {
            maxAge: 24 * 60 * 60, // 24 hours
          }
        );

        return { success: true, user: userData };
      }
      return { success: false, error: "Failed to refresh user data" };
    } catch (error) {
      const authError = handleApiError(error, "Failed to refresh user data");
      return { success: false, error: authError.message };
    }
  }, [user, handleApiError]);

  // Change password function
  const changePassword = async (
    currentPassword,
    newPassword,
    confirmNewPassword
  ) => {
    if (!apiRef.current)
      return { success: false, error: "API not initialized" };

    updateLoadingState("profile", true);
    setError(null);

    try {
      // Validation
      const validationErrors = validateForm(
        {
          currentPassword,
          newPassword,
          confirmNewPassword,
        },
        {
          currentPassword: ["required"],
          newPassword: [
            "required",
            {
              validator: validators.password,
              message: "New password must be at least 8 characters long",
            },
          ],
          confirmNewPassword: ["required"],
        }
      );

      if (newPassword !== confirmNewPassword) {
        validationErrors.push("New passwords do not match");
      }

      if (validationErrors.length > 0) {
        const error = {
          type: AUTH_ERRORS.VALIDATION_ERROR,
          message: validationErrors[0],
        };
        setError(error);
        return { success: false, error: error.message };
      }

      const response = await apiRef.current.put("/api/auth/change-password", {
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
    if (mountedRef.current) {
      setError(null);
    }
  }, []);

  // Memoized computed values
  const computedValues = useMemo(
    () => ({
      isAuthenticated: !!user,
      isLoading: Object.values(loadingStates).some(Boolean),
      hasError: !!error,
    }),
    [user, loadingStates, error]
  );

  // Context value
  const value = useMemo(
    () => ({
      // State
      user,
      error,
      loadingStates,

      // Computed values
      ...computedValues,

      // Methods
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
      clearError,

      // Utilities
      api: apiRef.current,
      AUTH_ERRORS,
      cookieUtils,
      validators,
    }),
    [
      user,
      error,
      loadingStates,
      computedValues,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
