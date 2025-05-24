import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Navigate, useLocation, Link } from "react-router-dom";
import { config } from "@/components/api";
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
import TurnstileWidget from "@/components/turnstile";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState("/vite.svg");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const { register, isAuthenticated } = useAuth();
  const location = useLocation();

  const [verified, setVerified] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Simple validation functions
  const validateFirstName = (value) => {
    if (!value?.trim()) return "First name is required";
    if (value.trim().length < 2)
      return "First name must be at least 2 characters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim()))
      return "First name can only contain letters";
    return "";
  };

  const validateLastName = (value) => {
    if (!value?.trim()) return "Last name is required";
    if (value.trim().length < 2)
      return "Last name must be at least 2 characters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim()))
      return "Last name can only contain letters";
    return "";
  };

  const validateEmail = (value) => {
    if (!value?.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validateUsername = (value) => {
    if (!value?.trim()) return "Username is required";
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 20) return "Username must be less than 20 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value))
      return "Username can only contain letters, numbers, and underscores";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
      return "Password must contain uppercase, lowercase, and number";
    return "";
  };

  const validateConfirmPassword = (value) => {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords do not match";
    return "";
  };

  // Handle input changes - same pattern as login
  const handleFirstNameChange = (e) => {
    const value = e.target.value;
    setFirstName(value);
    if (value) {
      const error = validateFirstName(value);
      setFirstNameError(error);
    } else {
      setFirstNameError("");
    }
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value;
    setLastName(value);
    if (value) {
      const error = validateLastName(value);
      setLastNameError(error);
    } else {
      setLastNameError("");
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      const error = validateEmail(value);
      setEmailError(error);
    } else {
      setEmailError("");
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    if (value) {
      const error = validateUsername(value);
      setUsernameError(error);
    } else {
      setUsernameError("");
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      const error = validatePassword(value);
      setPasswordError(error);
    } else {
      setPasswordError("");
    }

    // Revalidate confirm password if it exists
    if (confirmPassword) {
      const confirmError =
        value !== confirmPassword ? "Passwords do not match" : "";
      setConfirmPasswordError(confirmError);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value) {
      const error = validateConfirmPassword(value);
      setConfirmPasswordError(error);
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const firstNameErr = validateFirstName(firstName);
    const lastNameErr = validateLastName(lastName);
    const emailErr = validateEmail(email);
    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword);

    setFirstNameError(firstNameErr);
    setLastNameError(lastNameErr);
    setEmailError(emailErr);
    setUsernameError(usernameErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    if (
      firstNameErr ||
      lastNameErr ||
      emailErr ||
      usernameErr ||
      passwordErr ||
      confirmPasswordErr
    ) {
      setError("Please fix the errors above");
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
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password: password,
        confirmPassword: confirmPassword,
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
              {/* First Name */}
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-300"
                >
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={handleFirstNameChange}
                    className={`block w-full pl-10 pr-3 py-2.5 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-sm ${
                      firstNameError
                        ? "border-red-500 focus:ring-red-500"
                        : firstName && !firstNameError
                        ? "border-green-500 focus:ring-green-500"
                        : "border-gray-600 focus:ring-blue-500"
                    }`}
                    placeholder="John"
                  />
                  {firstName && !firstNameError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {firstNameError && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {firstNameError}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-300"
                >
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={handleLastNameChange}
                    className={`block w-full pl-10 pr-3 py-2.5 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-sm ${
                      lastNameError
                        ? "border-red-500 focus:ring-red-500"
                        : lastName && !lastNameError
                        ? "border-green-500 focus:ring-green-500"
                        : "border-gray-600 focus:ring-blue-500"
                    }`}
                    placeholder="Doe"
                  />
                  {lastName && !lastNameError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {lastNameError && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {lastNameError}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={`block w-full pl-10 pr-3 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    emailError
                      ? "border-red-500 focus:ring-red-500"
                      : email && !emailError
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-600 focus:ring-blue-500"
                  }`}
                  placeholder="Enter your email"
                />
                {email && !emailError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  className={`block w-full pl-10 pr-3 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    usernameError
                      ? "border-red-500 focus:ring-red-500"
                      : username && !usernameError
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-600 focus:ring-blue-500"
                  }`}
                  placeholder="Choose a unique username"
                />
                {username && !usernameError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {usernameError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className={`block w-full pl-10 pr-10 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    passwordError
                      ? "border-red-500 focus:ring-red-500"
                      : password && !passwordError
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-600 focus:ring-blue-500"
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`block w-full pl-10 pr-10 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    confirmPasswordError
                      ? "border-red-500 focus:ring-red-500"
                      : confirmPassword && !confirmPasswordError
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-600 focus:ring-blue-500"
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {confirmPasswordError}
                </p>
              )}
            </div>

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
                  onClick={() => window.open("/terms", "_blank")}
                >
                  Terms and Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-300 transition-colors underline"
                  onClick={() => window.open("/privacy", "_blank")}
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <TurnstileWidget onComplete={setVerified} />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isLoading ||
                firstNameError ||
                lastNameError ||
                emailError ||
                usernameError ||
                passwordError ||
                confirmPasswordError ||
                !firstName ||
                !lastName ||
                !email ||
                !username ||
                !password ||
                !confirmPassword ||
                (!acceptTerms && !verified)
              }
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
