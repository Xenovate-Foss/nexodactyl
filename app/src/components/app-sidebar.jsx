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
  ServerCrash,
  Merge,
} from "lucide-react";
import { config, userData } from "@/components/api";
import { useAuth } from "@/context/AuthProvider";
import { Coins } from "lucide-react";

// Function to generate Gravatar URL using Web Crypto API
const getGravatarUrl = async (email, size = 80) => {
  if (!email) return null;

  try {
    // Use Web Crypto API for proper MD5-like hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Use first 32 characters to simulate MD5 length
    const emailHash = hashHex;
    return `https://2.gravatar.com/avatar/${emailHash}?s=512&d=initials`;
  } catch (error) {
    console.error("Error generating gravatar URL:", error);
    return null;
  }
};

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
  const [userDataState, setUserDataState] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);

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

  // Fetch configuration and user data
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await config();
        window.dispatchEvent(new CustomEvent("config", data));
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
      try {
        const data = await userData();
        setAdmin(data?.user?.root_admin);
        setUserDataState(data);

        // Generate profile picture URL from email
        if (data?.user?.email) {
          const gravatarUrl = await getGravatarUrl(data.user.email, 32);
          setProfilePicUrl(gravatarUrl);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Menu items array
  const menuItems = [
    { name: "Dashboard", icon: <Home size={20} />, link: "/" },
    { name: "Servers", icon: <Server size={20} />, link: "/servers" },
    { name: "Store", icon: <ShoppingCart size={20} />, link: "/store" },
    { name: "Credentials", icon: <User size={20} />, link: "/credentials" },
    { name: "Settings", icon: <Settings size={20} />, link: "/settings" },
  ];

  // Admin menu items
  const adminMenuItems = [
    { name: "Eggs", icon: <Egg size={20} />, link: "/admin/egg" },
    { name: "Nodes", icon: <ServerCog size={20} />, link: "/admin/node" },
    {
      name: "Products",
      icon: <PackagePlus size={20} />,
      link: "/admin/products",
    },
    { name: "Users", icon: <UserRoundCog size={20} />, link: "/admin/user" },
    {
      name: "Resources",
      icon: <StretchHorizontal size={20} />,
      link: "/admin/resources",
    },
    {
      name: "Servers",
      icon: <ServerCrash size={20} />,
      link: "/admin/servers",
    },
    { name: "Purger", icon: <Merge size={20} />, link: "/admin/purger" },
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
              backgroundColor: "#111827",
            },
            height: "100%",
            border: "none",
            color: "#ffffff",
            boxShadow: "2px 0 10px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease-in-out",
          }}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 text-center border-b border-gray-800 bg-gray-900 flex-shrink-0">
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

            <div className="flex-1 overflow-y-auto pb-20">
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
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      fontWeight: "bold",
                    },
                  },
                  icon: {
                    marginRight: collapsed && !isMobile ? "0" : "12px",
                    color: "#3b82f6",
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
                    <div className="px-6 py-4 mt-6">
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {collapsed && !isMobile ? "Admin" : "Admin Section"}
                      </h2>
                    </div>
                    {adminMenuItems.map((item, index) => (
                      <MenuItem
                        key={`admin-${index}`}
                        icon={item.icon}
                        component={<Link to={item.link} />}
                        className="mt-2"
                      >
                        {item.name}
                      </MenuItem>
                    ))}
                  </>
                )}
              </Menu>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900">
              {!collapsed && (
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border-2 border-blue-500"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold"
                      style={{ display: profilePicUrl ? "none" : "flex" }}
                    >
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="ml-2 text-sm text-gray-300">
                      {user?.username}{" "}
                      <span className="flex gap-2 text-yellow-700">
                        {userDataState?.resources?.coins} <Coins />
                      </span>
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
          </div>
        </Sidebar>
      </div>
    </div>
  );
}

export default SidebarMenu;
