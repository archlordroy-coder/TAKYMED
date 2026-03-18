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

  const primaryNavItems = user
    ? [
        { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/search", label: t("nav.medications"), icon: Search },
        ...(user.type !== "standard"
          ? [
              {
                to: "/ordonnances",
                label: t("nav.prescriptions"),
                icon: FileText,
              },
            ]
          : []),
        ...(user.type === "admin"
          ? [{ to: "/admin", label: t("nav.admin"), icon: Shield }]
          : []),
        { to: "/ads", label: t("nav.news"), icon: Bell },
        ...(user.type === "commercial"
          ? [{ to: "/commercial", label: t("nav.commercial"), icon: UserIcon }]
          : []),
        ...(user.type !== "admin"
          ? [{ to: "/upgrade", label: t("nav.upgrade"), icon: Crown }]
          : []),
      ]
    : [];

  const mobileNavItems = user
    ? [
        { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/search", label: t("nav.medications"), icon: Search },
        { to: "/ads", label: t("nav.news"), icon: Bell },
        { to: "/profile", label: t("nav.profile"), icon: UserIcon },
      ]
    : [
        { to: "/", label: t("nav.home"), icon: LayoutDashboard },
        { to: "/search", label: t("nav.medications"), icon: Search },
        { to: "/ads", label: t("nav.news"), icon: Bell },
        { to: "/login", label: t("nav.login"), icon: UserIcon },
      ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const shouldShowGlobalAds = !["/", "/login", "/register"].includes(
    location.pathname,
  );
  const isActiveRoute = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {shouldShowGlobalAds && <GlobalAdRails />}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl transition-all duration-500 hover:bg-background/95">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 transition-all duration-500 md:h-20">
          <Link
            to="/"
            className="group flex items-center gap-3 md:gap-4 active:scale-95 transition-transform shrink-0"
          >
            <div className="relative p-1.5 md:p-2 transition-all duration-700 hover:rotate-2 translate-y-1">
              <Logo className="h-8 md:h-12" />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-[13px] xl:text-sm font-semibold">
            {primaryNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 transition-all",
                  isActiveRoute(item.to)
                    ? "bg-primary/10 text-primary"
                    : "hover:text-primary hover:bg-primary/5",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden rounded-full h-9 border bg-slate-50 px-3 text-xs font-bold transition-all hover:bg-primary/10 hover:text-primary md:flex lg:h-10"
              title={
                language === "fr" ? "Switch to English" : "Passer en français"
              }
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
                  <Button size="sm" className="rounded-full px-6">
                    {t("nav.register")}
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 rounded-full border bg-slate-50 px-2 md:px-4 h-10"
                    >
                      <AccountAvatar
                        name={user.name || user.email}
                        type={user.type}
                        className="w-6 h-6 rounded-md border"
                      />
                      <span className="hidden md:inline truncate max-w-[120px]">
                        {user.name || user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                    <DropdownMenuLabel>{t("nav.myAccount")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => navigate("/profile")}
                    >
                      <UserIcon className="h-4 w-4" /> {t("nav.profile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => navigate("/dashboard")}
                    >
                      <LayoutDashboard className="h-4 w-4" />{" "}
                      {t("nav.dashboard")}
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
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "pt-16 md:pt-20",
          "pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-0",
          shouldShowGlobalAds ? "2xl:px-[176px] 2xl:pb-0" : "",
        )}
      >
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-[2rem] border border-border/80 bg-background/95 p-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <nav className="grid grid-cols-4 gap-1">
            {mobileNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] font-bold transition-all",
                  isActiveRoute(item.to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-11 justify-center rounded-2xl border bg-slate-50 text-xs font-bold"
              title={
                language === "fr" ? "Switch to English" : "Passer en français"
              }
            >
              <Languages className="mr-2 h-4 w-4" />
              {t("language.switchTo")}
            </Button>

            {!user ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="h-11 w-full rounded-2xl text-xs font-bold"
                >
                  <Link to="/register">{t("nav.register")}</Link>
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 rounded-2xl text-xs font-bold md:col-span-2"
                    >
                      <Menu className="mr-2 h-4 w-4" />
                      {t("nav.menu")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-[2rem] px-6 pb-8 pt-6"
                  >
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-left">
                        {t("nav.menu")}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-3">
                      <Link
                        to="/"
                        className="rounded-2xl border p-4 font-semibold hover:bg-primary/5"
                      >
                        {t("nav.home")}
                      </Link>
                      <Link
                        to="/login"
                        className="rounded-2xl border p-4 font-semibold hover:bg-primary/5"
                      >
                        {t("nav.login")}
                      </Link>
                      <Link
                        to="/register"
                        className="rounded-2xl border p-4 font-semibold hover:bg-primary/5"
                      >
                        {t("nav.register")}
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-11 w-full rounded-2xl text-xs font-bold"
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
                      className="h-11 rounded-2xl text-xs font-bold md:col-span-2"
                    >
                      <Menu className="mr-2 h-4 w-4" />
                      {t("nav.menu")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-[2rem] px-6 pb-8 pt-6"
                  >
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-left">
                        {t("nav.menu")}
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="grid gap-3">
                      {primaryNavItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="flex items-center gap-3 rounded-2xl border p-4 font-semibold hover:bg-primary/5"
                        >
                          <item.icon className="h-5 w-5 text-primary" />
                          {item.label}
                        </Link>
                      ))}
                    </nav>
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
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-muted py-12 border-t hidden md:block">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-tighter text-slate-800">
                TAKYMED
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              TAKYMED : {t("footer.description")}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">{t("footer.services")}</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>
                <Link to="/search" className="hover:text-primary">
                  {t("nav.medications")}
                </Link>
              </li>
              <li>
                <Link to="/ads" className="hover:text-primary">
                  {t("footer.news")}
                </Link>
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
