import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Navigate, useLocation, Link } from "react-router-dom";
import { config } from "@/components/api.js";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
  AtSign,
} from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState("/vite.svg");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const { register, isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect if already logged in
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Validation functions
  const validationRules = {
    firstName: (value) => {
      if (!value?.trim()) return "First name is required";
      if (value.trim().length < 2) return "First name must be at least 2 characters";
      if (!/^[a-zA-Z\s]+$/.test(value.trim())) return "First name can only contain letters";
      return "";
    },
    lastName: (value) => {
      if (!value?.trim()) return "Last name is required";
      if (value.trim().length < 2) return "Last name must be at least 2 characters";
      if (!/^[a-zA-Z\s]+$/.test(value.trim())) return "Last name can only contain letters";
      return "";
    },
    email: (value) => {
      if (!value?.trim()) return "Email is required";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return "Please enter a valid email address";
      return "";
    },
    username: (value) => {
      if (!value?.trim()) return "Username is required";
      if (value.length < 3) return "Username must be at least 3 characters";
      if (value.length > 20) return "Username must be less than 20 characters";
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Username can only contain letters, numbers, and underscores";
      return "";
    },
    password: (value) => {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return "Password must contain uppercase, lowercase, and number";
      return "";
    },
    confirmPassword: (value, formData) => {
      if (!value) return "Please confirm your password";
      if (value !== formData.password) return "Passwords do not match";
      return "";
    },
  };

  // Debounced validation
  const validateField = useCallback((fieldName, value) => {
    const error = validationRules[fieldName](value, formData);
    setFormErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    return error;
  }, [formData]);

  // Handle input changes
  const handleInputChange = (fieldName, value) => {
    // Special handling for username (lowercase)
    if (fieldName === 'username') {
      value = value.toLowerCase();
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Validate field
    validateField(fieldName, value);
    
    // Special case: revalidate confirmPassword when password changes
    if (fieldName === 'password' && formData.confirmPassword) {
      validateField('confirmPassword', formData.confirmPassword);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const errors = {};
    Object.keys(validationRules).forEach(fieldName => {
      const error = validationRules[fieldName](formData[fieldName], formData);
      if (error) errors[fieldName] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Create a more user-friendly error message
      const missingFields = Object.keys(errors).map(field => {
        switch(field) {
          case 'firstName': return 'first name';
          case 'lastName': return 'last name';
          case 'email': return 'email';
          case 'username': return 'username';
          case 'password': return 'password';
          case 'confirmPassword': return 'password confirmation';
          default: return field;
        }
      });
      setError(`Please complete the following fields: ${missingFields.join(', ')}`);
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await register({
        firstname: formData.firstName,
        lastname: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (!result.success) {
        setError(result.error || "Registration failed. Please try again.");
      }
      // If successful, AuthProvider should handle redirect
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load config for logo
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setConfigLoading(true);
        const { app_icon } = await config();
        setLogo(app_icon);
      } catch (error) {
        console.error("Failed to load config:", error);
        // Keep default logo
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const isFormValid = () => {
    return (
      Object.values(formData).every(value => value?.trim()) &&
      Object.values(formErrors).every(error => !error) &&
      acceptTerms
    );
  };

  // Input field component for DRY principle
  const InputField = ({ 
    id, 
    label, 
    type = "text", 
    icon: Icon, 
    placeholder, 
    value,
    onChange,
    error,
    showToggle = false,
    show = false,
    onToggleShow,
    className = ""
  }) => (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id={id}
          type={showToggle ? (show ? "text" : "password") : type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full pl-10 ${showToggle ? 'pr-10' : 'pr-3'} py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
            error
              ? "border-red-500 focus:ring-red-500"
              : value && !error
              ? "border-green-500 focus:ring-green-500"
              : "border-gray-600 focus:ring-blue-500"
          } ${className}`}
          placeholder={placeholder}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
        {value && !error && !showToggle && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {configLoading ? (
              <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <img
                src={logo}
                alt="Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl shadow-xl"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Create Account
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Sign up to get started with your account
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Alert */}
            {error && (
              <div
                className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-start gap-3"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Name Fields Row */}
            <div className="grid grid-cols-2 gap-4">
              <InputField
                id="firstName"
                label="First Name"
                icon={User}
                placeholder="John"
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                error={formErrors.firstName}
                className="text-sm py-2.5"
              />
              <InputField
                id="lastName"
                label="Last Name"
                icon={User}
                placeholder="Doe"
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                error={formErrors.lastName}
                className="text-sm py-2.5"
              />
            </div>

            {/* Email Field */}
            <InputField
              id="email"
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="Enter your email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              error={formErrors.email}
            />

            {/* Username Field */}
            <InputField
              id="username"
              label="Username"
              icon={AtSign}
              placeholder="Choose a unique username"
              value={formData.username}
              onChange={(value) => handleInputChange('username', value)}
              error={formErrors.username}
            />

            {/* Password Field */}
            <InputField
              id="password"
              label="Password"
              icon={Lock}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(value) => handleInputChange('password', value)}
              error={formErrors.password}
              showToggle={true}
              show={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
            />

            {/* Confirm Password Field */}
            <InputField
              id="confirmPassword"
              label="Confirm Password"
              icon={Lock}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(value) => handleInputChange('confirmPassword', value)}
              error={formErrors.confirmPassword}
              showToggle={true}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
              />
              <label
                htmlFor="acceptTerms"
                className="ml-2 text-sm text-gray-300"
              >
                I agree to the{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-300 transition-colors underline"
                  onClick={() => window.open('/terms', '_blank')}
                >
                  Terms and Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-300 transition-colors underline"
                  onClick={() => window.open('/privacy', '_blank')}
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-xs text-center text-gray-100">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="text-blue-400 hover:text-blue-300 transition-colors underline"
              >
                Sign In
              </Link>
            </p>
          </form>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Nexodactyl made with 💖 by xenovate-foss
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;