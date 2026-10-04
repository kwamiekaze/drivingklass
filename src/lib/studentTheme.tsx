import { createContext, useContext } from "react";

/** True inside the student portal: pages there get the navy and gold look, and the old video backgrounds step aside. */
export const StudentThemeContext = createContext(false);
export const useStudentTheme = () => useContext(StudentThemeContext);
