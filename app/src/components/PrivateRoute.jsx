import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { userData } from "./api";

const PrivateRoute = ({ children, adminRequired = false }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Fetch user details when component mounts and user is authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated || !adminRequired) {
        return; // Don't fetch if not authenticated or admin check not needed
      }

      try {
        setUserLoading(true);
        setError(null);
        const response = await userData();
        setUserDetails(response.user);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setError(err);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, adminRequired]);

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Show loading while fetching user details for admin check
  if (adminRequired && userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-2 text-white">Verifying permissions...</span>
      </div>
    );
  }

  // Handle error in fetching user data
  if (adminRequired && error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error verifying permissions</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check admin permissions if required
  if (adminRequired && userDetails && !userDetails.root_admin) {
    return <Navigate to="/?error=UNAUTHORIZED+access" replace />;
  }

  // Render children if all checks pass
  return children;
};

export default PrivateRoute;