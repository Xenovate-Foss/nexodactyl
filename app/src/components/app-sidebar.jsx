import { useState, useEffect } from "react";
import { Sidebar, Menu, MenuItem, sidebarClasses } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import {
  Menu as MenuIcon,
  Home,
  Info,
  Phone,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import { duration } from "@mui/material";

function SidebarMenu() {
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <motion.div
      className="flex h-screen"
      layoutId="underline"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.8, ease: "easeInOut" },
      }}
    >
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
              {collapsed && !isMobile ? "App" : "My Application"}
            </h1>
            {!collapsed && (
              <div className="mt-3 mb-1">
                <img
                  className="rounded-xl shadow-lg mx-auto border-2 border-blue-500"
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7B_F64nWwBgzKqjlNZixSl9yFDtUiR2jiTgEsNJzOkA&s"
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
            <MenuItem
              icon={<Home size={20} />}
              component={<Link to="/" />}
              className="mt-4"
            >
              Home
            </MenuItem>
            <MenuItem
              icon={<Info size={20} />}
              component={<Link to="/about" />}
            >
              About
            </MenuItem>
            <MenuItem
              icon={<Phone size={20} />}
              component={<Link to="/contact" />}
            >
              Contact
            </MenuItem>
            <MenuItem
              icon={<User size={20} />}
              component={<Link to="/profile" />}
            >
              Profile
            </MenuItem>
            <MenuItem
              icon={<Settings size={20} />}
              component={<Link to="/settings" />}
            >
              Settings
            </MenuItem>
          </Menu>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900">
            {!collapsed && (
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    U
                  </div>
                  <span className="ml-2 text-sm text-gray-300">User</span>
                </div>
                <LogOut
                  size={18}
                  className="text-gray-400 hover:text-white cursor-pointer"
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

      {/* This is a placeholder for your main content */}
      <div className="flex-1 p-6 bg-gray-900">
        <div className="bg-gray-500 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">
            Welcome to your dashboard
          </h2>
          <p className="text-gray-100">
            This is where your main content will go. The sidebar has been styled
            with a dark background and blue accents.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default SidebarMenu;
