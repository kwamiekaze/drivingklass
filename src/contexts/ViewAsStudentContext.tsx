import { createContext, useContext, useState, ReactNode } from "react";

interface ViewAsStudentContextType {
  /** The student being viewed as, null if not in view-as mode */
  viewingAsStudent: { id: string; name: string } | null;
  /** Enter view-as-student mode */
  startViewingAs: (studentId: string, studentName: string) => void;
  /** Exit view-as-student mode */
  stopViewingAs: () => void;
  /** Whether we're currently in view-as mode */
  isViewingAsStudent: boolean;
}

const ViewAsStudentContext = createContext<ViewAsStudentContextType>({
  viewingAsStudent: null,
  startViewingAs: () => {},
  stopViewingAs: () => {},
  isViewingAsStudent: false,
});

export function ViewAsStudentProvider({ children }: { children: ReactNode }) {
  const [viewingAsStudent, setViewingAsStudent] = useState<{ id: string; name: string } | null>(null);

  const startViewingAs = (studentId: string, studentName: string) => {
    setViewingAsStudent({ id: studentId, name: studentName });
  };

  const stopViewingAs = () => {
    setViewingAsStudent(null);
  };

  return (
    <ViewAsStudentContext.Provider value={{
      viewingAsStudent,
      startViewingAs,
      stopViewingAs,
      isViewingAsStudent: !!viewingAsStudent,
    }}>
      {children}
    </ViewAsStudentContext.Provider>
  );
}

export function useViewAsStudent() {
  return useContext(ViewAsStudentContext);
}
