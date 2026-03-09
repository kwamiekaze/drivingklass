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
import ForgotPassword from "./pages/portal/ForgotPassword";
import ResetPassword from "./pages/portal/ResetPassword";
import PendingApproval from "./pages/portal/PendingApproval";
import RejectedStatus from "./pages/portal/RejectedStatus";
import StudentDashboard from "./pages/portal/StudentDashboard";
import StudentProfile from "./pages/portal/StudentProfile";
import Profile from "./pages/portal/Profile";
import ProfileRedirect from "./pages/portal/ProfileRedirect";
import IntakeForm, { AdminIntakeEdit } from "./pages/portal/IntakeForm";
import InstructorDashboard from "./pages/portal/InstructorDashboard";
import InstructorStudentView from "./pages/portal/InstructorStudentView";
import ReportCardForm from "./pages/portal/ReportCardForm";
import ReportCardView from "./pages/portal/ReportCardView";
import ReportCardOpen from "./pages/portal/ReportCardOpen";
import AdminDashboard from "./pages/portal/AdminDashboard";
import AdminApprovals from "./pages/portal/AdminApprovals";
import AdminSchedule from "./pages/portal/AdminSchedule";
import AdminAssignments from "./pages/portal/AdminAssignments";
import AdminReportCards from "./pages/portal/AdminReportCards";
import AdminLeads from "./pages/portal/AdminLeads";
import AdminQA from "./pages/portal/AdminQA";
import AdminMessages from "./pages/portal/AdminMessages";
import AdminStudents from "./pages/portal/AdminStudents";
import AdminInstructors from "./pages/portal/AdminInstructors";
import AdminPermitQueue from "./pages/portal/AdminPermitQueue";
import AdminMap from "./pages/portal/AdminMap";
import InstructorMap from "./pages/portal/InstructorMap";
import DrivingGamePage from "./pages/DrivingGame";
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
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  <Route path="/rejected" element={<RejectedStatus />} />
                  
                  {/* Intake Form (separate from profile) */}
                  <Route path="/intake" element={<IntakeForm />} />
                  <Route path="/intake-form" element={<IntakeForm />} />
                  
                  {/* Admin Intake Edit */}
                  <Route path="/admin/intake-edit" element={<AdminIntakeEdit />} />
                  
                  {/* Canonical Profile Route (all roles) */}
                  <Route path="/profile" element={<Profile />} />
                  
                  {/* Legacy Profile Redirects */}
                  <Route path="/student/profile" element={<ProfileRedirect />} />
                  <Route path="/instructor/profile" element={<ProfileRedirect />} />
                  <Route path="/admin/profile" element={<ProfileRedirect />} />
                  <Route path="/staff/profile" element={<ProfileRedirect />} />
                  <Route path="/teacher/profile" element={<ProfileRedirect />} />
                  <Route path="/settings/profile" element={<ProfileRedirect />} />
                  <Route path="/klassroom/profile" element={<ProfileRedirect />} />
                  
                  {/* Student Portal */}
                  <Route path="/student" element={<StudentDashboard />} />
                  
                  {/* Instructor Portal */}
                  <Route path="/instructor" element={<InstructorDashboard />} />
                  <Route path="/instructor/students" element={<InstructorDashboard />} />
                  <Route path="/instructor/students/:id" element={<InstructorStudentView />} />
                  <Route path="/instructor/report-cards/new" element={<ReportCardForm />} />
                  <Route path="/instructor/report-cards/edit/:id" element={<ReportCardForm />} />
                  
                  {/* Report Card Routes */}
                  <Route path="/report-cards/open/:id" element={<ReportCardOpen />} />
                  <Route path="/report-cards/:id" element={<ReportCardView />} />
                  
                  {/* Admin Portal */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/approvals" element={<AdminApprovals />} />
                  <Route path="/admin/schedule" element={<AdminSchedule />} />
                  <Route path="/admin/assignments" element={<AdminAssignments />} />
                  <Route path="/admin/report-cards" element={<AdminReportCards />} />
                  <Route path="/admin/leads" element={<AdminLeads />} />
                  <Route path="/admin/qa" element={<AdminQA />} />
                  <Route path="/admin/messages" element={<AdminMessages />} />
                  <Route path="/admin/students" element={<AdminStudents />} />
                  <Route path="/admin/instructors" element={<AdminInstructors />} />
                  <Route path="/admin/permits" element={<AdminPermitQueue />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  
                  {/* Legacy Admin */}
                  <Route path="/old-admin" element={<Admin />} />
                  
                  {/* Driving Game */}
                  <Route path="/game" element={<DrivingGamePage />} />
                  <Route path="/driving-game" element={<DrivingGamePage />} />
                  
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
