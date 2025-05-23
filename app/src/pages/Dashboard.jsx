import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { userData } from "@/components/api";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [additionalData, setAdditionalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await userData();
        setAdditionalData(data);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a user
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please log in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {user?.username || user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">User Information</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <span className="font-medium">User ID:</span> {user.id}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user.email}
            </p>
            {user?.username && (
              <p>
                <span className="font-medium">Username:</span> {user.username}
              </p>
            )}
            {additionalData?.user?.createdAt && (
              <p>
                <span className="font-medium">Member since:</span>{" "}
                {new Date(additionalData.user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Protected Content</h2>
          <p>This content is only visible to authenticated users.</p>

          {additionalData && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <h3 className="text-lg font-medium mb-2">Additional Data</h3>
              <pre className="text-sm text-gray-300 overflow-auto">
                {JSON.stringify(additionalData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
