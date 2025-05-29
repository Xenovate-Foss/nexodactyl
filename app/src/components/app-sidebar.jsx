import { useState, useEffect } from "react";
import { Sidebar, Menu, MenuItem, sidebarClasses } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import {
  Menu as MenuIcon,
  Home,
  ShoppingCart,
  Phone,
  Server,
  Settings,
  User,
  LogOut,
  ShieldUser,
  Egg,
  ServerCog,
  PackagePlus,
  StretchHorizontal,
  UserRoundCog,
} from "lucide-react";
import { config, userData } from "@/components/api";
import { useAuth } from "@/context/AuthProvider";
import { ServerCogIcon } from "lucide-react";
import { ServerCrash } from "lucide-react";
import { Merge } from "lucide-react";

function SidebarMenu() {
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [appName, setAppName] = useState("Nexodactyl");
  const [shortName, setShortName] = useState("Nexo");
  const { user, logout } = useAuth();
  const [banner, setBanner] = useState(
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMPvGURvA8mHv-U4JG4IGlveK_l7l2dSfj3teaHlyzCyzD9kbhM6JBtrM&s=10"
  );
  const [admin, setAdmin] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fixed: Removed async from useEffect and properly handled the async call
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await config();
        if (data.app_name) {
          setAppName(data.app_name);
          document.title = data.app_name;
        }
        if (data.short_name) {
          setShortName(data.short_name);
        }
        if (data.app_banner) {
          setBanner(data.app_banner);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();

    const getUserData = async () => {
      const data = await userData();
      setAdmin(data?.user?.root_admin);
    };

    getUserData();
  }, []); // Fixed: Removed dependencies that would cause infinite loops

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Menu items array
  const menuItems = [
    { name: "Dashboard", icon: <Home size={20} />, link: "/" },
    { name: "Servers", icon: <Server size={20} />, link: "/servers" }, // Fixed: Changed from /profile to /servers
    { name: "Shop", icon: <ShoppingCart size={20} />, link: "/shop" }, // Fixed: Changed from /about to /shop
    { name: "Credentials", icon: <User size={20} />, link: "/credentials" }, // Fixed: Changed icon and link
    { name: "Settings", icon: <Settings size={20} />, link: "/settings" },
  ];

  return (
    <div className="flex h-screen z-99999">
      <div className="relative">
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-[-40px] bg-blue-600 p-2 rounded-r text-white z-10 hover:bg-blue-700 transition-colors"
        >
          <MenuIcon size={20} />
        </button>

        <Sidebar
          collapsed={collapsed}
          width="240px"
          collapsedWidth={isMobile ? "0px" : "80px"}
          rootStyles={{
            [`.${sidebarClasses.container}`]: {
              backgroundColor: "#111827", // Dark background
            },
            height: "100%",
            border: "none",
            color: "#ffffff",
            boxShadow: "2px 0 10px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease-in-out",
          }}
        >
          <div className="p-4 text-center border-b border-gray-800 bg-gray-900">
            <h1
              className={`font-bold ${
                collapsed && !isMobile ? "text-sm" : "text-xl"
              } transition-all text-white`}
            >
              {collapsed && !isMobile ? shortName : appName}
            </h1>
            {!collapsed && (
              <div className="mt-3 mb-1">
                <img
                  className="rounded-xl shadow-lg mx-auto border-2 border-blue-500"
                  src={banner}
                  alt="Banner"
                  style={{ maxWidth: "200px" }}
                />
              </div>
            )}
          </div>

          <Menu
            menuItemStyles={{
              button: {
                color: "#cbd5e1",
                padding: "12px 24px",
                borderRadius: "8px",
                margin: "8px",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                "&:hover": {
                  backgroundColor: "#1e293b",
                  color: "#ffffff",
                },
                "&.active": {
                  backgroundColor: "#2563eb", // Blue active state
                  color: "#ffffff",
                  fontWeight: "bold",
                },
              },
              icon: {
                marginRight: collapsed && !isMobile ? "0" : "12px",
                color: "#3b82f6", // Blue icon color
              },
            }}
          >
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                icon={item.icon}
                component={<Link to={item.link} />}
                className="mt-2"
              >
                {item.name}
              </MenuItem>
            ))}
            {admin && (
              <>
                <h2 className="items-center text-center">Admin section </h2>
                <MenuItem
                  key="admin-egg"
                  icon={<Egg />}
                  component={<Link to="/admin/egg" />}
                >
                  Eggs
                </MenuItem>
                <MenuItem
                  icon={<ServerCog />}
                  component={<Link to="/admin/node" />}
                >
                  Nodes
                </MenuItem>
                <MenuItem icon={<PackagePlus />}>Products</MenuItem>
                <MenuItem
                  icon={<UserRoundCog />}
                  component={<Link to="/admin/user" />}
                >
                  Users
                </MenuItem>
                <MenuItem icon={<StretchHorizontal />}>Resources</MenuItem>
                <MenuItem icon={<ServerCrash />}>Servers</MenuItem>
                <MenuItem icon={<Merge />}>Purger</MenuItem>
              </>
            )}
          </Menu>

          <div className="absolute top-full bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900 sticky">
            {!collapsed && (
              <div className="flex justify-between items-center mb-2 static">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    U
                  </div>
                  <span className="ml-2 text-sm text-gray-300">
                    {user?.username}
                  </span>
                </div>
                <LogOut
                  size={18}
                  className="text-gray-400 hover:text-white cursor-pointer"
                  onClick={logout}
                />
              </div>
            )}
            <p
              className={`text-gray-400 text-xs ${
                collapsed && !isMobile ? "text-center" : ""
              }`}
            >
              {collapsed && !isMobile ? "v1.0" : "App Version 1.0"}
            </p>
          </div>
        </Sidebar>
      </div>
    </div>
  );
}

export default SidebarMenu;
