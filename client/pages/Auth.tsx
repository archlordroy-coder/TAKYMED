import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Phone, ShieldCheck, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Auth({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Veuillez saisir votre numéro de téléphone.");
      return;
    }
    setStep("pin");
  };

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(phone.trim(), undefined, pin.trim());
    setIsSubmitting(false);
    if (success) {
      toast.success("Authentification réussie !");
      const savedUser = localStorage.getItem("takymed_user");
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      navigate(parsed?.type === "admin" ? "/admin" : "/dashboard");
    }
  };

  const setTestUser = (testPhone: string, testPin: string) => {
    setPhone(testPhone);
    setPin(testPin);
    toast.info("Identifiants de test remplis !");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex flex-col items-center justify-center mb-10 group">
          <span className="mt-4 text-4xl font-black tracking-tighter text-primary">TAKYMED</span>
          <span className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase -mt-1 opacity-60">Take Your Medicine</span>
        </Link>
        <h2 className="mt-4 md:mt-6 text-center text-3xl md:text-4xl font-black text-foreground tracking-tighter">
          {mode === "login" ? "Connexion" : "Créer votre compte"}
        </h2>
        <p className="mt-2 text-center text-sm md:text-base text-muted-foreground">
          {mode === "login" ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
          <Link
            to={mode === "login" ? "/register" : "/login"}
            className="font-medium text-primary hover:text-primary/80 transition-colors underline decoration-primary/30 underline-offset-4"
          >
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </Link>
        </p>
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
                <p className="text-[10px] text-muted-foreground">
                  Entrez votre numéro. TAKYMED détectera automatiquement le type de compte.
                </p>
              </div>

              <Button className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                {mode === "login" ? "Continuer" : "S'inscrire"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === "pin" && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Vérification du PIN</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  Saisissez votre code PIN pour le numéro <strong>{phone || "votre numéro"}</strong>.
                </p>
                <p className="text-[10px] text-primary mt-2">Comptes de test : PIN <strong>1234</strong> (admin: admin/admin)</p>
              </div>

              <form onSubmit={handlePin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pin">Code PIN</Label>
                  <Input
                    id="pin"
                    type={phone.trim() === "admin" ? "password" : "text"}
                    placeholder={phone.trim() === "admin" ? "••••" : "1234"}
                    className={cn(
                      "h-14 text-center rounded-xl",
                      phone.trim() === "admin" ? "text-xl px-4" : "text-3xl font-mono tracking-[1em]",
                    )}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={phone.trim() === "admin" ? 20 : 4}
                    required
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Conservez précieusement ce PIN, il fait office de mot de passe.</span>
                </div>

                <Button disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                  {isSubmitting ? "Connexion..." : "Valider et entrer"}
                </Button>
                <Button type="button" variant="ghost" className="w-full h-11 rounded-xl text-muted-foreground" onClick={() => setStep("form")}>
                  Modifier le numéro
                </Button>
              </form>
            </div>
          )}

          <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
              <Info className="h-3 w-3" />
              Comptes de test
            </h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTestUser("+237 600000001", "1234")} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-primary transition-colors font-medium">Standard</button>
              <button type="button" onClick={() => setTestUser("+237 612345678", "1234")} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-primary transition-colors font-medium">Pro</button>
              <button type="button" onClick={() => setTestUser("+237 699999999", "1234")} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-primary transition-colors font-medium">Pharmacien</button>
              <button type="button" onClick={() => setTestUser("admin", "admin")} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-primary transition-colors font-medium border-primary/30 text-primary">Admin</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
