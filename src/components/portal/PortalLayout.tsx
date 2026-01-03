import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, User, LogOut, Calendar, FileText, Users, Settings, Home, CheckCircle, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { profile, role, signOut } = usePortalAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = getNavItems(role);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gold-shimmer">DrivingKlass</span>
            <Badge variant="secondary" className="text-xs">Portal</Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button 
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      variant="destructive"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      Mark all read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn("flex flex-col items-start gap-1 p-3", !notif.read && "bg-muted/50")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-sm">{notif.title}</span>
                        {!notif.read && <div className="h-2 w-2 rounded-full bg-primary ml-auto" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{notif.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground font-normal capitalize">{role}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/${role}/profile`)}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Home className="mr-2 h-4 w-4" />
                  Main Site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t p-4 bg-background">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant={location.pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}

function getNavItems(role: string | null) {
  const items: { href: string; label: string; icon: any }[] = [];

  switch (role) {
    case 'admin':
    case 'staff':
      items.push(
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/approvals', label: 'Approvals', icon: CheckCircle },
        { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
        { href: '/admin/report-cards', label: 'Report Cards', icon: FileText },
        { href: '/admin/users/students', label: 'Students', icon: Users },
        { href: '/admin/users/instructors', label: 'Instructors', icon: Users },
      );
      break;
    case 'instructor':
      items.push(
        { href: '/instructor', label: 'Dashboard', icon: Home },
        { href: '/instructor/students', label: 'Students', icon: Users },
      );
      break;
    case 'student':
    default:
      items.push(
        { href: '/student', label: 'Dashboard', icon: Home },
        { href: '/student/profile', label: 'Profile', icon: User },
      );
      break;
  }

  return items;
}
