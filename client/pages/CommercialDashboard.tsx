import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  UserPlus, 
  CheckCircle, 
  Users, 
  Plus, 
  Search, 
  Phone, 
  User, 
  ClipboardList,
  Loader2,
  ArrowRight,
  Calendar,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  phone: string;
  name: string;
  isValid: boolean;
  createdAt: string;
  prescriptionCount: number;
  reminderCount: number;
}

export default function CommercialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [user?.id]);

  const fetchClients = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/commercial/clients?commercialId=${user.id}`);
      if (!res.ok) throw new Error("Erreur chargement clients");
      const data = await res.json();
      setClients(data.clients);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger la liste des clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameClient = async (id: number, currentName: string) => {
    const newName = prompt("Nouveau nom pour ce client :", currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch(`/api/commercial/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialId: user?.id, name: newName })
      });
      if (!res.ok) throw new Error("Erreur de modification");
      toast.success("Client renommé avec succès");
      fetchClients();
    } catch (error) {
      toast.error("Échec de la modification");
    }
  };
  
  const handleDeleteClient = async (id: number, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le client ${name} ? cette action est irreversible.`)) return;
    
    try {
      const res = await fetch(`/api/commercial/clients/${id}?commercialId=${user?.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Erreur de suppression");
      toast.success("Client supprimé avec succès");
      fetchClients();
    } catch (error) {
      toast.error("Échec de la suppression");
    }
  };

  if (!user || user.type !== 'commercial') {
     return <div className="p-10 text-center">Accès non autorisé</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tighter">Tableau de bord <span className="text-primary font-bold">Commercial</span></h1>
            <p className="text-muted-foreground font-medium">Gestion et validation de vos clients</p>
          </div>
          <div className="flex gap-4 relative z-10 w-full md:w-auto">
            <Button onClick={() => navigate('/commercial/register')} className="flex-1 md:flex-none rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
              <UserPlus className="w-5 h-5 mr-2" />
              Inscrire un Client
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Client List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Vos Clients Enregistrés
              </h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                {clients.length} Total
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
              </div>
            ) : clients.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Aucun client trouvé</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Commencez par inscrire votre premier client pour le voir apparaître ici.</p>
                <Button onClick={() => navigate('/commercial/register')} variant="link" className="text-primary font-bold">Inscrire un client maintenant</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clients.map(client => (
                  <div key={client.id} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", client.isValid ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                        {client.isValid ? <CheckCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors">{client.name}</h4>
                          <button 
                            onClick={() => handleRenameClient(client.id, client.name)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Renommer"
                          >
                            <Plus className="w-3 h-3 rotate-45" /> 
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                            <ClipboardList className="w-2.5 h-2.5" /> {client.prescriptionCount} ordonnance(s)
                          </span>
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> {client.reminderCount} rappel(s)
                          </span>
                        </div>
                      </div>
                    </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest", client.isValid ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>
                            {client.isValid ? "Validé" : "En attente PIN"}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-1 text-right italic">Inscrit le {new Date(client.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {client.isValid && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => {
                              navigate(`/prescription?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}&clientPhone=${client.phone}`);
                            }}
                            className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 rounded-xl"
                          >
                            <Plus className="w-3 h-3 mr-1" /> New Ordonnance
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          title="Supprimer le client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Stats & Global Actions */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
               <h3 className="text-lg font-bold flex items-center gap-2">
                 <ClipboardList className="w-5 h-5 text-primary" />
                 Récapitulatif Global
               </h3>
               <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-medium">Clients total</p>
                    <p className="text-xl font-black">{clients.length}</p>
                  </div>
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-medium">Clients validés</p>
                    <p className="text-xl font-black text-green-400">{clients.filter(c => c.isValid).length}</p>
                  </div>
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-medium">En attente de PIN</p>
                    <p className="text-xl font-black text-orange-400">{clients.filter(c => !c.isValid).length}</p>
                  </div>
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-medium">Ordonnances créées</p>
                    <p className="text-xl font-black text-blue-400">{clients.reduce((acc, c) => acc + (c.prescriptionCount || 0), 0)}</p>
                  </div>
               </div>
            </div>

            <Card className="rounded-[2.5rem] border-primary/10 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 italic">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  Note Commerciale
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Chaque ordonnance créée pour un client lié sera automatiquement ajoutée à son calendrier de prises. Les patients recevront des rappels SMS/WhatsApp selon vos configurations.
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
