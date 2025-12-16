import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Sparkles, History, Zap } from "lucide-react";
import CreateJob from "./pages/CreateJob";
import JobHistory from "./pages/JobHistory";
import JobDetail from "./pages/JobDetail";
import { cn } from "@/lib/utils";

function NavLink({
  to,
  children,
  icon: Icon,
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to === "/" && location.pathname.startsWith("/jobs/"));

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/20 text-primary-400"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl group-hover:bg-primary/50 transition-all duration-300" />
              <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight">
                Genesis AI
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1">
                Multimodal Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <NavLink to="/" icon={Sparkles}>
              Create
            </NavLink>
            <NavLink to="/history" icon={History}>
              History
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        {/* Background gradient effects */}
        <div className="fixed inset-0 bg-hero-gradient opacity-50" />
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <Navigation />

        <main className="relative pt-24 pb-12">
          <div className="max-w-7xl mx-auto px-6">
            <Routes>
              <Route path="/" element={<CreateJob />} />
              <Route path="/history" element={<JobHistory />} />
              <Route path="/jobs/:jobId" element={<JobDetail />} />
            </Routes>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative border-t border-border py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>© 2024 Genesis AI Platform</p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-success rounded-full animate-pulse" />
                All systems operational
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
