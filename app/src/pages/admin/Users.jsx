import React, { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  createUser,
  deleteUser,
  updateUser,
} from "@/components/api";
import { config as getConfig } from "@/components/api";
import { ExternalLink } from "lucide-react";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2">Loading users...</span>
  </div>
);

// Error alert component
const ErrorAlert = ({ error, onDismiss }) => (
  <div className="bg-red-600 text-white p-4 rounded-lg mb-6 flex items-center justify-between">
    <div>
      <strong>Error:</strong> {error}
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-white hover:text-gray-200 font-bold text-xl"
      >
        ×
      </button>
    )}
  </div>
);

// Success alert component
const SuccessAlert = ({ message, onDismiss }) => (
  <div className="bg-green-600 text-white p-4 rounded-lg mb-6 flex items-center justify-between">
    <div>
      <strong>Success:</strong> {message}
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-white hover:text-gray-200 font-bold text-xl"
      >
        ×
      </button>
    )}
  </div>
);

// User card component
const UserCard = ({ user, onEdit, onDelete, config }) => (
  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-1">
          {user.firstName} {user.lastName}
        </h3>
        <p className="text-sm text-blue-400 mb-1 flex gap-2">
          @{user.username}{" "}
          {config?.panel_url && (
            <a href={config.panel_url + "/admin/users/view/" + user.ptero_id}>
              <ExternalLink />
            </a>
          )}
        </p>
        <p className="text-sm text-gray-400 break-all">{user.email}</p>
        <p className="text-sm text-gray-400">
          Resources ID: {user.resourcesId || "Not Assigned"}
        </p>
      </div>
      <div className="flex gap-2 ml-4">
        <button
          onClick={() => onEdit(user)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Edit ${user.firstName} ${user.lastName}`}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(user.id)}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label={`Delete ${user.firstName} ${user.lastName}`}
        >
          Delete
        </button>
      </div>
    </div>

    <div className="mb-3 space-y-1">
      <p className="text-sm text-gray-300">
        <span className="font-medium">Pterodactyl ID:</span>{" "}
        {user.ptero_id || "Not assigned"}
      </p>
      {user.resources && (
        <p className="text-sm text-green-400">
          <span className="font-medium">Resources:</span> Assigned
        </p>
      )}
    </div>

    <div className="text-xs text-gray-500 space-y-1">
      <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
      {user.updatedAt !== user.createdAt && (
        <p>Updated: {new Date(user.updatedAt).toLocaleDateString()}</p>
      )}
    </div>
  </div>
);

// Form input component
const FormInput = ({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  minLength,
  maxLength,
  pattern,
  title,
  placeholder,
}) => (
  <div>
    <label className="block text-sm font-medium mb-2">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      pattern={pattern}
      title={title}
      placeholder={placeholder}
    />
  </div>
);

export default function User() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    const handleConfig = async () => {
      const data = await getConfig();
      setConfig(data);
    };
    handleConfig();
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      console.log("Starting to fetch users...");
      setLoading(true);
      setError(null);

      const response = await getAllUsers();
      console.log("Received users response:", response);

      // Handle different API response structures
      if (response.success) {
        const userData = response.data?.users || response.data || [];
        setUsers(Array.isArray(userData) ? userData : []);
      } else if (Array.isArray(response)) {
        // Direct array response
        setUsers(response);
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
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const resetForm = useCallback(() => {
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    });
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await createUser(formData);

      if (response.success) {
        setUsers((prev) => [response.data, ...prev]);
        resetForm();
        setShowCreateForm(false);
        setSuccess("User created successfully!");
      } else {
        setError(response.error || "Failed to create user");
      }
    } catch (err) {
      console.error("Create user error:", err);
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Don't send password if it's empty during update
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await updateUser(editingUser.id, updateData);

      if (response.success) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingUser.id ? response.data : user
          )
        );
        setEditingUser(null);
        resetForm();
        setSuccess("User updated successfully!");
      } else {
        setError(response.error || "Failed to update user");
      }
    } catch (err) {
      console.error("Update user error:", err);
      setError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find((u) => u.id === userId);
    const confirmMessage = `Are you sure you want to delete ${user?.firstName} ${user?.lastName}? This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      setError(null);
      const response = await deleteUser(userId);

      if (response.success) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        setSuccess("User deleted successfully!");
      } else {
        setError(response.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      setError(err.message || "Failed to delete user");
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
    setError(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    resetForm();
    setError(null);
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingUser(null);
    resetForm();
    setError(null);
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      {/* Header */}
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Users</h1>
        <p className="text-gray-300">Manage system users and their accounts</p>
      </div>

      {/* Alerts */}
      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {success && (
        <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />
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
              <FormInput
                label="First Name"
                value={formData.firstName}
                onChange={(e) => updateFormData("firstName", e.target.value)}
                required
                minLength={2}
                maxLength={50}
                placeholder="John"
              />

              <FormInput
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => updateFormData("lastName", e.target.value)}
                required
                minLength={2}
                maxLength={50}
                placeholder="Doe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Username"
                value={formData.username}
                onChange={(e) => updateFormData("username", e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                title="Username must contain only letters, numbers, underscores, and hyphens"
                placeholder="johndoe"
              />

              <FormInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label={`Password ${
                  editingUser ? "(leave empty to keep current)" : ""
                }`}
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData("password", e.target.value)}
                required={!editingUser}
                minLength={6}
                maxLength={255}
                placeholder={
                  editingUser ? "Leave empty to keep current" : "Enter password"
                }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingUser ? "Updating..." : "Creating..."}
                  </span>
                ) : editingUser ? (
                  "Update User"
                ) : (
                  "Create User"
                )}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={submitting}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Users List ({users.length})</h2>

          <div className="flex gap-2">
            <button
              onClick={fetchAllUsers}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={startCreate}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Add New User
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-400 text-lg mb-2">No users found</p>
            <p className="text-gray-500 text-sm mb-6">
              Create your first user to get started
            </p>
            <button
              onClick={startCreate}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create First User
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={startEdit}
                onDelete={handleDeleteUser}
                config={config}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
