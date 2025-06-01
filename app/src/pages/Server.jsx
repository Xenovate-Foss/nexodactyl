import Servers from "@/components/servers";

export default function ServerManager() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-1 p-5 bg-gray-700 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Manage Servers</h1>
        <p className="text-gray-300">
          Configure, Edit, Delete, Create Your servers
        </p>
      </div>
      <div className="grid bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-xl">Servers you own</h1>
        <p className="text-gray-700 mb-2"></p>
        <div className="gap-6">
          <Servers />
        </div>
      </div>
    </div>
  );
}
