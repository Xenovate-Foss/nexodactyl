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
} from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState("/vite.svg");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect if already logged in
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Handle input changes with validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value && !validatePassword(value)) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError("");
    }
  };

  // Account lockout mechanism
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimer === 0) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [isLocked, lockTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      setError(
        `Account temporarily locked. Try again in ${lockTimer} seconds.`
      );
      return;
    }

    // Client-side validation
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);

      if (!result.success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(300); // 5 minutes lockout
          setError("Too many failed attempts. Account locked for 5 minutes.");
        } else {
          setError(`${result.error} (${5 - newAttempts} attempts remaining)`);
        }
      } else {
        setAttempts(0);
        // Handle remember me functionality
        if (rememberMe) {
          localStorage.setItem("rememberLogin", "true");
        }
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    }

    setIsLoading(false);
  };

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedRemember = localStorage.getItem("rememberLogin");
    if (savedRemember) {
      setRememberMe(true);
    }
  }, []);

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
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Sign in to continue to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  placeholder="Enter your password"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-300">Remember me</span>
              </label>
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked || emailError || passwordError}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : isLocked ? (
                `Locked (${lockTimer}s)`
              ) : (
                "Sign In"
              )}
            </button>
            <p className="text-xs text-center text-gray-100">
              New here? <Link to="/auth/register">Register</Link>
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

export default Login;
