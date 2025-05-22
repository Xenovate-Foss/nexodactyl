import Sidebar from "@/components/app-sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Footer from "@/components/footer";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    <div className="bg-black min-h-screen flex">
  <Router>
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <main className="flex-1 item-center">
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  </Router>
</div>
  );
}

export default App;
