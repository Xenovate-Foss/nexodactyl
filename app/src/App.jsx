import Sidebar from "@/components/app-sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Footer from "@/components/footer";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import { AuthProvider } from "@/context/AuthProvider";
import PrivateRoute from "@/components/PrivateRoute";
import Register from "@/pages/Register"

function App() {
  return (
    <AuthProvider>
      <div className="bg-black min-h-screen w-full flex">
        <Router>
          <Routes>
            {/* Public Route - Login */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
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
