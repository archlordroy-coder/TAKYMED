import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, CreditCard, Lock, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";

interface AccountType {
  id: number;
  name: string;
  price: number;
  currency: string;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AccountType | null>(null);

  // Payment form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const planId = searchParams.get("plan");

  useEffect(() => {
    async function fetchAccountTypes() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setAccountTypes(data.types || []);
          // Find selected plan
          if (planId) {
            const plan = data.types?.find((t: AccountType) => t.id === parseInt(planId));
            if (plan) setSelectedPlan(plan);
          }
        }
      } catch (error) {
        console.error("Failed to fetch account types:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAccountTypes();
  }, [planId]);

  const formatPrice = (type: AccountType) => {
    if (!type.price || type.price === 0) return "Gratuit";
    return `${type.price.toLocaleString()} ${type.currency || 'FCFA'}/mois`;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      toast.error("Numéro de carte invalide");
      return;
    }
    if (!cardName.trim()) {
      toast.error("Nom du titulaire requis");
      return;
    }
    if (!expiry || expiry.length < 5) {
      toast.error("Date d'expiration invalide");
      return;
    }
    if (!cvv || cvv.length < 3) {
      toast.error("CVV invalide");
      return;
    }
    if (!selectedPlan) {
      toast.error("Aucun plan sélectionné");
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          planId: selectedPlan.id,
          cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
          amount: selectedPlan.price
        })
      });

      if (res.ok) {
        toast.success("Paiement réussi ! Votre compte a été mis à niveau.");
        // Refresh user data
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors du paiement");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors du traitement du paiement");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Aucun plan sélectionné</CardTitle>
            <CardDescription>Veuillez choisir une formule pour continuer</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/upgrade">
              <Button className="w-full rounded-xl">Choisir une formule</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/upgrade" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour aux formules
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Finaliser votre commande</h1>
          <p className="text-slate-500">Paiement sécurisé pour votre abonnement</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Informations de paiement</CardTitle>
                  <CardDescription>Vos données sont sécurisées et cryptées</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Numéro de carte</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="h-12 rounded-xl text-lg font-mono"
                />
              </div>

              {/* Card Holder */}
              <div className="space-y-2">
                <Label htmlFor="cardName">Nom du titulaire</Label>
                <Input
                  id="cardName"
                  placeholder="JEAN DUPONT"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="h-12 rounded-xl text-lg uppercase"
                />
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Date d'expiration</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="h-12 rounded-xl text-lg font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    maxLength={4}
                    type="password"
                    className="h-12 rounded-xl text-lg font-mono"
                  />
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-xl text-green-700">
                <Lock className="w-5 h-5" />
                <span className="text-sm font-medium">Paiement 100% sécurisé et crypté</span>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90"
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Payer {formatPrice(selectedPlan)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle>Récapitulatif de commande</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Formule</span>
                  <span className="font-bold text-lg">{selectedPlan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Prix</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(selectedPlan)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Durée</span>
                  <span className="font-medium">1 mois</span>
                </div>
                <hr className="border-slate-200" />
                <div className="flex items-center justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-primary">{formatPrice(selectedPlan)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Features Included */}
            <Card className="shadow-lg border-0 bg-primary text-white">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-lg">Ce qui est inclus :</h3>
                <ul className="space-y-3">
                  {selectedPlan.name === "Pro" && (
                    <>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        Ordonnances illimitées
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        Notifications SMS/WhatsApp
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        Statistiques d'observance
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        Gestion de pharmacie
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        Support prioritaire 24/7
                      </li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
