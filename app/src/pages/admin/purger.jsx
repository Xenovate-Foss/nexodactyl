import React, { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
} from "lucide-react";

// API functions
const purgerAPI = {
  startPurge: async (keywords, batchSize = 5) => {
    const response = await fetch("/api/admin/purger/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, batch_size: batchSize }),
    });
    return response.json();
  },

  getJobStatus: async (jobId) => {
    const response = await fetch(`/api/admin/purger/status/${jobId}`);
    return response.json();
  },
};

// Simple Alert component
const Alert = ({ type, children, onClose }) => {
  const styles = {
    error: "bg-red-900 border-red-700 text-red-100",
    warning: "bg-yellow-900 border-yellow-700 text-yellow-100",
    success: "bg-green-900 border-green-700 text-green-100",
    info: "bg-blue-900 border-blue-700 text-blue-100",
  };

  const icons = {
    error: <XCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    info: <Shield className="h-5 w-5" />,
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 ${styles[type]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {icons[type]}
          <div className="flex-1">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xl font-bold hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Progress component
const Progress = ({ current, total, label }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span>{label}</span>
        <span>
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function ServerPurger() {
  const [keywords, setKeywords] = useState("");
  const [batchSize, setBatchSize] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Poll job status
  useEffect(() => {
    let interval;
    if (
      currentJob &&
      (currentJob.status === "started" || currentJob.status === "processing")
    ) {
      interval = setInterval(async () => {
        try {
          const response = await purgerAPI.getJobStatus(currentJob.id);
          if (response.success) {
            setCurrentJob(response.job);

            if (response.job.status === "completed") {
              setSuccess(
                `✅ Purge completed! Deleted ${response.job.progress.deleted} servers (preserved servers with keyword "${keywords}").`
              );
              setIsRunning(false);
            } else if (response.job.status === "failed") {
              setError(`❌ Purge failed: ${response.job.error}`);
              setIsRunning(false);
            }
          }
        } catch (err) {
          console.error("Error polling job:", err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentJob, keywords]);

  const startPurge = async () => {
    if (!keywords.trim()) {
      setError("Please enter a keyword to protect servers");
      return;
    }

    setIsRunning(true);
    setError("");
    setSuccess("");
    setCurrentJob(null);

    try {
      const response = await purgerAPI.startPurge(keywords, batchSize);

      if (response.success) {
        setCurrentJob({
          id: response.job_id,
          status: "started",
          progress: {
            processed: 0,
            deleted: 0,
            failed: 0,
            total: response.total_servers,
          },
          started_at: new Date().toISOString(),
        });
        setSuccess(
          `🚀 Purge started! Protecting servers with "${keywords}" keyword.`
        );
      } else {
        setError(response.error || "Failed to start purge");
        setIsRunning(false);
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
      setIsRunning(false);
    }
  };

  const refreshStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await purgerAPI.getJobStatus(currentJob.id);
      if (response.success) {
        setCurrentJob(response.job);
      }
    } catch (err) {
      setError(`Failed to refresh status: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="h-8 w-8 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold">Server Purger</h1>
            <p className="text-gray-300 text-sm">
              Delete servers that DON'T contain specific keywords
            </p>
          </div>
        </div>

        <Alert type="warning">
          <div>
            <strong>How it works:</strong>
            <ul className="text-sm mt-2 space-y-1">
              <li>
                • Servers WITH your keyword ={" "}
                <strong className="text-green-400">PROTECTED</strong> (kept
                safe)
              </li>
              <li>
                • Servers WITHOUT your keyword ={" "}
                <strong className="text-red-400">DELETED</strong> (removed)
              </li>
            </ul>
          </div>
        </Alert>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" onClose={() => setError("")}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Main Form */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Purge Settings</h2>

        <div className="space-y-4">
          {/* Protection Keyword */}
          <div>
            <label className="block text-sm font-medium mb-2">
              🛡️ Protection Keyword <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., 'important', 'production', 'keep'"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
            <p className="text-xs text-gray-400 mt-1">
              Servers containing this keyword will be{" "}
              <strong className="text-green-400">preserved</strong>. All others
              will be deleted.
            </p>
          </div>

          {/* Batch Size */}
          <div>
            <label className="block text-sm font-medium mb-2">Batch Size</label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-32 p-2 bg-gray-700 border border-gray-600 rounded-lg"
              disabled={isRunning}
            >
              <option value={1}>1 (Slow)</option>
              <option value={3}>3</option>
              <option value={5}>5 (Default)</option>
              <option value={10}>10 (Fast)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              How many servers to process at once
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={startPurge}
            disabled={isRunning || !keywords.trim()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors w-full justify-center"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Purge (Protect "{keywords}")
              </>
            )}
          </button>
        </div>
      </div>

      {/* Job Status */}
      {currentJob && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Job Status</h3>
            <button
              onClick={refreshStatus}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Refresh Status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span>Status:</span>
              <div className="flex items-center gap-2">
                {currentJob.status === "processing" && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                )}
                {currentJob.status === "completed" && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
                {currentJob.status === "failed" && (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="capitalize font-medium">
                  {currentJob.status}
                </span>
              </div>
            </div>

            {/* Progress */}
            {currentJob.progress && (
              <div>
                <Progress
                  current={currentJob.progress.processed}
                  total={currentJob.progress.total}
                  label="Servers Processed"
                />

                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <div className="text-green-400 font-bold text-xl">
                      {currentJob.progress.deleted}
                    </div>
                    <div className="text-gray-400">Deleted</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <div className="text-red-400 font-bold text-xl">
                      {currentJob.progress.failed}
                    </div>
                    <div className="text-gray-400">Failed</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <div className="text-blue-400 font-bold text-xl">
                      {currentJob.progress.total -
                        currentJob.progress.processed}
                    </div>
                    <div className="text-gray-400">Remaining</div>
                  </div>
                </div>
              </div>
            )}

            {/* Job Info */}
            <div className="text-xs text-gray-500 bg-gray-700 p-3 rounded-lg">
              <div>
                <strong>Job ID:</strong> {currentJob.id}
              </div>
              <div>
                <strong>Started:</strong>{" "}
                {new Date(currentJob.started_at).toLocaleString()}
              </div>
              {currentJob.completed_at && (
                <div>
                  <strong>Completed:</strong>{" "}
                  {new Date(currentJob.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          Quick Guide
        </h3>

        <div className="text-sm text-gray-300 space-y-2">
          <div>
            <strong>Example:</strong> If you enter "prod" as the keyword:
          </div>
          <ul className="ml-4 space-y-1">
            <li>
              ✅ "my-prod-server" → <span className="text-green-400">KEPT</span>{" "}
              (contains "prod")
            </li>
            <li>
              ✅ "production-db" → <span className="text-green-400">KEPT</span>{" "}
              (contains "prod")
            </li>
            <li>
              ❌ "test-server" → <span className="text-red-400">DELETED</span>{" "}
              (doesn't contain "prod")
            </li>
            <li>
              ❌ "demo-app" → <span className="text-red-400">DELETED</span>{" "}
              (doesn't contain "prod")
            </li>
          </ul>

          <div className="mt-4 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
            <strong>⚠️ Warning:</strong> This action cannot be undone. Make sure
            your keyword correctly identifies the servers you want to keep!
          </div>
        </div>
      </div>
    </div>
  );
}
