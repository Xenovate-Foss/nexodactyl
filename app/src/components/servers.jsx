import { getAllServers } from "./api";
import { useState, useEffect } from "react";

export default function Servers({ limit }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getServers = async () => {
      try {
        setLoading(true);
        setError(null);
        const { servers } = await getAllServers();
        if (servers) {
          // Apply limit if provided
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
  }, [limit]); // Add limit to dependencies

  // Early returns for loading and error states
  if (loading) {
    return <div>Loading servers...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!servers || servers.length === 0) {
    return <div>No servers found</div>;
  }

  // Render the servers list
  return (
    <div>
      <h2>Servers</h2>
      <ul>
        {servers.map((server, index) => (
          <li key={server.id || index} className="bg-gray-700 p-4 rounded-lg">
            {server.name || `Server ${index + 1}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
