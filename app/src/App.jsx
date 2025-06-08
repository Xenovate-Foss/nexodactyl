import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import PrivateRoute from "@/components/PrivateRoute";
import Layout from "@/components/Layout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import ServerManager from "./pages/Server";
import EggDash from "@/pages/admin/Egg";
import NodeDash from "@/pages/admin/Nodes";
import UserDash from "@/pages/admin/Users";
import Resources from "./pages/admin/Resources";
import ServerCreationWizard from "./pages/CreateServer";
import AdminServers from "./pages/admin/Servers";
import Purger from "./pages/admin/purger";

const ProtectedPage = ({ children, adminRequired = false }) => (
  <PrivateRoute adminRequired={adminRequired}>
    <Layout>{children}</Layout>
  </PrivateRoute>
);

function App() {
  return (
    <AuthProvider>
      <div className="bg-black min-h-screen w-full flex">
        <Router>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            <Route
              path="/"
              element={
                <ProtectedPage>
                  <Dashboard />
                </ProtectedPage>
              }
            />
            <Route
              path="/servers"
              element={
                <ProtectedPage>
                  <ServerManager />
                </ProtectedPage>
              }
            />

            <Route
              path="/admin/egg"
              element={
                <ProtectedPage adminRequired>
                  <EggDash />
                </ProtectedPage>
              }
            />
            <Route
              path="/admin/node"
              element={
                <ProtectedPage adminRequired>
                  <NodeDash />
                </ProtectedPage>
              }
            />
            <Route
              path="/admin/user"
              element={
                <ProtectedPage adminRequired>
                  <UserDash />
                </ProtectedPage>
              }
            />
            <Route
              path="/admin/resources"
              element={
                <ProtectedPage adminRequired>
                  <Resources />
                </ProtectedPage>
              }
            />
            <Route
              path="/create-server"
              element={
                <ProtectedPage>
                  <ServerCreationWizard />
                </ProtectedPage>
              }
            />
            <Route
              path="/admin/servers"
              element={
                <ProtectedPage adminRequired>
                  <AdminServers />
                </ProtectedPage>
              }
            />
            <Route
              path="/admin/purger"
              element={
                <ProtectedPage adminRequired>
                  <Purger />
                </ProtectedPage>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
