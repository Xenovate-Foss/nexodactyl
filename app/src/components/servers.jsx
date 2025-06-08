import { getAllServers } from "./api";
import { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Zap,
} from "lucide-react";

export default function Servers({ limit, onEdit, onDelete, EditModal }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingServer, setEditingServer] = useState(null);

  useEffect(() => {
    const getServers = async () => {
      try {
        setLoading(true);
        setError(null);
        const { servers } = await getAllServers();
        if (servers) {
          const limitedServers = limit ? servers.slice(0, limit) : servers;
          setServers(limitedServers);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch servers");
        console.error("Error fetching servers:", err);
      } finally {
        setLoading(false);
      }
    };

    getServers();
  }, [limit]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 MB";
    if (bytes < 1024) return `${bytes} MB`;
    return `${(bytes / 1024).toFixed(1)} GB`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "running":
        return "bg-green-900/30 text-green-400 border border-green-700";
      case "stopped":
      case "offline":
        return "bg-red-900/30 text-red-400 border border-red-700";
      case "starting":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700";
      case "stopping":
        return "bg-orange-900/30 text-orange-400 border border-orange-700";
      default:
        return "bg-gray-700 text-gray-300 border border-gray-600";
    }
  };

  const handleEdit = (server) => {
    if (EditModal) {
      setEditingServer(server);
    } else if (onEdit) {
      onEdit(server);
    }
  };

  const handleEditSave = (updatedServer) => {
    setServers((prev) =>
      prev.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
    setEditingServer(null);

    if (onEdit) {
      onEdit(updatedServer);
    }
  };

  const handleEditCancel = () => {
    setEditingServer(null);
  };

  const handleDeleteClick = (server) => {
    setShowDeleteConfirm(server.id);
  };

  const handleDeleteConfirm = async (server) => {
    try {
      setDeletingId(server.id);
      setShowDeleteConfirm(null);

      if (onDelete) {
        await onDelete(server);
      } else {
        console.log("Delete server:", server);
      }

      setServers((prev) => prev.filter((s) => s.id !== server.id));
    } catch (err) {
      console.error("Error deleting server:", err);
      setError(`Failed to delete server: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <div className="ml-3 text-gray-400">Loading servers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          Error: {error}
        </div>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center text-gray-400">
        <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No servers found</p>
        <p className="text-sm mt-2">Create your first server to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Servers
          {limit && (
            <span className="text-gray-400 font-normal ml-2">
              ({Math.min(limit, servers.length)} of {servers.length})
            </span>
          )}
        </h2>
        <div className="text-sm text-gray-400">
          {servers.length} server{servers.length !== 1 ? "s" : ""} total
        </div>
      </div>

      <div className="grid gap-4">
        {servers.map((server, index) => {
          const panel = server.panelData || {};
          const limits = panel.limits || {};
          const allocations = panel.relationships?.allocations || [];
          const isDeleting = deletingId === server.id;
          const showConfirm = showDeleteConfirm === server.id;

          return (
            <div
              key={server.id || index}
              className={`bg-gray-800 border border-gray-700 rounded-lg p-6 transition-all hover:shadow-lg ${
                isDeleting
                  ? "opacity-50 pointer-events-none"
                  : "hover:bg-gray-750 hover:border-gray-600"
              }`}
            >
              {/* Header with Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-semibold text-white">
                      {panel.name || `Server ${index + 1}`}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        panel.status
                      )}`}
                    >
                      {panel.status || "Unknown"}
                    </span>
                  </div>
                  {panel.description && (
                    <p className="text-gray-400 text-sm mt-1">
                      {panel.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    {panel.uuid && (
                      <span className="text-xs text-gray-500">
                        ID: {panel.uuid.split("-")[0]}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Server #{server.serverId}
                    </span>
                    {allocations.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {allocations[0].attributes.ip}:
                        {allocations[0].attributes.port}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {(onEdit || EditModal || onDelete) && (
                  <div className="flex space-x-2">
                    {(onEdit || EditModal) && (
                      <button
                        onClick={() => handleEdit(server)}
                        disabled={isDeleting}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Edit server"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => handleDeleteClick(server)}
                        disabled={isDeleting}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete server"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Delete Confirmation */}
              {showConfirm && onDelete && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 font-medium">Delete Server</p>
                      <p className="text-red-400 text-sm">
                        Are you sure you want to delete "{panel.name}"? This
                        action cannot be undone.
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleDeleteConfirm(server)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={handleDeleteCancel}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Limits */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center space-x-2 mb-1">
                    <MemoryStick className="w-3 h-3 text-gray-400" />
                    <div className="text-gray-400 text-xs uppercase tracking-wide">
                      Memory
                    </div>
                  </div>
                  <div className="text-white font-semibold">
                    {formatBytes(limits.memory)}
                  </div>
                  {limits.swap > 0 && (
                    <div className="text-gray-500 text-xs">
                      +{formatBytes(limits.swap)} swap
                    </div>
                  )}
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center space-x-2 mb-1">
                    <HardDrive className="w-3 h-3 text-gray-400" />
                    <div className="text-gray-400 text-xs uppercase tracking-wide">
                      Disk
                    </div>
                  </div>
                  <div className="text-white font-semibold">
                    {formatBytes(limits.disk)}
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center space-x-2 mb-1">
                    <Cpu className="w-3 h-3 text-gray-400" />
                    <div className="text-gray-400 text-xs uppercase tracking-wide">
                      CPU
                    </div>
                  </div>
                  <div className="text-white font-semibold">{limits.cpu}%</div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="w-3 h-3 text-gray-400" />
                    <div className="text-gray-400 text-xs uppercase tracking-wide">
                      I/O
                    </div>
                  </div>
                  <div className="text-white font-semibold">
                    {limits.io} MB/s
                  </div>
                </div>
              </div>

              {/* Feature Limits & Additional Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex space-x-4 text-gray-400">
                  {panel.feature_limits && (
                    <>
                      <span>DB: {panel.feature_limits.databases}</span>
                      <span>Alloc: {panel.feature_limits.allocations}</span>
                      <span>Backups: {panel.feature_limits.backups}</span>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  {limits.oom_disabled && (
                    <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs border border-blue-700">
                      OOM Disabled
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {EditModal && editingServer && (
        <EditModal
          server={editingServer}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
}
