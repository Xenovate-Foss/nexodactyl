import React, { useState, useEffect } from "react";
import {
  getAllServersAdmin,
  getServerByIdAdmin,
  createServerAdmin,
  updateServerAdmin,
  deleteServerAdmin,
  sendServerPowerAction,
  getAvailableEggs,
  getAvailableNodes,
  getUserResourcesAdmin,
  bulkServerOperation,
  validateServerCreationData,
  formatServerData,
} from "@/components/api";

export default function AdminServers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedServers, setSelectedServers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [viewingServer, setViewingServer] = useState(null);
  const [eggs, setEggs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
  });
  const [pagination, setPagination] = useState({});
  const [formData, setFormData] = useState({
    userId: "",
    name: "",
    description: "",
    ram: "",
    disk: "",
    cpu: "",
    allocations: "1",
    databases: "0",
    nodeId: "",
    eggId: "",
    skipResourceCheck: false,
  });

  useEffect(() => {
    fetchServers();
    fetchEggsAndNodes();
  }, [filters]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllServersAdmin(filters);

      console.log("API Response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", Object.keys(response));

      if (response.success) {
        setServers(response.data?.servers || []);
        setPagination(response.data?.pagination || {});
      } else {
        throw new Error(response.error || "Failed to fetch servers");
      }
    } catch (err) {
      setError(err.message);
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEggsAndNodes = async () => {
    try {
      const [eggsResponse, nodesResponse] = await Promise.all([
        getAvailableEggs(),
        getAvailableNodes(),
      ]);

      if (eggsResponse.success) setEggs(eggsResponse.data || []);
      if (nodesResponse.success) setNodes(nodesResponse.data || []);
    } catch (err) {
      console.error("Error fetching eggs/nodes:", err);
    }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      // Validate form data
      const validation = validateServerCreationData(formData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      // Convert string values to numbers
      const serverData = {
        ...formData,
        userId: parseInt(formData.userId),
        ram: parseInt(formData.ram),
        disk: parseInt(formData.disk),
        cpu: parseInt(formData.cpu),
        allocations: parseInt(formData.allocations),
        databases: parseInt(formData.databases),
        nodeId: parseInt(formData.nodeId),
        eggId: parseInt(formData.eggId),
      };

      const response = await createServerAdmin(serverData);

      if (response.success) {
        setSuccess("Server created successfully!");
        fetchServers();
        resetForm();
        setShowCreateForm(false);
      } else {
        throw new Error(response.error || "Failed to create server");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateServer = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      // Convert string values to numbers, excluding empty values
      const updateData = {};
      Object.keys(formData).forEach((key) => {
        if (
          formData[key] !== "" &&
          formData[key] !== null &&
          key !== "userId"
        ) {
          if (
            ["ram", "disk", "cpu", "allocations", "databases"].includes(key)
          ) {
            updateData[key] = parseInt(formData[key]);
          } else {
            updateData[key] = formData[key];
          }
        }
      });

      const response = await updateServerAdmin(editingServer.id, updateData);

      if (response.success) {
        setSuccess("Server updated successfully!");
        fetchServers();
        setEditingServer(null);
        resetForm();
      } else {
        throw new Error(response.error || "Failed to update server");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (
      !confirm(
        "Are you sure you want to delete this server? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setError(null);
      const response = await deleteServerAdmin(serverId, {
        restoreResources: true,
      });

      if (response.success) {
        setSuccess("Server deleted successfully!");
        fetchServers();
      } else {
        throw new Error(response.error || "Failed to delete server");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePowerAction = async (serverId, action) => {
    try {
      setError(null);
      const response = await sendServerPowerAction(serverId, action);

      if (response.success) {
        setSuccess(`Server ${action} command sent successfully!`);
        // Refresh server data after a short delay
        setTimeout(fetchServers, 2000);
      } else {
        throw new Error(response.error || `Failed to ${action} server`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkOperation = async (operation) => {
    if (selectedServers.length === 0) {
      setError("Please select servers first");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${operation} ${selectedServers.length} server(s)?`
      )
    ) {
      return;
    }

    try {
      setError(null);
      const response = await bulkServerOperation(selectedServers, operation);

      if (response.success) {
        setSuccess(`Bulk ${operation} operation completed!`);
        setSelectedServers([]);
        fetchServers();
      } else {
        throw new Error(
          response.error || `Failed to perform bulk ${operation}`
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const viewServerDetails = async (serverId) => {
    try {
      setError(null);
      const response = await getServerByIdAdmin(serverId);

      if (response.success) {
        setViewingServer(response.data);
      } else {
        throw new Error(response.error || "Failed to fetch server details");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (server) => {
    setEditingServer(server);
    const formatted = formatServerData(server);
    setFormData({
      userId: server.userId || "",
      name: formatted?.name || "",
      description: server.description || "",
      ram: formatted?.resources?.ram?.replace(/[^\d]/g, "") || "",
      disk: formatted?.resources?.disk?.replace(/[^\d]/g, "") || "",
      cpu: formatted?.resources?.cpu?.replace(/[^\d]/g, "") || "",
      allocations: server.allocations || "",
      databases: server.databases || "",
      nodeId: "",
      eggId: "",
      skipResourceCheck: false,
    });
    setShowCreateForm(false);
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      name: "",
      description: "",
      ram: "",
      disk: "",
      cpu: "",
      allocations: "1",
      databases: "0",
      nodeId: "",
      eggId: "",
      skipResourceCheck: false,
    });
    setEditingServer(null);
    setShowCreateForm(false);
  };

  const handleSelectServer = (serverId) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(servers.map((server) => server.id));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "text-green-400";
      case "offline":
        return "text-red-400";
      case "starting":
        return "text-yellow-400";
      case "stopping":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "🟢";
      case "offline":
        return "🔴";
      case "starting":
        return "🟡";
      case "stopping":
        return "🟠";
      default:
        return "⚪";
    }
  };

  if (loading && servers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <div className="text-xl">Loading servers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      {/* Header */}
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Server Administration</h1>
        <p className="text-gray-300">Manage all servers across the platform</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-600 text-white p-4 rounded-lg mb-6">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
              placeholder="Search servers or users..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="starting">Starting</option>
              <option value="stopping">Stopping</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value })
              }
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) =>
                setFilters({ ...filters, sortOrder: e.target.value })
              }
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DESC">Newest First</option>
              <option value="ASC">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Create Server
            </button>
            {selectedServers.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkOperation("start")}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  Start Selected
                </button>
                <button
                  onClick={() => handleBulkOperation("stop")}
                  className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  Stop Selected
                </button>
                <button
                  onClick={() => handleBulkOperation("delete")}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-400">
            {selectedServers.length} of {servers.length} selected
          </p>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingServer) && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingServer ? "Edit Server" : "Create New Server"}
          </h2>
          <form
            onSubmit={editingServer ? handleUpdateServer : handleCreateServer}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {!editingServer && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    User ID *
                  </label>
                  <input
                    type="number"
                    value={formData.userId}
                    onChange={(e) =>
                      setFormData({ ...formData, userId: e.target.value })
                    }
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={!editingServer}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength="191"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  RAM (MB) *
                </label>
                <input
                  type="number"
                  value={formData.ram}
                  onChange={(e) =>
                    setFormData({ ...formData, ram: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="128"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Disk (MB) *
                </label>
                <input
                  type="number"
                  value={formData.disk}
                  onChange={(e) =>
                    setFormData({ ...formData, disk: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="512"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  CPU (%) *
                </label>
                <input
                  type="number"
                  value={formData.cpu}
                  onChange={(e) =>
                    setFormData({ ...formData, cpu: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="1"
                  max="1000"
                />
              </div>
              {!editingServer && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Node *
                    </label>
                    <select
                      value={formData.nodeId}
                      onChange={(e) =>
                        setFormData({ ...formData, nodeId: e.target.value })
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Node</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.name} ({node.location})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Server Type *
                    </label>
                    <select
                      value={formData.eggId}
                      onChange={(e) =>
                        setFormData({ ...formData, eggId: e.target.value })
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Server Type</option>
                      {eggs.map((egg) => (
                        <option key={egg.id} value={egg.id}>
                          {egg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Allocations
                </label>
                <input
                  type="number"
                  value={formData.allocations}
                  onChange={(e) =>
                    setFormData({ ...formData, allocations: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Databases
                </label>
                <input
                  type="number"
                  value={formData.databases}
                  onChange={(e) =>
                    setFormData({ ...formData, databases: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            {!editingServer && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.skipResourceCheck}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skipResourceCheck: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Skip resource availability check
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingServer ? "Update Server" : "Create Server"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Server Details Modal */}
      {viewingServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Server Details</h2>
              <button
                onClick={() => setViewingServer(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Server ID</label>
                  <p className="text-white">{viewingServer.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p
                    className={`${getStatusColor(
                      viewingServer.panelData?.status
                    )} font-medium`}
                  >
                    {getStatusIcon(viewingServer.panelData?.status)}{" "}
                    {viewingServer.panelData?.status || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Name</label>
                  <p className="text-white">
                    {viewingServer.panelData?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Owner</label>
                  <p className="text-white">
                    {viewingServer.user?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Node</label>
                  <p className="text-white">
                    {viewingServer.panelData?.node || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Created</label>
                  <p className="text-white">
                    {new Date(viewingServer.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Resources</label>
                <div className="bg-gray-700 rounded p-3 mt-1">
                  <p>RAM: {viewingServer.panelData?.limits?.memory || 0}MB</p>
                  <p>Disk: {viewingServer.panelData?.limits?.disk || 0}MB</p>
                  <p>CPU: {viewingServer.panelData?.limits?.cpu || 0}%</p>
                </div>
              </div>

              {viewingServer.panelData?.uuid && (
                <div>
                  <label className="text-sm text-gray-400">UUID</label>
                  <p className="text-white text-xs font-mono">
                    {viewingServer.panelData.uuid}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Servers ({pagination.totalItems || servers.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {selectedServers.length === servers.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No servers found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filters.search
                ? "Try adjusting your search criteria"
                : "Create your first server to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedServers.length === servers.length &&
                        servers.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3">Server</th>
                  <th className="text-left p-3">Owner</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Resources</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => {
                  const formatted = formatServerData(server);
                  return (
                    <tr
                      key={server.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedServers.includes(server.id)}
                          onChange={() => handleSelectServer(server.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-white font-medium">
                            {formatted?.name || "Unknown"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            ID: {server.id}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">
                        {formatted?.owner || "N/A"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`${getStatusColor(
                            formatted?.status
                          )} font-medium`}
                        >
                          {getStatusIcon(formatted?.status)}{" "}
                          {formatted?.status || "unknown"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <p>{formatted?.resources?.ram || "0MB"} RAM</p>
                          <p>{formatted?.resources?.disk || "0MB"} Disk</p>
                          <p>{formatted?.resources?.cpu || "0%"} CPU</p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300 text-sm">
                        {formatted?.created || "N/A"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => viewServerDetails(server.id)}
                            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => startEdit(server)}
                            className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handlePowerAction(server.id, "start")
                            }
                            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => handlePowerAction(server.id, "stop")}
                            className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Stop
                          </button>
                          <button
                            onClick={() =>
                              handlePowerAction(server.id, "restart")
                            }
                            className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Restart
                          </button>
                          <button
                            onClick={() => handleDeleteServer(server.id)}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Show:</span>
              <select
                value={filters.limit}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    limit: parseInt(e.target.value),
                    page: 1,
                  })
                }
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-gray-400">per page</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setFilters({ ...filters, page: filters.page - 1 })
                }
                disabled={filters.page === 1}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm transition-colors"
              >
                Previous
              </button>

              <div className="flex gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (filters.page <= 3) {
                      pageNum = i + 1;
                    } else if (filters.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = filters.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          setFilters({ ...filters, page: pageNum })
                        }
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          filters.page === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() =>
                  setFilters({ ...filters, page: filters.page + 1 })
                }
                disabled={filters.page === pagination.totalPages}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>

            <div className="text-gray-400 text-sm">
              Showing {(filters.page - 1) * filters.limit + 1} to{" "}
              {Math.min(
                filters.page * filters.limit,
                pagination.totalItems || servers.length
              )}{" "}
              of {pagination.totalItems || servers.length} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
