import Sidebar from "@/components/app-sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Footer from "@/components/footer";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import { AuthProvider } from "@/context/AuthProvider";
import PrivateRoute from "@/components/PrivateRoute";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import EggDash from "@/pages/admin/Egg";
import NodeDash from "@/pages/admin/Nodes";
import UserDash from "@/pages/admin/Users";
import Resources from "./pages/admin/Resources";
import ServerManager from "./pages/Server";

function App() {
  return (
    <AuthProvider>
      <div className="bg-black min-h-screen w-full flex">
        <Router>
          <Routes>
            {/* Public Route - Login */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
            {/* Private Routes - Protected by authentication */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <Dashboard />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/servers"
              element={
                <PrivateRoute>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <ServerManager />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/egg"
              element={
                <PrivateRoute adminRequired={true}>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <EggDash />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/node"
              element={
                <PrivateRoute adminRequired={true}>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <NodeDash />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/user"
              element={
                <PrivateRoute adminRequired={true}>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <UserDash />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/resources"
              element={
                <PrivateRoute adminRequired={true}>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <Resources />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              }
            />

            {/* Add more private routes here as needed */}
            {/* 
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <div className="flex w-full">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 item-center">
                        <Profile />
                      </main>
                      <Footer />
                    </div>
                  </div>
                </PrivateRoute>
              } 
            />
            */}
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
