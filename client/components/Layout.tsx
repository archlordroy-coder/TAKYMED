import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  Bell,
  Stethoscope,
  ShieldAlert,
  Shield,
  Search,
  User as UserIcon,
  LogOut
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
            <div className="relative p-1.5 md:p-2 rounded-xl md:rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg group-hover:shadow-primary/20 transition-all duration-700 hover:rotate-2">
              <Logo className="h-8 md:h-12" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-[13px] lg:text-sm font-semibold">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <LayoutDashboard className="w-4 h-4" />
                  Tableau de bord
                </Link>
                <Link to="/prescription" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <PlusCircle className="w-4 h-4" />
                  Ordonnance
                </Link>
                <Link to="/search" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <Search className="w-4 h-4" />
                  Recherche
                </Link>
                {user.type === "pharmacist" && (
                  <>
                    <Link to="/pharmacy-mgmt" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                      <Stethoscope className="w-4 h-4" />
                      Pharmacies
                    </Link>
                    <Link to="/interactions-mgmt" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                      <ShieldAlert className="w-4 h-4" />
                      Incompatibilités
                    </Link>
                  </>
                )}
                {user?.type === "admin" && (
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-all whitespace-nowrap",
                      location.pathname === "/admin" ? "text-primary" : "" // Adjusted styling to fit existing pattern
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link to="/ads" className="flex items-center gap-2 hover:text-primary transition-all whitespace-nowrap">
                  <Bell className="w-4 h-4" />
                  Actu
                </Link>
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            {!user ? (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-full px-6">S'inscrire</Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 bg-slate-50 border rounded-full px-2 md:px-4 h-10">
                      <AccountAvatar name={user.name || user.email} type={user.type} className="w-6 h-6 rounded-md border" />
                      <span className="hidden sm:inline truncate max-w-[100px]">{user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                    <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
                      <UserIcon className="h-4 w-4" /> Profil ({user.type})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" /> Déconnexion
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
                        <SheetTitle className="text-left">Menu</SheetTitle>
                      </SheetHeader>
                      <nav className="flex flex-col gap-6">
                        <Link to="/dashboard" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <LayoutDashboard className="w-6 h-6" />
                          Tableau de bord
                        </Link>
                        <Link to="/prescription" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <PlusCircle className="w-6 h-6" />
                          Ordonnance
                        </Link>
                        <Link to="/search" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <Search className="w-6 h-6" />
                          Recherche
                        </Link>
                        {user.type === "pharmacist" && (
                          <>
                            <Link to="/pharmacy-mgmt" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                              <Stethoscope className="w-6 h-6" />
                              Mes Pharmacies
                            </Link>
                            <Link to="/interactions-mgmt" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                              <ShieldAlert className="w-6 h-6" />
                              Incompatibilités
                            </Link>
                          </>
                        )}
                        {user?.type === "admin" && (
                          <Link
                            to="/admin"
                            className={cn(
                              "flex items-center gap-2 group p-2",
                              location.pathname === "/admin" ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-bold">Administration</span>
                          </Link>
                        )}
                        <Link to="/ads" className="flex items-center gap-4 text-lg font-bold hover:text-primary transition-colors p-2 rounded-xl hover:bg-primary/5">
                          <Bell className="w-6 h-6" />
                          Nouveautés
                        </Link>
                      </nav>
                      <div className="absolute bottom-8 left-8 right-8">
                        <Button variant="destructive" className="w-full rounded-2xl h-12 font-bold" onClick={handleLogout}>
                          <LogOut className="w-5 h-5 mr-2" />
                          Déconnexion
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
          shouldShowGlobalAds ? "pb-24 2xl:pb-0" : "",
        )}
      >
        {children}
      </main>
      <footer className="bg-muted py-12 border-t">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-tighter text-slate-800">TAKYMED</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              TAKYMED : Votre allié pour une gestion optimale de vos ordonnances et rappels de médicaments.
              Assurez-vous de prendre vos médicaments au bon moment.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Services</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>
                <Link to="/search" className="hover:text-primary">Recherche</Link>
              </li>
              <li>
                <Link to="/prescription" className="hover:text-primary">Ordonnances</Link>
              </li>
              <li>
                <Link to="/ads" className="hover:text-primary">Nouveautés</Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Légal</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>Confidentialité</li>
              <li>Conditions d'utilisation</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 pt-8 mt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TAKYMED. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
