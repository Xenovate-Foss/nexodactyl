import React, { useState, useEffect } from "react";
import { getAllEggs, createEgg, deleteEgg, updateEgg } from "@/components/api";

export default function Egg() {
  const [eggs, setEggs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEgg, setEditingEgg] = useState(null);
  const [formData, setFormData] = useState({
    eggId: "",
    name: "",
    description: "",
    img: "",
  });

  useEffect(() => {
    fetchAllEggs();
  }, []);

  const fetchAllEggs = async () => {
    try {
      console.log("Starting to fetch eggs...");
      setLoading(true);
      setError(null);

      const response = await getAllEggs();
      console.log("Received eggs response:", response);

      // Handle API response structure: { success: true, data: eggs }
      if (response.success) {
        setEggs(response.data || []);
      } else {
        throw new Error(response.error || "Failed to fetch eggs");
      }
    } catch (err) {
      console.error("Error fetching eggs:", err);
      setError(err.message || "Failed to fetch eggs");
      setEggs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEgg = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await createEgg(formData);

      // Handle API response structure
      if (response.success) {
        setEggs((prev) => [response.data, ...prev]);
        setFormData({ eggId: "", name: "", description: "", img: "" });
        setShowCreateForm(false);
      } else {
        throw new Error(response.error || "Failed to create egg");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateEgg = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await updateEgg(editingEgg.id, formData);

      // Handle API response structure
      if (response.success) {
        setEggs((prev) =>
          prev.map((egg) => (egg.id === editingEgg.id ? response.data : egg))
        );
        setEditingEgg(null);
        setFormData({ eggId: "", name: "", description: "", img: "" });
      } else {
        throw new Error(response.error || "Failed to update egg");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEgg = async (eggId) => {
    if (!confirm("Are you sure you want to delete this egg?")) return;

    try {
      setError(null);
      const response = await deleteEgg(eggId);

      // Handle API response structure
      if (response.success) {
        setEggs((prev) => prev.filter((egg) => egg.id !== eggId));
      } else {
        throw new Error(response.error || "Failed to delete egg");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (egg) => {
    setEditingEgg(egg);
    setFormData({
      eggId: egg.eggId,
      name: egg.name,
      description: egg.description || "",
      img: egg.img,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingEgg(null);
    setShowCreateForm(false);
    setFormData({ eggId: "", name: "", description: "", img: "" });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingEgg(null);
    setFormData({ eggId: "", name: "", description: "", img: "" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <div className="text-xl">Loading eggs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Eggs</h1>
        <p className="text-gray-300">Manage your eggs for server creation</p>
      </div>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingEgg) && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingEgg ? "Edit Egg" : "Create New Egg"}
          </h2>
          <form
            onSubmit={editingEgg ? handleUpdateEgg : handleCreateEgg}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pterodactyl Egg ID
                </label>
                <input
                  type="number"
                  value={formData.eggId}
                  onChange={(e) =>
                    setFormData({ ...formData, eggId: e.target.value })
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
                Image URL
              </label>
              <input
                type="url"
                value={formData.img}
                onChange={(e) =>
                  setFormData({ ...formData, img: e.target.value })
                }
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/image.png"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Enter egg description..."
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingEgg ? "Update Egg" : "Create Egg"}
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

      {/* Eggs List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Eggs List ({eggs.length})</h2>
          <button
            onClick={startCreate}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add New Egg
          </button>
        </div>

        {eggs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No eggs found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create your first egg to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {eggs.map((egg) => (
              <div
                key={egg.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {egg.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Pterodactyl ID: {egg.eggId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(egg)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEgg(egg.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {egg.img && (
                  <div className="mb-3 overflow-hidden">
                    <img
                      src={egg.img}
                      alt={egg.name}
                      className="w-full h-32 object-cover rounded-lg bg-gray-600"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                {egg.description && (
                  <p className="text-gray-300 text-sm mb-3">
                    {egg.description}
                  </p>
                )}

                <div className="text-xs text-gray-500">
                  <p>Created: {new Date(egg.createdAt).toLocaleDateString()}</p>
                  {egg.updatedAt !== egg.createdAt && (
                    <p>
                      Updated: {new Date(egg.updatedAt).toLocaleDateString()}
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
