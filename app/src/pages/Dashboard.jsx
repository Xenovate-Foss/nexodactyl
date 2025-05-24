import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { userData } from "@/components/api";
import { MemoryStick, HardDrive, Cpu } from "lucide-react";
import Servers from "@/components/servers";

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
        setError("Failed to load user data. Please try refreshing the page.");
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

  const handleRetry = () => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await userData();
          setAdditionalData(data);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load user data. Please try refreshing the page.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-lg">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white">
        <div className="text-center mt-20">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">
            Please log in to view the dashboard.
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      {/* Header Section */}

      {/* Welcome Section */}
      <div className="p-6 mt-4 mb-6 bg-[url(/3d-fantasy-scene.jpg)] bg-cover bg-center rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">
          Welcome, {user?.firstname || "User"}!
        </h2>
        {additionalData?.user?.root_admin && (
          <span className="inline-block bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium">
            Administrator
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {additionalData ? (
        <div className="grid gap-6">
          {/* Resource Information */}
          {additionalData.resources && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">
                Available Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalData.resources.ram && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-1 flex gap-2">
                      {" "}
                      <MemoryStick /> RAM
                    </h4>
                    <p className="text-2xl font-bold text-blue-400">
                      {additionalData.resources.ram} MB
                    </p>
                  </div>
                )}
                {additionalData.resources.cpu && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-1 flex gap-2">
                      {" "}
                      <Cpu />
                      CPU
                    </h4>
                    <p className="text-2xl font-bold text-green-400">
                      {additionalData.resources.cpu}%
                    </p>
                  </div>
                )}
                {additionalData.resources.disk && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-1 flex gap-2">
                      <HardDrive />
                      Disk
                    </h4>
                    <p className="text-2xl font-bold text-purple-400">
                      {additionalData.resources.disk} MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="grid bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-xl">Servers you own</h1>
            <p className="text-gray-700 mb-2">Limited to 3</p>
            <div className="gap-6">
              <Servers limit={3} />
            </div>
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="text-center text-gray-400 mt-10">
            <p>No data available</p>
          </div>
        )
      )}
    </div>
  );
};

export default Dashboard;
