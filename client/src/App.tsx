import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import NotFound from "@/pages/not-found";

import Home from "./pages/Home";
import NewChecklist from "./pages/NewChecklist";
import Dashboard from "./pages/Dashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminLogin from "./pages/AdminLogin";
import GuideAdmin from "./pages/GuideAdmin";
import EditChecklist from "./pages/EditChecklist";
import QualityBulkEdit from "./pages/QualityBulkEdit";
import CleaningChecklist from "./pages/CleaningChecklist";
import GuidesPage from "./pages/GuidesPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/guides" component={GuidesPage} />
      <Route path="/checklist/new" component={NewChecklist} />
      <Route path="/checklist/edit/:id" component={EditChecklist} />
      <Route path="/checklist/quality-edit/:id" component={QualityBulkEdit} />
      <Route path="/staff-dashboard" component={StaffDashboard} />
      <Route path="/cleaning/new" component={CleaningChecklist} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/guides" component={GuideAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    (window as any).__openLightbox = (src: string) => setLightboxSrc(src);
    return () => { delete (window as any).__openLightbox; };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
