import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Plus,
    Trash2,
    ShieldAlert,
    Search,
    AlertTriangle,
    Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Interaction {
    id: number;
    med1Name: string;
    med2Name: string;
    riskLevel: 'faible' | 'modere' | 'eleve' | 'critique';
    description: string;
}

export default function InteractionsManagement() {
    const { user } = useAuth();
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [dbMedications, setDbMedications] = useState<{ id: number, name: string }[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);

    const [newInteraction, setNewInteraction] = useState({
        medicamentSourceId: "",
        medicamentInterditId: "",
        riskLevel: "modere",
        description: ""
    });

    useEffect(() => {
        fetchInteractions();
        fetchMedications();
    }, []);

    const fetchInteractions = async () => {
        try {
            const res = await fetch('/api/medications/interactions');
            if (res.ok) {
                const data = await res.json();
                setInteractions(data.interactions);
            }
        } catch (err) {
            toast.error("Échec du chargement des interactions");
        } finally {
            setLoading(false);
        }
    };

    const fetchMedications = async () => {
        try {
            const res = await fetch('/api/medications');
            if (res.ok) {
                const data = await res.json();
                setDbMedications(data.medications);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddInteraction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newInteraction.medicamentSourceId === newInteraction.medicamentInterditId) {
            return toast.error("Veuillez sélectionner deux médicaments différents");
        }

        try {
            const res = await fetch('/api/medications/interactions', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newInteraction)
            });
            if (res.ok) {
                toast.success("Incompatibilité ajoutée !");
                setIsAdding(false);
                setNewInteraction({ medicamentSourceId: "", medicamentInterditId: "", riskLevel: "modere", description: "" });
                fetchInteractions();
            }
        } catch (err) {
            toast.error("Erreur lors de l'ajout");
        }
    };

    if (user?.type !== "pharmacist" && user?.type !== "professional") {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
                <p className="text-muted-foreground">Seuls les pharmaciens peuvent définir les interactions.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-64px)] pb-20">
            <div className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Incompatibilités Médicamenteuses</h1>
                        <p className="text-muted-foreground mt-2">Définissez les mélanges dangereux pour la sécurité des patients.</p>
                    </div>
                    <Button onClick={() => setIsAdding(true)} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
                        <Plus className="w-5 h-5 mr-2" />
                        Nouvelle Incompatibilité
                    </Button>
                </div>

                {isAdding && (
                    <div className="bg-white rounded-[40px] p-8 border shadow-sm mb-12 animate-in slide-in-from-top-4">
                        <h2 className="text-2xl font-bold mb-6">Ajouter un risque d'interaction</h2>
                        <form onSubmit={handleAddInteraction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Médicament 1</Label>
                                <select
                                    title="Médicament source"
                                    className="w-full bg-slate-50 border rounded-2xl h-14 px-4 outline-none focus:ring-2 ring-primary/20"
                                    value={newInteraction.medicamentSourceId}
                                    onChange={e => setNewInteraction({ ...newInteraction, medicamentSourceId: e.target.value })}
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    {dbMedications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Médicament 2 (Incompatible)</Label>
                                <select
                                    title="Médicament interdit"
                                    className="w-full bg-slate-50 border rounded-2xl h-14 px-4 outline-none focus:ring-2 ring-primary/20"
                                    value={newInteraction.medicamentInterditId}
                                    onChange={e => setNewInteraction({ ...newInteraction, medicamentInterditId: e.target.value })}
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    {dbMedications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Niveau de Risque</Label>
                                <select
                                    title="Niveau de risque"
                                    className="w-full bg-slate-50 border rounded-2xl h-14 px-4 outline-none focus:ring-2 ring-primary/20"
                                    value={newInteraction.riskLevel}
                                    onChange={e => setNewInteraction({ ...newInteraction, riskLevel: e.target.value })}
                                    required
                                >
                                    <option value="faible">Faible</option>
                                    <option value="modere">Modéré</option>
                                    <option value="eleve">Élevé</option>
                                    <option value="critique">Critique</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Description / Conseils</Label>
                                <input
                                    placeholder="Ex: Risque de somnolence accrue..."
                                    className="w-full bg-slate-50 border rounded-2xl h-14 px-4 outline-none focus:ring-2 ring-primary/20"
                                    value={newInteraction.description}
                                    onChange={e => setNewInteraction({ ...newInteraction, description: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-12 rounded-2xl px-8">Annuler</Button>
                                <Button type="submit" className="h-12 rounded-2xl px-12 font-bold shadow-lg shadow-primary/20">Enregistrer l'interaction</Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid gap-4">
                    {interactions.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-[30px] border shadow-sm flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-shadow">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                item.riskLevel === 'critique' ? "bg-red-50 text-red-600" :
                                    item.riskLevel === 'eleve' ? "bg-orange-50 text-orange-600" :
                                        item.riskLevel === 'modere' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                            )}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                                    <span className="text-lg font-bold text-slate-900">{item.med1Name}</span>
                                    <span className="text-muted-foreground px-2">+</span>
                                    <span className="text-lg font-bold text-slate-900">{item.med2Name}</span>
                                    <span className={cn(
                                        "ml-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        item.riskLevel === 'critique' ? "bg-red-600 text-white" :
                                            item.riskLevel === 'eleve' ? "bg-orange-500 text-white" :
                                                item.riskLevel === 'modere' ? "bg-amber-400 text-white" : "bg-blue-400 text-white"
                                    )}>
                                        {item.riskLevel}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{item.description || "Aucune description fournie."}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                    ))}

                    {interactions.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white rounded-[40px] border border-dashed">
                            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground">Aucune incompatibilité définie pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
