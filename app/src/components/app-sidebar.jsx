import { useState } from "react";
import { Sidebar, Menu, MenuItem, sidebarClasses } from "react-pro-sidebar";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, Home, Info, Phone } from "lucide-react";

function SidebarMenu() {
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive behavior
  window.addEventListener("resize", () => {
    setIsMobile(window.innerWidth < 768);
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  });

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="flex h-screen">
      <div className="relative">
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-[-40px] bg-gray-800 p-2 rounded-r text-white z-10"
        >
          <MenuIcon size={20} />
        </button>

        <Sidebar
          collapsed={collapsed}
          width="240px"
          backgroundColor="#121212"
          collapsedWidth={isMobile ? "0px" : "80px"}
          rootStyles={{
            [`.${sidebarClasses.container}`]: {
              backgroundColor: "#121212",
            },
            height: "100%",
            border: "none",
            backgroundColor: "#ffffff", // Dark blue background
            color: "#ffffff",
            boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease-in-out",
          }}
        >
          <div className="p-4 text-center bg-dark border-b border-gray-900">
            <h1
              className={`font-bold ${
                collapsed && !isMobile ? "text-sm" : "text-xl"
              } transition-all bg-dark`}
            >
              {collapsed && !isMobile ? "App" : "My Application"}
            </h1>
          </div>

          <Menu
            menuItemStyles={{
              button: {
                color: "#fff12",
                padding: "12px 24px",
                borderRadius: "4px",
                margin: "8px",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                "&:hover": {
                  backgroundColor: "#334155",
                  color: "#F8FAFC",
                },
                "&.active": {
                  backgroundColor: "#3B82F6",
                  color: "#F8FAFC",
                  fontWeight: "bold",
                },
              },
              icon: {
                marginRight: collapsed && !isMobile ? "0" : "12px",
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
          </Menu>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
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
      <div className="flex-1 p-6 bg-gray-100">
        {/* Your page content will be rendered here */}
      </div>
    </div>
  );
}

export default SidebarMenu;
