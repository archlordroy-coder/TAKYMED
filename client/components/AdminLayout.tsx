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
    Briefcase
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

interface AdminLayoutProps {
    children: React.ReactNode;
}

const TEAL = "#006093";
const EMERALD = "#00A859";

export function AdminLayout({ children }: AdminLayoutProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin", group: "PRINCIPAL" },
        { icon: BarChart3, label: t('admin.analytics'), path: "/admin/analytics", group: "PRINCIPAL" },
        { icon: Users, label: t('admin.users'), path: "/admin/clients", group: "GESTION" },
        { icon: Pill, label: t('admin.medications'), path: "/admin/catalogue", group: "GESTION" },
        { icon: Globe, label: t('admin.pharmacies'), path: "/admin/pharmacies", group: "GESTION" },
        { icon: Tags, label: t('admin.categories'), path: "/admin/categories", group: "GESTION" },
        { icon: GitPullRequest, label: t('admin.promoRequests'), path: "/admin/requests", group: "GESTION" },
        { icon: Briefcase, label: t('admin.commercials'), path: "/admin/commercials", group: "GESTION" },
        { icon: Settings, label: t('admin.settings'), path: "/admin/settings", group: "SYSTÈME" },
    ];

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
                    "hidden md:flex flex-col transition-all duration-300 relative z-50 shadow-xl bg-white border-r border-[#e2e8f0]",
                    isSidebarCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b px-4 border-[#e2e8f0]">
                    {isSidebarCollapsed ? (
                        <Logo size="small" />
                    ) : (
                        <Logo size="medium" />
                    )}
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
                    {["PRINCIPAL", "GESTION", "SYSTÈME"].map((group) => {
                        const groupItems = navItems.filter(i => i.group === group);
                        return (
                            <div key={group}>
                                {!isSidebarCollapsed && (
                                    <p className="text-[10px] font-bold mb-3 ml-3 tracking-widest uppercase text-[#94a3b8]">
                                        {group}
                                    </p>
                                )}
                                <nav className="space-y-1">
                                    {groupItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                                                    isActive ? "text-white shadow-md bg-gradient-to-br from-[#006093] to-[#00A859]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                )}
                                            >
                                                <item.icon className="w-5 h-5 shrink-0" />
                                                {!isSidebarCollapsed && (
                                                    <span className="font-semibold text-sm">{item.label}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>
                        );
                    })}
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
                                    <p className="text-xs font-bold text-slate-800 truncate">{user?.name || "Administrateur"}</p>
                                    <p className="text-[10px] font-semibold text-[#006093]">Super Admin</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="mt-2 w-full flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors py-1"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                {t('nav.logout')}
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="w-full flex items-center justify-center p-2.5 rounded-xl transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={`mobile-${item.path}`}
                                    to={item.path}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-xs font-bold border",
                                        isActive ? "text-white border-transparent bg-gradient-to-br from-[#006093] to-[#00A859]" : "text-slate-600 border-slate-200 bg-white"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
                {/* Top Header */}
                <header className="h-20 flex items-center justify-end px-4 md:px-8 z-40 bg-white border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-4">
                        {/* Language Toggle */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-slate-200 font-bold text-slate-600 rounded-xl"
                            onClick={() => {
                                const newLang = t('language.switchTo') === 'EN' ? 'en' : 'fr';
                                // Hacky approach, language should really be exported from context
                                // But since we update state locally, let's trigger a small event or just stick to standard t() matching
                                localStorage.setItem('takymed_lang', newLang);
                                window.location.reload(); 
                            }}
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            {t('language.switchTo')}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 group">
                                    <AccountAvatar name={user?.name || "Admin"} type="admin" />
                                    <div className="text-left hidden sm:block">
                                        <p className="text-xs font-bold text-slate-800 leading-none mb-0.5">{user?.name || "Admin"}</p>
                                        <p className="text-[10px] font-semibold leading-none text-[#006093]">Administrateur</p>
                                    </div>
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 w-48 rounded-2xl p-2 shadow-xl">
                                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase">{t('nav.myAccount')}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3" onClick={() => navigate("/profile")}>
                                    <UserIcon size={15} /> {t('nav.profile')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3" onClick={() => navigate("/admin/settings")}>
                                    <Settings size={15} /> {t('admin.settings')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem className="focus:bg-red-50 text-red-500 focus:text-red-500 rounded-xl px-3 py-2.5 cursor-pointer gap-3" onClick={handleLogout}>
                                    <LogOut size={15} /> {t('nav.logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 2xl:pb-8 custom-scrollbar bg-[#f0f4f8]">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            ` }} />
        </div>
    );
}
