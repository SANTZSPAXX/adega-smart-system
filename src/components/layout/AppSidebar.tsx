import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowUpDown,
  Store,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'PDV', url: '/pdv', icon: ShoppingCart },
  { title: 'Produtos', url: '/products', icon: Package },
  { title: 'Estoque', url: '/stock', icon: ArrowUpDown },
  { title: 'Clientes', url: '/customers', icon: Users },
  { title: 'Financeiro', url: '/financial', icon: Wallet },
  { title: 'Relatórios', url: '/reports', icon: BarChart3 },
];

const adminItems = [
  { title: 'Usuários', url: '/admin/users', icon: UserCog },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile, isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            <span className="font-bold text-lg text-sidebar-foreground">Adega PDV</span>
          </div>
        )}
        {collapsed && <Store className="h-8 w-8 text-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto mt-2")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive(item.url)
                ? "bg-primary/10 text-primary font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase", collapsed && "text-center")}>
              {!collapsed && "Admin"}
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive(item.url)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn("w-full justify-start gap-3", collapsed && "justify-center px-0")}
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
