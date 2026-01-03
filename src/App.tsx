import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeDebugBadge } from "@/components/ThemeDebugBadge";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalAuthProvider } from "@/hooks/usePortalAuth";
import { AnalyticsProvider } from "@/hooks/useAnalytics";

// Public pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";

// Portal pages
import Login from "./pages/portal/Login";
import Signup from "./pages/portal/Signup";
import PendingApproval from "./pages/portal/PendingApproval";
import RejectedStatus from "./pages/portal/RejectedStatus";
import StudentDashboard from "./pages/portal/StudentDashboard";
import StudentProfile from "./pages/portal/StudentProfile";
import InstructorDashboard from "./pages/portal/InstructorDashboard";
import InstructorStudentView from "./pages/portal/InstructorStudentView";
import ReportCardForm from "./pages/portal/ReportCardForm";
import AdminDashboard from "./pages/portal/AdminDashboard";
import AdminApprovals from "./pages/portal/AdminApprovals";
import AdminSchedule from "./pages/portal/AdminSchedule";
import AdminAssignments from "./pages/portal/AdminAssignments";
import AdminReportCards from "./pages/portal/AdminReportCards";
import AdminLeads from "./pages/portal/AdminLeads";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <AuthProvider>
        <PortalAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ThemeDebugBadge />
            <BrowserRouter>
              <AnalyticsProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Portal Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  <Route path="/rejected" element={<RejectedStatus />} />
                  
                  {/* Student Portal */}
                  <Route path="/student" element={<StudentDashboard />} />
                  <Route path="/student/profile" element={<StudentProfile />} />
                  
                  {/* Instructor Portal */}
                  <Route path="/instructor" element={<InstructorDashboard />} />
                  <Route path="/instructor/students" element={<InstructorDashboard />} />
                  <Route path="/instructor/students/:id" element={<InstructorStudentView />} />
                  <Route path="/instructor/report-cards/new" element={<ReportCardForm />} />
                  <Route path="/instructor/report-cards/edit/:id" element={<ReportCardForm />} />
                  
                  {/* Admin Portal */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/approvals" element={<AdminApprovals />} />
                  <Route path="/admin/schedule" element={<AdminSchedule />} />
                  <Route path="/admin/assignments" element={<AdminAssignments />} />
                  <Route path="/admin/report-cards" element={<AdminReportCards />} />
                  <Route path="/admin/leads" element={<AdminLeads />} />
                  <Route path="/admin/users/students" element={<AdminApprovals />} />
                  <Route path="/admin/users/instructors" element={<AdminApprovals />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  
                  {/* Legacy Admin */}
                  <Route path="/old-admin" element={<Admin />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnalyticsProvider>
            </BrowserRouter>
          </TooltipProvider>
        </PortalAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
