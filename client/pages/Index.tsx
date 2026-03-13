import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import {
  BellRing,
  MessageSquare,
  Search,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
  Clock,
  LayoutDashboard,
  Store,
  ArrowRight
} from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-24 lg:py-32 bg-slate-50">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
        <div className="container relative z-10 mx-auto px-4 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary animate-fade-in border border-primary/20">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary mr-2 animate-pulse shadow-[0_0_8px_rgba(0,114,206,0.8)]" />
              Votre santé, notre priorité absolue
            </div>
          </div>
          <Logo className="h-16 md:h-24 mx-auto mb-6" />
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Gérez vos médicaments avec{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              TAKYMED
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            Rappels intelligents, stocks en pharmacie et gestion simplifiée de vos ordonnances.
            Prenez soin de vous en toute sérénité.
          </p>
          {user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg font-black shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:scale-[1.05]">
                  Tableau de bord
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              {user.type === "admin" && (
                <Link to="/admin">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-black border-2 rounded-2xl border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                    <ShieldCheck className="mr-2 w-5 h-5" />
                    Panel Admin
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="h-14 px-8 text-lg font-black shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:scale-[1.05]">
                  Commencer Gratuitement
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-black border-2 rounded-2xl transition-all">
                  Se Connecter
                </Button>
              </Link>
            </div>
          )}
        </div>
        {/* Abstract shapes */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50" />
      </section>

      {/* Quick Access Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fonctionnalités Principales</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tout ce dont vous avez besoin pour suivre votre traitement et trouver vos médicaments.
            </p>
            {!user && (
              <p className="text-amber-600 text-sm font-bold mt-4 bg-amber-50 inline-block px-4 py-1 rounded-full border border-amber-100">
                Connectez-vous pour accéder à ces services
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<BellRing className="w-8 h-8 text-primary" />}
              title="Rappels d'Ordonnance"
              description="Notifications intelligentes pour ne jamais oublier vos prises de médicaments."
              link={user ? "/prescription" : "/login"}
            />
            <FeatureCard
              icon={<Search className="w-8 h-8 text-secondary" />}
              title="Disponibilité Stocks"
              description="Vérifiez si vos médicaments sont disponibles dans les pharmacies proches de vous."
              link={user ? "/search" : "/login"}
            />
            <FeatureCard
              icon={<Store className="w-8 h-8 text-primary" />}
              title="Mes Pharmacies"
              description="Espace dédié aux pharmaciens pour gérer leurs officines et stocks."
              link={user?.type === 'pharmacist' || user?.type === 'professional' ? "/pharmacy-mgmt" : "/login"}
            />
            <FeatureCard
              icon={<LayoutDashboard className="w-8 h-8 text-secondary" />}
              title="Nouveautés Santé"
              description="Restez informé des nouveaux médicaments et des actualités médicales."
              link={user ? "/ads" : "/login"}
            />
          </div>
        </div>
      </section>

      {/* Prescription Teaser */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Créez votre ordonnance en quelques secondes
            </h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="bg-primary/10 p-1 rounded-full text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span>Planification intelligente Matin/Midi/Soir</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="bg-primary/10 p-1 rounded-full text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <span>Intervalle et durée personnalisables</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="bg-primary/10 p-1 rounded-full text-primary">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span>Ajout facile depuis notre base de données</span>
              </li>
            </ul>
            <Link to="/prescription">
              <Button size="lg" className="h-12 px-6">Essayer maintenant</Button>
            </Link>
          </div>
          <div className="flex-1 w-full max-w-lg aspect-video bg-white rounded-2xl shadow-2xl border p-6 flex items-center justify-center">
            <div className="text-center">
              <Stethoscope className="w-16 h-16 text-primary/20 mb-4 mx-auto" />
              <p className="text-muted-foreground">Aperçu interactif de l'ordonnance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Account Types */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choisissez votre compte</h2>
            <p className="text-muted-foreground">Des options adaptées à vos besoins, particuliers ou professionnels.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Standard Account */}
            <div className="relative group border rounded-3xl p-8 hover:border-primary/50 transition-all hover:shadow-xl bg-white flex flex-col">
              <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-primary font-bold">S</div>
              <h3 className="text-xl font-bold mb-2">Compte Standard</h3>
              <p className="text-muted-foreground mb-6 text-sm flex-grow">Idéal pour un usage personnel ponctuel.</p>
              <ul className="space-y-3 mb-8 text-xs">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Connexion par Téléphone & PIN</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>1 Ordonnance active</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Notifications SMS gratuites</span>
                </li>
              </ul>
              <Link to={user ? "/dashboard" : "/register"} className="w-full">
                <Button variant="outline" className="w-full">
                  {user ? "Voir mon compte" : "Choisir Standard"}
                </Button>
              </Link>
            </div>

            {/* Professional Account */}
            <div className="relative group border rounded-3xl p-8 border-primary shadow-lg bg-primary/5 flex flex-col scale-105 z-10">
              <div className="absolute -top-4 right-8 bg-primary text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase">Populaire</div>
              <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white font-bold">P</div>
              <h3 className="text-xl font-bold mb-2">Compte Professionnel</h3>
              <p className="text-muted-foreground mb-6 text-sm flex-grow">Pour les patients chroniques et suivis complexes.</p>
              <ul className="space-y-3 mb-8 text-xs">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Connexion sécurisée par PIN</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Ordonnances illimitées</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>SMS, WhatsApp & Appels</span>
                </li>
              </ul>
              <Link to={user ? "/dashboard" : "/register"} className="w-full">
                <Button className="w-full shadow-lg shadow-primary/20">
                  {user ? "Voir mon compte" : "Passer au Pro"}
                </Button>
              </Link>
            </div>

            {/* Pharmacist Account */}
            <div className="relative group border rounded-3xl p-8 hover:border-slate-900 transition-all hover:shadow-xl bg-white flex flex-col">
              <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white font-bold">D</div>
              <h3 className="text-xl font-bold mb-2">Compte Pharmacien</h3>
              <p className="text-muted-foreground mb-6 text-sm flex-grow">Gérez votre officine et facilitez la vie de vos patients.</p>
              <ul className="space-y-3 mb-8 text-xs">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  <span>Interface de gestion officine</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  <span>Référencement de stock réel</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  <span>Jusqu'à 5 pharmacies</span>
                </li>
              </ul>
              <Link to={user ? (user.type === 'pharmacist' || user.type === 'professional' ? "/pharmacy-mgmt" : "/dashboard") : "/login"} className="w-full">
                <Button variant="outline" className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  {user ? "Mon Espace" : "Accès Pharmacie"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, link }: { icon: React.ReactNode, title: string, description: string, link: string }) {
  return (
    <Link to={link} className="block group">
      <div className="p-8 border rounded-[32px] bg-white hover:shadow-2xl hover:shadow-primary/10 transition-all h-full flex flex-col border-slate-100 hover:border-primary/20">
        <div className="mb-6 transform group-hover:scale-110 transition-transform bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-primary/5">
          {icon}
        </div>
        <h3 className="text-xl font-black mb-3 group-hover:text-primary transition-colors tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed flex-grow font-medium">{description}</p>
        <div className="mt-6 flex items-center text-primary font-bold text-sm bg-primary/5 w-fit px-4 py-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
          En savoir plus
          <PlusCircle className="w-4 h-4 ml-2 group-hover:rotate-90 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
