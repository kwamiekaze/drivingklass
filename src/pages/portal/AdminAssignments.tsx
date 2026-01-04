import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, X, Link as LinkIcon } from "lucide-react";
import { Profile, InstructorStudent } from "@/types/portal";
import { toast } from "sonner";

export default function AdminAssignments() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PortalLayout>
        <AdminAssignmentsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminAssignmentsContent() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<InstructorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch students
    const { data: studentRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (studentRoles) {
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentRoles.map(r => r.user_id))
        .eq('approved', true);
      setStudents((studentProfiles || []) as any);
    }

    // Fetch instructors
    const { data: instructorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'instructor');

    if (instructorRoles) {
      const { data: instructorProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', instructorRoles.map(r => r.user_id));
      setInstructors((instructorProfiles || []) as any);
    }

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from('instructor_students')
      .select('*');

    setAssignments(assignmentsData || []);
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedStudent || !selectedInstructor) {
      toast.error("Please select both a student and an instructor");
      return;
    }

    // Check if assignment already exists
    const existing = assignments.find(
      a => a.student_id === selectedStudent && a.instructor_id === selectedInstructor
    );

    if (existing) {
      toast.error("This assignment already exists");
      return;
    }

    const { error } = await supabase.from('instructor_students').insert({
      student_id: selectedStudent,
      instructor_id: selectedInstructor,
    });

    if (error) {
      toast.error("Failed to create assignment");
      return;
    }

    toast.success("Student assigned to instructor");
    setDialogOpen(false);
    setSelectedStudent("");
    setSelectedInstructor("");
    fetchData();
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('instructor_students')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      toast.error("Failed to remove assignment");
      return;
    }

    toast.success("Assignment removed");
    fetchData();
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.full_name || 'Unknown';
  const getInstructorName = (id: string) => instructors.find(i => i.id === id)?.full_name || 'Unknown';
  
  const getStudentAssignments = (studentId: string) => {
    return assignments.filter(a => a.student_id === studentId);
  };

  const getInstructorAssignments = (instructorId: string) => {
    return assignments.filter(a => a.instructor_id === instructorId);
  };

  const unassignedStudents = students.filter(
    s => !assignments.some(a => a.student_id === s.id)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Student Assignments</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Assign students to instructors</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto min-h-[44px]">
              <UserPlus className="h-4 w-4" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Assign Student to Instructor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instructor</label>
                <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full min-h-[44px]" onClick={handleAssign}>
                Create Assignment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unassigned Students Alert */}
      {unassignedStudents.length > 0 && (
        <Card className="border-orange-500/50 portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Unassigned Students ({unassignedStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.map(student => (
                <Badge key={student.id} variant="secondary" className="text-xs sm:text-sm">
                  {student.full_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* By Instructor View */}
        <Card className="portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">By Instructor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {instructors.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No instructors found</p>
            ) : (
              instructors.map(instructor => {
                const instructorAssignments = getInstructorAssignments(instructor.id);
                return (
                  <div key={instructor.id} className="border rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">{instructor.full_name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{instructorAssignments.length} students</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {instructorAssignments.map(a => (
                        <Badge key={a.id} className="gap-1 text-xs sm:text-sm">
                          <span className="truncate max-w-[100px] sm:max-w-none">{getStudentName(a.student_id)}</span>
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {instructorAssignments.length === 0 && (
                        <span className="text-xs sm:text-sm text-muted-foreground">No students assigned</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* By Student View */}
        <Card className="portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">By Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No approved students</p>
            ) : (
              students.map(student => {
                const studentAssignments = getStudentAssignments(student.id);
                return (
                  <div key={student.id} className="border rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">{student.full_name}</span>
                      {studentAssignments.length === 0 && (
                        <Badge variant="destructive" className="text-xs shrink-0">Unassigned</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {studentAssignments.map(a => (
                        <Badge key={a.id} variant="outline" className="gap-1 text-xs sm:text-sm">
                          <LinkIcon className="h-3 w-3" />
                          <span className="truncate max-w-[100px] sm:max-w-none">{getInstructorName(a.instructor_id)}</span>
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}