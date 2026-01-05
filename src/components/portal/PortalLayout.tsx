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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User, LogOut, Calendar, FileText, Users, Settings, Home, CheckCircle, Menu, X, UserPlus, FileUser, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/portal/GlobalSearch";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { profile, role, signOut } = usePortalAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: "Please retry.",
        variant: "destructive",
      });
    }
  };

  const navItems = getNavItems(role);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6 max-w-7xl mx-auto">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-bold text-gold-shimmer">DrivingKlass</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs hidden xs:inline-flex">Portal</Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button 
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-sm"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Global Search - Admin/Staff Only */}
            {(role === 'admin' || role === 'staff') && (
              <div className="hidden sm:block">
                <GlobalSearch />
              </div>
            )}
            
            <ThemeToggle />
            
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs"
                      variant="destructive"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80 bg-popover border z-50">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span className="text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
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
                      onClick={() => {
                        markAsRead(notif.id);
                        if ((notif as any).link) {
                          navigate((notif as any).link);
                        }
                      }}
                      className={cn("flex flex-col items-start gap-1 p-3 cursor-pointer", !notif.read && "bg-muted/50")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-sm truncate flex-1">{notif.title}</span>
                        {!notif.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">{notif.message}</span>
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
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarImage src={(profile as any)?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="text-xs sm:text-sm bg-primary/10 text-primary">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border z-50">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm">{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground font-normal capitalize">{role}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  Main Site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t p-3 sm:p-4 bg-background">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant={location.pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 min-h-[44px] text-sm"
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
      <main className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}

function getNavItems(role: string | null) {
  const items: { href: string; label: string; icon: any }[] = [];

  switch (role) {
    case 'admin':
      items.push(
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/approvals', label: 'Approvals', icon: CheckCircle },
        { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
        { href: '/admin/assignments', label: 'Assignments', icon: UserPlus },
        { href: '/admin/report-cards', label: 'Reports', icon: FileText },
        { href: '/admin/leads', label: 'Leads', icon: FileUser },
        { href: '/admin/qa', label: 'QA', icon: Shield },
      );
      break;
    case 'staff':
      items.push(
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/approvals', label: 'Approvals', icon: CheckCircle },
        { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
        { href: '/admin/assignments', label: 'Assignments', icon: UserPlus },
        { href: '/admin/report-cards', label: 'Reports', icon: FileText },
        { href: '/admin/leads', label: 'Leads', icon: FileUser },
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
        { href: '/profile', label: 'Profile', icon: User },
      );
      break;
  }

  return items;
}