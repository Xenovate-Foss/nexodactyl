import Servers from "@/components/servers";
import { Link } from "react-router-dom";
import { deleteServer, updateServer, userData } from "@/components/api";
import { useState, useEffect } from "react";

export default function ServerManager() {
  const [serverData, setServerData] = useState({
    ram: 10,
    disk: 10,
    cpu: 1,
    allocations: 0,
    databases: 0,
  });
  const [userResources, setUserResources] = useState();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [deletingServer, setDeletingServer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Store the original server resources to calculate proper limits
  const [originalServerResources, setOriginalServerResources] = useState({
    ram: 0,
    disk: 0,
    cpu: 0,
    allocations: 0,
    databases: 0,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await userData();
        setUserResources(data?.resources);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setMessage({
          type: "error",
          text: `Failed to load user data ${error.message}`,
        });
      }
    };

    fetchUserData();
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleEdit = (server) => {
    setEditingServer(server);

    // Store original server resources
    const originalResources = {
      ram: Math.round((server?.panelData?.limits?.memory || 1024) / 1024),
      disk: Math.round((server?.panelData?.limits?.disk || 10240) / 1024),
      cpu: server?.panelData?.limits.cpu || 1,
      allocations: server.panelData?.future_limits?.allocations || 0,
      databases: server.panelData?.future_limits?.databases || 0,
    };

    setOriginalServerResources(originalResources);
    setServerData(originalResources);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingServer) return;

    // Basic validation
    if (serverData.ram < 1 || serverData.disk < 1 || serverData.cpu < 1) {
      setMessage({
        type: "error",
        text: "All resource values must be greater than 0",
      });
      return;
    }

    setLoading(true);
    try {
      // Convert GB to MB for backend
      const dataForBackend = {
        ...serverData,
        ram: serverData.ram * 1024, // GB to MB
        disk: serverData.disk * 1024, // GB to MB
      };

      await updateServer(editingServer.id, dataForBackend);
      setEditModalOpen(false);
      setEditingServer(null);
      setMessage({ type: "success", text: "Server updated successfully!" });
      setRefreshTrigger((prev) => prev + 1); // Trigger server list refresh
    } catch (error) {
      console.error("Failed to update server:", error);
      setMessage({
        type: "error",
        text: "Failed to update server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (server) => {
    setDeletingServer(server);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingServer) return;

    setLoading(true);
    try {
      await deleteServer(deletingServer.id);
      setDeleteModalOpen(false);
      setDeletingServer(null);
      setMessage({ type: "success", text: "Server deleted successfully!" });
      setRefreshTrigger((prev) => prev + 1); // Trigger server list refresh
    } catch (error) {
      console.error("Failed to delete server:", error);
      setMessage({
        type: "error",
        text: "Failed to delete server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (loading) return; // Prevent closing during operations
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setEditingServer(null);
    setDeletingServer(null);
  };

  const handleSliderChange = (field, value) => {
    setServerData({
      ...serverData,
      [field]: parseInt(value),
    });
  };

  // Calculate maximum values based on available resources + original server allocation
  const getMaxValue = (field) => {
    if (!userResources) return 1;

    switch (field) {
      case "ram":
        return (
          Math.round(userResources.ram / 1024) + originalServerResources.ram
        );
      case "disk":
        return (
          Math.round(userResources.disk / 1024) + originalServerResources.disk
        );
      case "cpu":
        return userResources.cpu + originalServerResources.cpu;
      case "allocations":
        return userResources.allocations + originalServerResources.allocations;
      case "databases":
        return userResources.databases + originalServerResources.databases;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white space-y-6">
      {/* Success/Error Message */}
      {message.text && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-600 border border-green-500"
              : "bg-red-600 border border-red-500"
          }`}
        >
          <p>{message.text}</p>
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-5">
        <h1 className="text-2xl font-bold">Manage Servers</h1>
        <p className="text-gray-300 mb-4">
          Configure, Edit, Delete, Create Your servers
        </p>
        {userResources?.slots !== 0 && (
          <Link
            to="/create-server"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-colors"
          >
            Create New
          </Link>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl mb-4">Servers you own</h2>
        <Servers
          EditModal={editModalOpen}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Edit Modal */}
      {editModalOpen && userResources && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Edit Server: {editingServer?.name || "Unknown"}
            </h3>

            <div className="space-y-6">
              {/* RAM Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  RAM: {serverData.ram} GB
                </label>
                <input
                  type="range"
                  min="1"
                  max={getMaxValue("ram")}
                  value={serverData.ram}
                  onChange={(e) => handleSliderChange("ram", e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 GB</span>
                  <span>{getMaxValue("ram")} GB</span>
                </div>
              </div>

              {/* Disk Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Disk: {serverData.disk} GB
                </label>
                <input
                  type="range"
                  min="1"
                  max={getMaxValue("disk")}
                  value={serverData.disk}
                  onChange={(e) => handleSliderChange("disk", e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 GB</span>
                  <span>{getMaxValue("disk")} GB</span>
                </div>
              </div>

              {/* CPU Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  CPU: {serverData.cpu}%
                </label>
                <input
                  type="range"
                  min="1"
                  max={getMaxValue("cpu")}
                  value={serverData.cpu}
                  onChange={(e) => handleSliderChange("cpu", e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1%</span>
                  <span>{getMaxValue("cpu")}%</span>
                </div>
              </div>

              {/* Allocations Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Allocations: {serverData.allocations}
                </label>
                <input
                  type="range"
                  min="0"
                  max={getMaxValue("allocations")}
                  value={serverData.allocations}
                  onChange={(e) =>
                    handleSliderChange("allocations", e.target.value)
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{getMaxValue("allocations")}</span>
                </div>
              </div>

              {/* Databases Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Databases: {serverData.databases}
                </label>
                <input
                  type="range"
                  min="0"
                  max={getMaxValue("databases")}
                  value={serverData.databases}
                  onChange={(e) =>
                    handleSliderChange("databases", e.target.value)
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{getMaxValue("databases")}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className={`px-4 py-2 rounded text-white transition-colors ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={closeModal}
                disabled={loading}
                className={`px-4 py-2 rounded text-white transition-colors ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-400">
              Delete Server
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "
              {deletingServer?.name || "this server"}"? This action cannot be
              undone and all data will be permanently lost.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className={`px-4 py-2 rounded text-white transition-colors ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={closeModal}
                disabled={loading}
                className={`px-4 py-2 rounded text-white transition-colors ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }

        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: #374151;
        }

        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: #374151;
        }
      `}</style>
    </div>
  );
}
