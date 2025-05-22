import React from "react";
import { useAuth } from "@/context/AuthProvider";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {user?.name}</span>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl mb-4">Protected Content</h2>
        <p>This content is only visible to authenticated users.</p>
        <div className="mt-4 text-sm text-gray-300">
          <p>User ID: {user?.id}</p>
          <p>Email: {user?.email}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
