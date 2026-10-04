import { useEffect, type ReactNode } from "react";
import { StudentThemeContext } from "@/lib/studentTheme";
import { StudentSky } from "@/components/portal/StudentSky";
import "@/components/nuhome2/header.css";
import "@/components/portal/student-theme.css";

/**
 * The home page's look for every page a student or a guardian can land on outside the portal itself: sign in, sign up,
 * forgot and reset password, waiting for approval, the public report card and schedule, unsubscribe and the live tracker.
 * It switches the navy and gold theme on for the whole page with one class on <body> and paints the same sky behind it.
 */
export function StudentShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("dk-portal");
    return () => document.body.classList.remove("dk-portal");
  }, []);
  return (
    <StudentThemeContext.Provider value>
      <div className="dk-shell">
        <StudentSky />
        <div className="dk-shell-body">{children}</div>
      </div>
    </StudentThemeContext.Provider>
  );
}
