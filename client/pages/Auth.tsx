import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  AlertCircle,
  Info,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AccountType } from "@shared/api";

export default function Auth({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [selectedType, setSelectedType] = useState<AccountType>("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<{ code: string, name: string, dialCode: string, flag: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("CM");

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch('/api/countries');
        if (res.ok) {
          const data = await res.json();
          setCountries(data.countries);
        }
      } catch (err) {
        console.error("Erreur pays:", err);
      }
    }
    fetchCountries();
  }, []);

  const fullPhone = useMemo(() => {
    if (phone.trim() === "admin") return "admin";
    const country = countries.find(c => c.code === selectedCountry);
    if (!country) return phone.trim();
    // Prepend dialCode if not already present
    const cleanPhone = phone.trim().replace(/^\+/, '');
    const cleanDialCode = country.dialCode.replace(/^\+/, '');
    if (cleanPhone.startsWith(cleanDialCode)) {
      return '+' + cleanPhone;
    }
    return country.dialCode + cleanPhone;
  }, [phone, selectedCountry, countries]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        // Login: passer directement à l'étape PIN
        // L'utilisateur entre son PIN existant
        setStep("pin");
      } else if (mode === "register") {
        // Register: créer le compte d'abord, le backend enverra le PIN par SMS
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone, type: selectedType }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          toast.error(data?.error || "Erreur lors de la création du compte");
          setIsSubmitting(false);
          return;
        }

        toast.success("Compte créé ! Un PIN de 6 chiffres vous a été envoyé par SMS.");
        setStep("pin");
      }

    } catch (err) {
      console.error(err);
      toast.error("Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Connexion avec le PIN entré
    const success = await login(fullPhone, selectedType, pin.trim());
    setIsSubmitting(false);
    if (success) {
      toast.success(
        mode === "register"
          ? "Compte créé et connecté !"
          : "Authentification réussie !",
      );
      const savedUser = localStorage.getItem("takymed_user");
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      navigate(parsed?.type === "admin" ? "/admin" : "/dashboard");
    }
  };

  const setTestUser = (testPhone: string, testPin: string, testType?: AccountType) => {
    setPhone(testPhone);
    setPin(testPin);
    if (testType) setSelectedType(testType);
    toast.info("Identifiants de test remplis !");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="flex flex-col items-center justify-center mb-10 group"
        >
          <span className="mt-4 text-4xl font-black tracking-tighter text-primary">
            TAKYMED
          </span>
          <span className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase -mt-1 opacity-60">
            Take Your Medicine
          </span>
        </Link>
        <h2 className="mt-4 md:mt-6 text-center text-3xl md:text-4xl font-black text-foreground tracking-tighter">
          {mode === "login" ? "Connexion" : "Créer votre compte"}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-[2.5rem] sm:px-12 border border-slate-100">
          {step === "form" && (
            <form className="space-y-6" onSubmit={handleAuth}>
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <div className="flex gap-2">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-24 h-11 rounded-xl border bg-white px-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none">
                      <SelectValue placeholder="Pays" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {countries.map((c, idx) => (
                        <SelectItem key={`country-${idx}`} value={c.code} className="rounded-xl">
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{c.flag}</span>
                            <span className="font-bold">{c.dialCode}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="6XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-11 rounded-xl w-full"
                      required
                    />
                  </div>
                </div>
              </div>

              {mode === "register" && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-sm text-muted-foreground">
                  <p>Votre compte sera créé en formule <strong className="text-primary">Standard</strong> (gratuit).</p>
                  <p className="text-xs mt-1">Vous pourrez évoluer vers Pro depuis votre espace.</p>
                </div>
              )}

              <Button className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                {mode === "login" ? "Continuer" : "S'inscrire"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === "pin" && (
            <form onSubmit={handlePin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pin">Code PIN</Label>
                <Input
                  id="pin"
                  type={phone.trim() === "admin" ? "password" : "text"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={cn(
                    "h-14 text-center rounded-xl",
                    phone.trim() === "admin"
                      ? "text-xl px-4"
                      : "text-3xl font-mono tracking-[1em]",
                  )}
                  maxLength={phone.trim() === "admin" ? 20 : 6}
                  required
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Conservez précieusement ce PIN.</span>
              </div>
              <Button
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Connexion..." : "Valider et entrer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("form")}
              >
                Retour
              </Button>
            </form>
          )}

          <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
              <Info className="h-3 w-3" />
              Comptes de test
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setSelectedCountry("CM"); setTestUser("600000001", "1234"); }}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => { setSelectedCountry("CM"); setTestUser("612345678", "1234", "professional"); }}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Pro
              </button>
              <button
                type="button"
                onClick={() => setTestUser("admin", "admin", "admin")}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
