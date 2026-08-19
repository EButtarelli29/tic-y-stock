import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  Package,
  LayoutDashboard,
  Archive,
  ArrowLeftRight,
  Bell,
  Info,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventario', label: 'Inventario', icon: Archive },
  { path: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { path: '/alertas', label: 'Alertas', icon: Bell },
  { path: '/about', label: 'Acerca de', icon: Info },
];

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <Package className="h-7 w-7 text-primary shrink-0" />
        <span className="text-lg font-bold text-white tracking-wide">Tic &amp; Stock</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
              <span>{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <span
                  className={`inline-flex w-fit mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    user?.role === 'superuser'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-accent text-accent-foreground'
                  }`}
                >
                  {user?.role === 'superuser' ? 'Superusuario' : 'Usuario'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-60 bg-secondary flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-secondary flex flex-col md:hidden transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 bg-secondary shrink-0">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-base font-bold text-white">Tic &amp; Stock</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white hover:bg-white/10 p-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
