import React, { useState, useEffect } from "react";
import {
  getAllUsers,
  createUser,
  deleteUser,
  updateUser,
} from "@/components/api";

export default function User() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      console.log("Starting to fetch users...");
      setLoading(true);
      setError(null);

      const response = await getAllUsers();
      console.log("Received users response:", response);

      // Handle API response structure: { success: true, data: users }
      if (response.success) {
        setUsers(response.data.users || []);
      } else {
        throw new Error(response.error || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await createUser(formData);

      // Handle API response structure
      if (response.success) {
        setUsers((prev) => [response.data, ...prev]);
        setFormData({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: "",
        });
        setShowCreateForm(false);
      } else {
        setError(response.error);
        //throw new Error(response.error || "Failed to create user");
      }
    } catch (err) {
      setError(JSON.stringify(err));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      // Don't send password if it's empty during update
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await updateUser(editingUser.id, updateData);

      // Handle API response structure
      if (response.success) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingUser.id ? response.data : user
          )
        );
        setEditingUser(null);
        setFormData({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: "",
        });
      } else {
        throw new Error(response.error || "Failed to update user");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      setError(null);
      const response = await deleteUser(userId);

      // Handle API response structure
      if (response.success) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
      } else {
        throw new Error(response.error || "Failed to delete user");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      password: "", // Don't populate password for security
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <div className="text-xl">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Users</h1>
        <p className="text-gray-300">Manage system users and their accounts</p>
      </div>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingUser) && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingUser ? "Edit User" : "Create New User"}
          </h2>
          <form
            onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength="2"
                  maxLength="50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength="2"
                  maxLength="50"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  pattern="[a-zA-Z0-9]+"
                  minLength="3"
                  maxLength="30"
                  title="Username must be alphanumeric, 3-30 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password {editingUser && "(leave empty to keep current)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength="6"
                  maxLength="255"
                  required={!editingUser}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingUser ? "Update User" : "Create User"}
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

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Users List ({users.length})</h2>
          <button
            onClick={startCreate}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add New User
          </button>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No users found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create your first user to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-gray-400">@{user.username}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(user)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Pterodactyl ID:</span>{" "}
                    {user.ptero_id}
                  </p>
                  {user.resources && (
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Resources:</span> Assigned
                    </p>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p>
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                  {user.updatedAt !== user.createdAt && (
                    <p>
                      Updated: {new Date(user.updatedAt).toLocaleDateString()}
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
  /* return <code>{JSON.stringify(users)}</code>;*/
}
