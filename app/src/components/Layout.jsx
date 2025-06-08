import Sidebar from "@/components/app-sidebar";
import Footer from "@/components/footer";

const Layout = ({ children }) => (
  <div className="flex w-full">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <main className="flex-1 item-center">{children}</main>
      <Footer />
    </div>
  </div>
);

export default Layout;
