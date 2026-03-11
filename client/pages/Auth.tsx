import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  AlertCircle,
  Info,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AccountType } from "@shared/api";

type AccountTypePricing = {
  id: number;
  name: string;
  description: string;
  requiresPayment: number;
  price: number;
  currency: string;
};

const typeLabelMap: Record<AccountType, string> = {
  standard: "Standard",
  professional: "Professionnel",
  pharmacist: "Pharmacien",
  admin: "Administrateur",
};

export default function Auth({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [step, setStep] = useState<"form" | "payment" | "pin">("form");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [selectedType, setSelectedType] = useState<AccountType>("standard");
  const [accountTypes, setAccountTypes] = useState<AccountTypePricing[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "register") return;
    fetch("/api/auth/account-types")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch account types");
        const data = await res.json();
        setAccountTypes(data.types || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Impossible de charger les tarifs des comptes");
      });
  }, [mode]);

  const currentType = useMemo(() => {
    const desired = typeLabelMap[selectedType];
    return accountTypes.find((t) => t.name === desired);
  }, [accountTypes, selectedType]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Veuillez saisir votre numéro de téléphone.");
      return;
    }
    if (mode === "register") {
      setStep("payment");
      return;
    }
    setStep("pin");
  };

  const handleContinueFromPayment = () => {
    setStep("pin");
    toast.success("Paiement validé (mode démonstration)");
  };

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "register") {
      const created = await register(phone.trim(), pin.trim(), selectedType);
      if (!created) {
        setIsSubmitting(false);
        return;
      }
    }

    const success = await login(phone.trim(), selectedType, pin.trim());
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
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+237 ..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    required
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="type">Type de compte</Label>
                  <select
                    id="type"
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                    value={selectedType}
                    onChange={(e) =>
                      setSelectedType(e.target.value as AccountType)
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="professional">Professionnel</option>
                    <option value="pharmacist">Pharmacien</option>
                  </select>
                </div>
              )}

              <Button className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                {mode === "login" ? "Continuer" : "S'inscrire"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === "payment" && mode === "register" && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Paiement de l'abonnement</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  Le tarif dépend du type de compte défini par l'administrateur.
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 space-y-2">
                <p className="text-sm">
                  <strong>Type :</strong> {typeLabelMap[selectedType]}
                </p>
                <p className="text-sm">
                  <strong>Prix :</strong> {currentType?.price ?? 0}{" "}
                  {currentType?.currency ?? "FCFA"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentType?.description || "Compte utilisateur"}
                </p>
              </div>
              <Button
                className="w-full h-12 rounded-xl font-bold"
                onClick={handleContinueFromPayment}
              >
                Payer et continuer
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("form")}
              >
                Retour
              </Button>
            </div>
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
                  maxLength={phone.trim() === "admin" ? 20 : 4}
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
                onClick={() =>
                  setStep(mode === "register" ? "payment" : "form")
                }
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
                onClick={() => setTestUser("+237 600000001", "1234")}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setTestUser("+237 612345678", "1234", "professional")}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Pro
              </button>
              <button
                type="button"
                onClick={() => setTestUser("+237 699999999", "1234", "pharmacist")}
                className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg"
              >
                Pharmacien
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
