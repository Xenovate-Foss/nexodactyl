import React, { useState, useEffect } from "react";
import {
  getAllNodes,
  createNode,
  deleteNode,
  updateNode,
} from "@/components/api";

export default function NodeManager() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({
    nodeId: "",
    name: "",
    location: "",
  });

  useEffect(() => {
    fetchAllNodes();
  }, []);

  const fetchAllNodes = async () => {
    try {
      console.log("Starting to fetch nodes...");
      setLoading(true);
      setError(null);

      const response = await getAllNodes();
      console.log("Received nodes response:", response);

      // Handle API response structure: { success: true, data: nodes }
      if (response.success) {
        setNodes(response.data || []);
      } else {
        throw new Error(response.error || "Failed to fetch nodes");
      }
    } catch (err) {
      console.error("Error fetching nodes:", err);
      setError(err.message || "Failed to fetch nodes");
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNode = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await createNode(formData);

      // Handle API response structure
      if (response.success) {
        setNodes((prev) => [response.data, ...prev]);
        setFormData({ nodeId: "", name: "", location: "" });
        setShowCreateForm(false);
      } else {
        throw new Error(response.error || "Failed to create node");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateNode = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await updateNode(editingNode.id, formData);

      // Handle API response structure
      if (response.success) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === editingNode.id ? response.data : node
          )
        );
        setEditingNode(null);
        setFormData({ nodeId: "", name: "", location: "" });
      } else {
        throw new Error(response.error || "Failed to update node");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!confirm("Are you sure you want to delete this node?")) return;

    try {
      setError(null);
      const response = await deleteNode(nodeId);

      // Handle API response structure
      if (response.success) {
        setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      } else {
        throw new Error(response.error || "Failed to delete node");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (node) => {
    setEditingNode(node);
    setFormData({
      nodeId: node.nodeId,
      name: node.name,
      location: node.location,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setShowCreateForm(false);
    setFormData({ nodeId: "", name: "", location: "" });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingNode(null);
    setFormData({ nodeId: "", name: "", location: "" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <div className="text-xl">Loading nodes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Nodes</h1>
        <p className="text-gray-300">Manage your nodes for server creation</p>
      </div>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingNode) && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingNode ? "Edit Node" : "Create New Node"}
          </h2>
          <form
            onSubmit={editingNode ? handleUpdateNode : handleCreateNode}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pterodactyl Node ID
                </label>
                <input
                  type="number"
                  value={formData.nodeId}
                  onChange={(e) =>
                    setFormData({ ...formData, nodeId: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Location (Country Code)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="US, UK, DE, etc."
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingNode ? "Update Node" : "Create Node"}
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

      {/* Nodes List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Nodes List ({nodes.length})</h2>
          <button
            onClick={startCreate}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add New Node
          </button>
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No nodes found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create your first node to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {node.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Pterodactyl ID: {node.nodeId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(node)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mb-3 overflow-hidden">
                  <img
                    src={`https://flagsapi.com/${node.location}/flat/64.png`}
                    alt={node.location}
                    className="w-max-16 h-full object-cover rounded-lg bg-gray-600"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>
                    Created: {new Date(node.createdAt).toLocaleDateString()}
                  </p>
                  {node.updatedAt !== node.createdAt && (
                    <p>
                      Updated: {new Date(node.updatedAt).toLocaleDateString()}
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
