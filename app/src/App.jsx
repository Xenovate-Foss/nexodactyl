import Sidebar from "@/components/app-sidebar";
import { BrowserRouter as Router } from "react-router-dom";

function App() {
  return (
    <div className="bg-black h-full w-full">
      <Router>
        <Sidebar />
      </Router>
    </div>
  );
}

export default App;
