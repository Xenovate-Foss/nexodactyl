import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Server,
  HardDrive,
  Settings,
  Globe,
  Check,
  Database,
  Cpu,
  MemoryStick,
  Network,
  Zap,
} from "lucide-react";
import {
  getAllEggs,
  getAllNodes,
  userData,
  createServer,
} from "@/components/api";
import { useNavigate } from "react-router-dom";

const ServerCreationWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [serverCreationRes, setServerCreationRes] = useState();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Server Details
    name: "",
    description: "",
    // Server Resources
    ram: 512,
    disk: 1024,
    cpu: 25,
    databases: 0,
    allocations: 0,
    // Server Software
    eggId: null,
    // Node
    nodeId: null,
  });
  const [userDataState, setUserDataState] = useState(null);
  const [eggsData, setEggsData] = useState(null);
  const [nodes, setNodes] = useState(null);
  const [error, setError] = useState(null);

  // Move useNavigate to the top level of the component
  const navigate = useNavigate();

  const steps = [
    { id: 1, title: "Details", icon: Server },
    { id: 2, title: "Resources", icon: HardDrive },
    { id: 3, title: "Software", icon: Settings },
    { id: 4, title: "Node", icon: Globe },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const getUserData = await userData();
        setUserDataState(getUserData);
      } catch (err) {
        setError("Failed to load user data");
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const data = await getAllEggs();
        setEggsData(data);
      } catch (err) {
        setError("Failed to load eggs data");
        console.error("Error fetching eggs:", err);
      }
    };
    fetchEggs();
  }, []);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const nodeData = await getAllNodes();
        setNodes(nodeData);
      } catch (err) {
        setError("Failed to load nodes data");
        console.error("Error fetching nodes:", err);
      }
    };
    fetchNodes();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== "";
      case 2:
        return formData.ram > 0 && formData.disk > 0 && formData.cpu > 0;
      case 3:
        return formData.eggId !== null;
      case 4:
        return formData.nodeId !== null;
      default:
        return false;
    }
  };

  const handleCreateServer = async () => {
    setLoading(true);
    try {
      const res = await createServer(formData);
      setServerCreationRes(res);
      if (res.success) {
        // Now you can use navigate directly
        navigate("/servers", { replace: true });
        console.log("Server created successfully:", res);
      }
    } catch (err) {
      setError("Failed to create server " + err.message);
      console.error("Error creating server:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    // Show loading state while data is being fetched
    if (!userDataState && !error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">{error}</div>
        </div>
      );
    }

    if (userDataState?.resources?.slots === 0) {
      return (
        <div className="text-center py-12">
          <h1 className="text-xl text-red-400">
            Can't create server while having no server slots
          </h1>
        </div>
      );
    }

    if (
      userDataState?.resources?.ram === 0 ||
      userDataState?.resources?.disk === 0 ||
      userDataState?.resources?.cpu === 0
    ) {
      return (
        <div className="text-center py-12">
          <h1 className="text-xl text-red-400">
            Can't create server while having no server resources
          </h1>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="group">
              <label className="block text-blue-300 font-medium mb-3 text-sm uppercase tracking-wider">
                Server Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                placeholder="my-awesome-server"
              />
            </div>
            <div className="group">
              <label className="block text-blue-300 font-medium mb-3 text-sm uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                placeholder="Describe your server..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <MemoryStick className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-blue-300 font-medium text-sm uppercase tracking-wider">
                    Memory
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <input
                    type="range"
                    min="512"
                    max={userDataState?.resources?.ram || 512}
                    step="512"
                    value={formData.ram}
                    onChange={(e) =>
                      handleInputChange("ram", parseInt(e.target.value))
                    }
                    className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="bg-gray-700 px-4 py-2 rounded-lg text-white font-mono text-sm min-w-20 text-center self-center sm:self-auto">
                    {formData.ram}MB
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <HardDrive className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-blue-300 font-medium text-sm uppercase tracking-wider">
                    Storage
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <input
                    type="range"
                    min="1024"
                    max={userDataState?.resources?.disk || 1024}
                    step="1024"
                    value={formData.disk}
                    onChange={(e) =>
                      handleInputChange("disk", parseInt(e.target.value))
                    }
                    className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="bg-gray-700 px-4 py-2 rounded-lg text-white font-mono text-sm min-w-20 text-center self-center sm:self-auto">
                    {(formData.disk / 1024).toFixed(1)}GB
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Cpu className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-blue-300 font-medium text-sm uppercase tracking-wider">
                    CPU Limit
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <input
                    type="range"
                    min="25"
                    max={userDataState?.resources?.cpu || 25}
                    step="25"
                    value={formData.cpu}
                    onChange={(e) =>
                      handleInputChange("cpu", parseInt(e.target.value))
                    }
                    className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="bg-gray-700 px-4 py-2 rounded-lg text-white font-mono text-sm min-w-16 text-center self-center sm:self-auto">
                    {formData.cpu}%
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-blue-300 font-medium text-sm uppercase tracking-wider">
                    Databases
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => handleInputChange("databases", 0)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base ${
                      formData.databases === 0
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    0
                  </button>
                  {Array.from(
                    { length: userDataState?.resources?.databases || 0 },
                    (_, index) => {
                      const num = index + 1;
                      return (
                        <button
                          key={num}
                          onClick={() => handleInputChange("databases", num)}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base ${
                            formData.databases === num
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Network className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-blue-300 font-medium text-sm uppercase tracking-wider">
                    Allocations
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => handleInputChange("allocations", 0)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base ${
                      formData.allocations === 0
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    0
                  </button>
                  {Array.from(
                    { length: userDataState?.resources?.allocations || 0 },
                    (_, index) => {
                      const num = index + 1;
                      return (
                        <button
                          key={num}
                          onClick={() => handleInputChange("allocations", num)}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base ${
                            formData.allocations === num
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        if (!eggsData || !eggsData.data) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading eggs...</div>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {eggsData.data.map((egg) => (
              <div
                key={egg.id}
                onClick={() => handleInputChange("eggId", egg.eggId)}
                className={`group relative bg-gray-800/50 border rounded-2xl p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  formData.eggId === egg.eggId
                    ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    egg?.color || "from-blue-500 to-purple-500"
                  } opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}
                ></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16">
                      {egg.img ? (
                        <img
                          src={egg.img}
                          alt={egg.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                          <Settings className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {formData.eggId === egg.eggId && (
                      <div className="bg-blue-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {egg.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {egg.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 4:
        if (!nodes || !nodes.data) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading nodes...</div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {nodes.data.map((node) => (
              <div
                key={node.id}
                onClick={() => handleInputChange("nodeId", node.nodeId)}
                className={`group relative bg-gray-800/50 border rounded-2xl p-4 sm:p-6 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl ${
                  formData.nodeId === node.nodeId
                    ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <div className="relative flex-shrink-0">
                      {node.location && (
                        <img
                          src={`https://flagsapi.com/${node.location}/flat/64.png`}
                          alt={`${node.name} flag`}
                          className="w-10 h-7 sm:w-12 sm:h-8 rounded-lg shadow-lg"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          {node.name}
                        </h3>
                        <span className="text-xs sm:text-sm text-gray-400">
                          #{node.nodeId}
                        </span>
                        {formData.nodeId === node.nodeId && (
                          <div className="bg-blue-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm sm:text-base truncate">
                        {node.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Create Server
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Deploy your new server!
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 sm:mb-12 overflow-x-auto">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 min-w-max px-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center group">
                    <div
                      className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 shadow-lg shadow-green-500/25"
                          : isActive
                          ? "bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/25"
                          : "bg-gray-800 border-gray-700 group-hover:border-gray-600"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      ) : (
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      )}
                    </div>
                    <span
                      className={`mt-2 sm:mt-3 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                        isActive
                          ? "text-blue-400"
                          : isCompleted
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 sm:w-20 h-1 rounded-full transition-all duration-500 ${
                        currentStep > step.id
                          ? "bg-gradient-to-r from-green-500 to-blue-500"
                          : "bg-gray-700"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-gray-700 min-h-80 sm:min-h-96">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-6 sm:mb-8 flex items-center">
            {React.createElement(steps[currentStep - 1]?.icon, {
              className: "w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mr-3 sm:mr-4",
            })}
            {steps[currentStep - 1]?.title}
          </h2>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-gray-700 order-2 sm:order-1"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 order-1 sm:order-2"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              disabled={!canProceed() || loading}
              className="flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 order-1 sm:order-2"
              onClick={handleCreateServer}
            >
              <Server className="w-5 h-5 mr-2" />
              {loading ? "Creating..." : "Deploy Server"}
            </button>
          )}
        </div>

        {/* Server Creation Response */}
        {serverCreationRes && (
          <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">
              Server Creation Result:
            </h3>
            <pre className="text-gray-300 text-sm overflow-x-auto">
              {JSON.stringify(serverCreationRes, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        @media (min-width: 640px) {
          .slider::-webkit-slider-thumb {
            height: 24px;
            width: 24px;
          }

          .slider::-moz-range-thumb {
            height: 24px;
            width: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default ServerCreationWizard;
