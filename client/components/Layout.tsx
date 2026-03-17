import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Menu,
  LayoutDashboard,
  Bell,
  Shield,
  Search,
  User as UserIcon,
  LogOut,
  Crown,
  FileText,
  Languages,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalAdRails } from "@/components/GlobalAdRails";
import { AccountAvatar } from "@/components/AccountAvatar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const shouldShowGlobalAds = !["/", "/login", "/register"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {shouldShowGlobalAds && <GlobalAdRails />}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl transition-all duration-500 hover:bg-background/95">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between transition-all duration-500">
          <Link to="/" className="group flex items-center gap-3 md:gap-4 active:scale-95 transition-transform shrink-0">
            <div className="relative p-1.5 md:p-2 transition-all duration-700 hover:rotate-2 translate-y-1">
              <Logo className="h-8 md:h-12" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-[13px] lg:text-sm font-semibold">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <LayoutDashboard className="w-4 h-4" />
                  {t("nav.dashboard")}
                </Link>
                <Link to="/search" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <Search className="w-4 h-4" />
                  {t("nav.medications")}
                </Link>
                {user.type !== "standard" && (
                  <Link to="/ordonnances" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                    <FileText className="w-4 h-4" />
                    {t("nav.prescriptions")}
                  </Link>
                )}
                {user?.type === "admin" && (
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-all whitespace-nowrap",
                      location.pathname === "/admin" ? "text-primary" : "",
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    {t("nav.admin")}
                  </Link>
                )}
                <Link to="/ads" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <Bell className="w-4 h-4" />
                  {t("nav.news")}
                </Link>
                {user.type === "commercial" && (
                  <Link to="/commercial" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-all whitespace-nowrap">
                    <UserIcon className="w-4 h-4" />
                    {t("nav.commercial")}
                  </Link>
                )}
                {user?.type !== "admin" && (
                  <Link to="/upgrade" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap text-primary font-semibold">
                    <Crown className="w-4 h-4" />
                    {t("nav.upgrade")}
                  </Link>
                )}
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="rounded-full h-9 px-3 gap-1.5 text-xs font-bold border bg-slate-50 hover:bg-primary/10 hover:text-primary transition-all"
              title={language === "fr" ? "Switch to English" : "Passer en français"}
            >
              <Languages className="w-4 h-4" />
              {t("language.switchTo")}
            </Button>

            {!user ? (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-full px-6">{t("nav.register")}</Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 bg-slate-50 border rounded-full px-2 md:px-4 h-10">
                      <AccountAvatar name={user.name || user.email} type={user.type} className="w-6 h-6 rounded-md border" />
                      <span className="hidden sm:inline truncate max-w-[100px]">{user.name || user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                    <DropdownMenuLabel>{t("nav.myAccount")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/profile")}>
                      <UserIcon className="h-4 w-4" /> {t("nav.profile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="h-4 w-4" /> {t("nav.dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" /> {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Menu className="h-6 w-6 text-primary" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px] rounded-l-[2rem]">
                      <SheetHeader className="mb-8">
                        <SheetTitle className="text-left">{t("nav.menu")}</SheetTitle>
                      </SheetHeader>
                      <nav className="flex flex-col gap-6">
                        <Link to="/profile" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <UserIcon className="w-6 h-6" />
                          {t("nav.profile")}
                        </Link>
                        <Link to="/dashboard" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <LayoutDashboard className="w-6 h-6" />
                          {t("nav.dashboard")}
                        </Link>
                        <Link to="/search" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <Search className="w-6 h-6" />
                          {t("nav.medications")}
                        </Link>
                        {user.type !== "standard" && (
                          <Link to="/ordonnances" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                            <FileText className="w-6 h-6" />
                            {t("nav.prescriptions")}
                          </Link>
                        )}
                        {user?.type === "admin" && (
                          <Link
                            to="/admin"
                            className={cn(
                              "flex items-center gap-2 group p-2",
                              location.pathname === "/admin" ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-bold">{t("nav.admin")}</span>
                          </Link>
                        )}
                        <Link to="/ads" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <Bell className="w-6 h-6" />
                          {t("nav.news")}
                        </Link>
                        {user.type === "commercial" && (
                          <Link to="/commercial" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                            <UserIcon className="w-6 h-6 text-primary" />
                            {t("nav.commercial")}
                          </Link>
                        )}
                        {user?.type !== "admin" && (
                          <Link to="/upgrade" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5 text-primary">
                            <Crown className="w-6 h-6" />
                            {t("nav.upgrade")}
                          </Link>
                        )}
                      </nav>
                      <div className="absolute bottom-8 left-8 right-8">
                        <Button variant="destructive" className="w-full rounded-2xl h-12 font-bold" onClick={handleLogout}>
                          <LogOut className="w-5 h-5 mr-2" />
                          {t("nav.logout")}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "pt-16 md:pt-20 min-h-[calc(100vh-64px-300px)] md:min-h-[calc(100vh-80px-300px)]",
          shouldShowGlobalAds ? "pb-24 2xl:pb-0 2xl:px-[176px]" : "",
          user ? "pb-24 md:pb-0" : "",
        )}
      >
        {children}
      </main>

      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="grid grid-cols-4 h-16">
            <Link to="/dashboard" className="flex flex-col items-center justify-center text-xs gap-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("nav.dashboard")}</span>
            </Link>
            <Link to="/search" className="flex flex-col items-center justify-center text-xs gap-1">
              <Search className="w-4 h-4" />
              <span>{t("nav.medications")}</span>
            </Link>
            <Link to="/ads" className="flex flex-col items-center justify-center text-xs gap-1">
              <Bell className="w-4 h-4" />
              <span>{t("nav.news")}</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center justify-center text-xs gap-1">
              <UserIcon className="w-4 h-4" />
              <span>{t("nav.profile")}</span>
            </Link>
          </div>
        </nav>
      )}

      <footer className={cn("bg-muted py-12 border-t", shouldShowGlobalAds ? "hidden md:block 2xl:px-[176px]" : "") }>
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-tighter text-slate-800">TAKYMED</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              TAKYMED : {t("footer.description")}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">{t("footer.services")}</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>
                <Link to="/search" className="hover:text-primary">{t("nav.medications")}</Link>
              </li>
              <li>
                <Link to="/ads" className="hover:text-primary">{t("footer.news")}</Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">{t("footer.legal")}</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>{t("footer.privacy")}</li>
              <li>{t("footer.terms")}</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 pt-8 mt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TAKYMED. {t("footer.rights")}
        </div>
      </footer>
    </div>
  );
}
