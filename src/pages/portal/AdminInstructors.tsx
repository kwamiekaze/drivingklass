import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { AdminUsersList } from "@/components/portal/AdminUsersList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminInstructors() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PortalLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
                Instructors
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all instructor accounts
              </p>
            </div>
          </div>

          {/* Users List */}
          <AdminUsersList 
            roleFilter="instructor"
            defaultStatus="approved"
            enableSearch={true}
            enableFilters={true}
          />
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}