import React, { useState, useEffect } from "react";
import {
  getAllResources,
  createResource,
  deleteResource,
  updateResource,
} from "@/components/api";

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    ram: "",
    disk: "",
    cpu: "",
    allocations: "",
    databases: "",
    slots: "",
    coins: "",
  });

  useEffect(() => {
    fetchAllResources();
  }, []);

  const fetchAllResources = async () => {
    try {
      console.log("Starting to fetch resources...");
      setLoading(true);
      setError(null);

      const response = await getAllResources();
      console.log("Received resources response:", response);

      // Handle API response structure: { success: true, data: { resources: [], pagination: {} } }
      if (response.success) {
        setResources(response.data?.resources || []);
      } else {
        throw new Error(response.error || "Failed to fetch resources");
      }
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError(err.message || "Failed to fetch resources");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      // Filter out empty values and convert to numbers
      const resourceData = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== "" && formData[key] !== null) {
          resourceData[key] = parseInt(formData[key]);
        }
      });

      const response = await createResource(resourceData);

      // Handle API response structure
      if (response.success) {
        setResources((prev) => [response.data, ...prev]);
        setFormData({
          ram: "",
          disk: "",
          cpu: "",
          allocations: "",
          databases: "",
          slots: "",
          coins: "",
        });
        setShowCreateForm(false);
      } else {
        throw new Error(response.error || "Failed to create resource");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      // Filter out empty values and convert to numbers
      const resourceData = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== "" && formData[key] !== null) {
          resourceData[key] = parseInt(formData[key]);
        }
      });

      const response = await updateResource(editingResource.id, resourceData);

      // Handle API response structure
      if (response.success) {
        setResources((prev) =>
          prev.map((resource) =>
            resource.id === editingResource.id ? response.data : resource
          )
        );
        setEditingResource(null);
        setFormData({
          ram: "",
          disk: "",
          cpu: "",
          allocations: "",
          databases: "",
          slots: "",
          coins: "",
        });
      } else {
        throw new Error(response.error || "Failed to update resource");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (
      !confirm(
        "Are you sure you want to delete this resource? \n deleting resource if the user exist that will be unable to access any resource"
      )
    )
      return;

    try {
      setError(null);
      const response = await deleteResource(resourceId);

      // Handle API response structure
      if (response.success) {
        setResources((prev) =>
          prev.filter((resource) => resource.id !== resourceId)
        );
      } else {
        throw new Error(response.error || "Failed to delete resource");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      ram: resource.ram || "",
      disk: resource.disk || "",
      cpu: resource.cpu || "",
      allocations: resource.allocations || "",
      databases: resource.databases || "",
      slots: resource.slots || "",
      coins: resource.coins || "",
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingResource(null);
    setShowCreateForm(false);
    setFormData({
      ram: "",
      disk: "",
      cpu: "",
      allocations: "",
      databases: "",
      slots: "",
      coins: "",
    });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingResource(null);
    setFormData({
      ram: "",
      disk: "",
      cpu: "",
      allocations: "",
      databases: "",
      slots: "",
      coins: "",
    });
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <div className="text-xl">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Resources</h1>
        <p className="text-gray-300">
          Configure server resource allocations and pricing
        </p>
      </div>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingResource) && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingResource ? "Edit Resource" : "Create New Resource"}
          </h2>
          <form
            onSubmit={
              editingResource ? handleUpdateResource : handleCreateResource
            }
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  RAM (MB)
                </label>
                <input
                  type="number"
                  value={formData.ram}
                  onChange={(e) =>
                    setFormData({ ...formData, ram: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1024"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Disk (MB)
                </label>
                <input
                  type="number"
                  value={formData.disk}
                  onChange={(e) =>
                    setFormData({ ...formData, disk: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 5120"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  CPU (%)
                </label>
                <input
                  type="number"
                  value={formData.cpu}
                  onChange={(e) =>
                    setFormData({ ...formData, cpu: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 100"
                  min="0"
                  max="1000"
                />
              </div>
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
                  placeholder="e.g., 1"
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
                  placeholder="e.g., 1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slots</label>
                <input
                  type="number"
                  value={formData.slots}
                  onChange={(e) =>
                    setFormData({ ...formData, slots: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 20"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Coins</label>
                <input
                  type="number"
                  value={formData.coins}
                  onChange={(e) =>
                    setFormData({ ...formData, coins: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 100"
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingResource ? "Update Resource" : "Create Resource"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Resources List ({resources.length})
          </h2>
          {/*
          <button
            onClick={startCreate}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add New Resource
    </button>*/}
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No resources found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create your first resource configuration to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Resource #{resource.id}
                    </h3>
                    {resource.coins > 0 && (
                      <p className="text-sm text-yellow-400 font-medium">
                        💰 {resource.coins} coins
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(resource)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {resource.ram && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">RAM:</span>
                      <span className="text-white font-medium">
                        {formatBytes(resource.ram * 1024 * 1024)}
                      </span>
                    </div>
                  )}
                  {resource.disk && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Disk:</span>
                      <span className="text-white font-medium">
                        {formatBytes(resource.disk * 1024 * 1024)}
                      </span>
                    </div>
                  )}
                  {resource.cpu && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">CPU:</span>
                      <span className="text-white font-medium">
                        {resource.cpu}%
                      </span>
                    </div>
                  )}
                  {resource.allocations && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        Allocations:
                      </span>
                      <span className="text-white font-medium">
                        {resource.allocations}
                      </span>
                    </div>
                  )}
                  {resource.databases && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Databases:</span>
                      <span className="text-white font-medium">
                        {resource.databases}
                      </span>
                    </div>
                  )}
                  {resource.slots && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Slots:</span>
                      <span className="text-white font-medium">
                        {resource.slots}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 border-t border-gray-600 pt-2">
                  <p>
                    Created: {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                  {resource.updatedAt !== resource.createdAt && (
                    <p>
                      Updated:{" "}
                      {new Date(resource.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
