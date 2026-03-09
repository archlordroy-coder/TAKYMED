import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Pill,
    Settings,
    Bell,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User as UserIcon,
    BarChart3,
    Globe,
    MoreVertical,
    Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "./Logo";

interface AdminLayoutProps {
    children: React.ReactNode;
}

const TEAL = "#006093";
const EMERALD = "#00A859";

export function AdminLayout({ children }: AdminLayoutProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin", group: "PRINCIPAL" },
        { icon: BarChart3, label: "Analyse", path: "/admin/analytics", group: "PRINCIPAL" },
        { icon: Users, label: "Clients", path: "/admin/clients", group: "GESTION" },
        { icon: Pill, label: "Médicaments", path: "/admin/catalogue", group: "GESTION" },
        { icon: Globe, label: "Pharmacies", path: "/admin/pharmacies", group: "GESTION" },
        { icon: Settings, label: "Paramètres", path: "/admin/settings", group: "SYSTÈME" },
    ];

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="min-h-screen text-slate-800 flex overflow-hidden font-sans" style={{ background: "#f0f4f8" }}>
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col transition-all duration-300 relative z-50 shadow-xl",
                    isSidebarCollapsed ? "w-20" : "w-64"
                )}
                style={{ background: "#ffffff", borderRight: "1px solid #e2e8f0" }}
            >
                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b px-4" style={{ borderColor: "#e2e8f0" }}>
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
                                    <p className="text-[10px] font-bold mb-3 ml-3 tracking-widest uppercase" style={{ color: "#94a3b8" }}>
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
                                                    isActive ? "text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                )}
                                                style={isActive ? { background: `linear-gradient(135deg, ${TEAL}, ${EMERALD})` } : {}}
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
                <div className="p-3 border-t space-y-2" style={{ borderColor: "#e2e8f0" }}>
                    {!isSidebarCollapsed && (
                        <div className="rounded-xl p-3 mb-2" style={{ background: "#f0f4f8" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-white bg-teal-600 shadow-sm" style={{ borderColor: TEAL }}>
                                    {(user?.name || "A").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{user?.name || "Administrateur"}</p>
                                    <p className="text-[10px] font-semibold" style={{ color: TEAL }}>Super Admin</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="mt-2 w-full flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors py-1"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Déconnexion
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
                {/* Top Header */}
                <header className="h-20 flex items-center justify-between px-8 z-40" style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher..."
                                className="bg-slate-50 border-slate-200 pl-10 h-10 rounded-xl text-slate-700 focus:border-teal-400 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-slate-100">
                            <Bell className="w-5 h-5 text-slate-500" />
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white" style={{ background: "#e53e3e" }} />
                        </Button>

                        <div className="flex items-center gap-3 pl-3 border-l" style={{ borderColor: "#e2e8f0" }}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-3 group">
                                        <div className="w-9 h-9 rounded-xl overflow-hidden border-2 group-hover:border-teal-400 transition-all flex items-center justify-center font-bold text-white bg-teal-600 shadow-sm" style={{ borderColor: "#e2e8f0" }}>
                                            {(user?.name || "A").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-left hidden sm:block">
                                            <p className="text-xs font-bold text-slate-800 leading-none mb-0.5">{user?.name || "Admin"}</p>
                                            <p className="text-[10px] font-semibold leading-none" style={{ color: TEAL }}>Administrateur</p>
                                        </div>
                                        <MoreVertical className="w-4 h-4 text-slate-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 w-48 rounded-2xl p-2 shadow-xl">
                                    <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase">Compte</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-slate-100" />
                                    <DropdownMenuItem className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3">
                                        <UserIcon size={15} /> Profil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="focus:bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer gap-3" onClick={() => navigate("/admin/settings")}>
                                        <Settings size={15} /> Paramètres
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-100" />
                                    <DropdownMenuItem className="focus:bg-red-50 text-red-500 focus:text-red-500 rounded-xl px-3 py-2.5 cursor-pointer gap-3" onClick={handleLogout}>
                                        <LogOut size={15} /> Déconnexion
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ background: "#f0f4f8" }}>
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
