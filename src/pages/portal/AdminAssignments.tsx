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
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
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
      setStudents(studentProfiles || []);
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
      setInstructors(instructorProfiles || []);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold theme-heading">Student Assignments</h1>
          <p className="text-muted-foreground">Assign students to instructors</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Student to Instructor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instructor</label>
                <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAssign}>
                Create Assignment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unassigned Students Alert */}
      {unassignedStudents.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Unassigned Students ({unassignedStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.map(student => (
                <Badge key={student.id} variant="secondary">
                  {student.full_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Instructor View */}
        <Card>
          <CardHeader>
            <CardTitle>By Instructor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructors.map(instructor => {
              const instructorAssignments = getInstructorAssignments(instructor.id);
              return (
                <div key={instructor.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{instructor.full_name}</span>
                    <Badge variant="outline">{instructorAssignments.length} students</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {instructorAssignments.map(a => (
                      <Badge key={a.id} className="gap-1">
                        {getStudentName(a.student_id)}
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {instructorAssignments.length === 0 && (
                      <span className="text-sm text-muted-foreground">No students assigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By Student View */}
        <Card>
          <CardHeader>
            <CardTitle>By Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {students.map(student => {
              const studentAssignments = getStudentAssignments(student.id);
              return (
                <div key={student.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{student.full_name}</span>
                    {studentAssignments.length === 0 && (
                      <Badge variant="destructive">Unassigned</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentAssignments.map(a => (
                      <Badge key={a.id} variant="outline" className="gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {getInstructorName(a.instructor_id)}
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
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
