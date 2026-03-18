import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Pill,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  BarChart3,
  Globe,
  MoreVertical,
  Tags,
  GitPullRequest,
  Briefcase,
  Languages,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "./Logo";
import { GlobalAdRails } from "@/components/GlobalAdRails";
import { AccountAvatar } from "@/components/AccountAvatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    {
      icon: LayoutDashboard,
      label: t("nav.dashboard"),
      path: "/admin",
      group: t("admin.main"),
    },
    {
      icon: BarChart3,
      label: t("admin.analytics"),
      path: "/admin/analytics",
      group: t("admin.main"),
    },
    {
      icon: Users,
      label: t("admin.users"),
      path: "/admin/clients",
      group: t("admin.management"),
    },
    {
      icon: Pill,
      label: t("admin.medications"),
      path: "/admin/catalogue",
      group: t("admin.management"),
    },
    {
      icon: Globe,
      label: t("admin.pharmacies"),
      path: "/admin/pharmacies",
      group: t("admin.management"),
    },
    {
      icon: Tags,
      label: t("admin.categories"),
      path: "/admin/categories",
      group: t("admin.management"),
    },
    {
      icon: GitPullRequest,
      label: t("admin.promoRequests"),
      path: "/admin/requests",
      group: t("admin.management"),
    },
    {
      icon: Briefcase,
      label: t("admin.commercials"),
      path: "/admin/commercials",
      group: t("admin.management"),
    },
    {
      icon: Settings,
      label: t("admin.settings"),
      path: "/admin/settings",
      group: t("admin.system"),
    },
  ];

  const mobilePrimaryNav = navItems.slice(0, 4);
  const mobileSecondaryNav = navItems.slice(4);
  const isActiveRoute = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen text-slate-800 flex overflow-hidden font-sans bg-[#f0f4f8]">
      <GlobalAdRails />
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300 relative z-50 shadow-xl bg-white border-r border-[#e2e8f0]",
          isSidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b px-4 border-[#e2e8f0]">
          {isSidebarCollapsed ? <Logo size="small" /> : <Logo size="medium" />}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {[t("admin.main"), t("admin.management"), t("admin.system")].map(
            (group) => {
              const groupItems = navItems.filter((i) => i.group === group);
              return (
                <div key={group}>
                  {!isSidebarCollapsed && (
                    <p className="text-[10px] font-bold mb-3 ml-3 tracking-widest uppercase text-[#94a3b8]">
                      {group}
                    </p>
                  )}
                  <nav className="space-y-1">
                    {groupItems.map((item) => {
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                            isActiveRoute(item.path)
                              ? "text-white shadow-md bg-gradient-to-br from-[#006093] to-[#00A859]"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {!isSidebarCollapsed && (
                            <span className="font-semibold text-sm">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              );
            },
          )}
        </div>

        {/* User + Collapse */}
        <div className="p-3 border-t space-y-2 border-[#e2e8f0]">
          {!isSidebarCollapsed && (
            <div className="rounded-xl p-3 mb-2 bg-[#f0f4f8]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex items-center justify-center font-extrabold text-white shadow-sm border-[#006093] bg-[#006093]">
                  {(user?.name || "AD").substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.name || "Administrateur"}
                  </p>
                  <p className="text-[10px] font-semibold text-[#006093]">
                    Super Admin
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 w-full flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("nav.logout")}
              </button>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center p-2.5 rounded-xl transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-40 bg-white border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className="lg:hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {t("admin.title")}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {navItems.find((item) => location.pathname === item.path)
                  ?.label || t("admin.analytics")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-xl border-slate-200 px-3 font-bold text-slate-600 md:flex"
              onClick={toggleLanguage}
              title={
                language === "fr" ? "Switch to English" : "Passer en français"
              }
            >
              <Languages className="w-4 h-4 mr-2" />
              {t("language.switchTo")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 group">
                  <AccountAvatar name={user?.name || "Admin"} type="admin" />
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-none mb-0.5">
                      {user?.name || "Admin"}
                    </p>
                    <p className="text-[10px] font-semibold leading-none text-[#006093]">
                      Administrateur
                    </p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border-slate-200 text-slate-700 w-48 rounded-2xl p-2 shadow-xl"
              >
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase">
                  {t("nav.myAccount")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3"
                  onClick={() => navigate("/profile")}
                >
                  <UserIcon size={15} /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3"
                  onClick={() => navigate("/admin/settings")}
                >
                  <Settings size={15} /> {t("admin.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  className="focus:bg-red-50 text-red-500 focus:text-red-500 rounded-xl px-3 py-2.5 cursor-pointer gap-3"
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f8] p-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 rounded-[2rem] border border-slate-200 bg-white/95 p-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <nav className="grid grid-cols-4 gap-1">
            {mobilePrimaryNav.map((item) => {
              const isActive = isActiveRoute(item.path);
              return (
                <Link
                  key={`mobile-primary-${item.path}`}
                  to={item.path}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] font-bold transition-all",
                    isActive
                      ? "text-white shadow-md bg-gradient-to-br from-[#006093] to-[#00A859]"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {mobileSecondaryNav.map((item) => {
              const isActive = isActiveRoute(item.path);
              return (
                <Link
                  key={`mobile-secondary-${item.path}`}
                  to={item.path}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all",
                    isActive
                      ? "border-transparent text-white bg-gradient-to-br from-[#006093] to-[#00A859]"
                      : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
              onClick={toggleLanguage}
              title={
                language === "fr" ? "Switch to English" : "Passer en français"
              }
            >
              <Languages className="mr-2 h-4 w-4" />
              {t("language.switchTo")}
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-11 rounded-2xl border-slate-200 text-xs font-bold"
            >
              <Link to="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                {t("nav.profile")}
              </Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-2xl border-slate-200 text-xs font-bold"
                >
                  <MoreVertical className="mr-2 h-4 w-4" />
                  {t("nav.menu")}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-[2rem] px-6 pb-8 pt-6"
              >
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-left">
                    {t("admin.title")}
                  </SheetTitle>
                </SheetHeader>
                <div className="grid gap-3">
                  {navItems.map((item) => (
                    <Link
                      key={`sheet-${item.path}`}
                      to={item.path}
                      className="flex items-center gap-3 rounded-2xl border p-4 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <item.icon className="h-5 w-5 text-[#006093]" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <Button
                  variant="destructive"
                  className="mt-6 h-12 w-full rounded-2xl font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {t("nav.logout")}
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `,
        }}
      />
    </div>
  );
}
