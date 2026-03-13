import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, User, Pill, CheckCircle2, Clock, XCircle, Loader2, ChevronDown, ChevronUp, Pencil, Trash2, Bell, Plus, Minus, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Rappel {
  id: number;
  medicament: string;
  dose: string;
  heure_prevue: string;
  statut_prise: boolean;
}

interface Medicament {
  id: number;
  medicament: string;
  dose: string;
  type_frequence: string;
  intervalle_heures: number | null;
  duree_jours: number;
}

interface Ordonnance {
  id: number;
  titre: string;
  nom_patient: string;
  poids_patient: number | null;
  categorie_age: string;
  date_ordonnance: string;
  est_active: boolean;
  nombre_medicaments: number;
  prises_totales: number;
  prises_effectuees: number;
  medicaments?: Medicament[];
  rappels?: Rappel[];
}

export default function Ordonnances() {
  const { user } = useAuth();
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ordonnance>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrdonnances();
  }, [user]);

  async function fetchOrdonnances() {
    if (!user) return;
    try {
      const res = await fetch(`/api/ordonnances?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrdonnances(data.ordonnances || []);
      }
    } catch (error) {
      console.error("Failed to fetch ordonnances:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrdonnanceDetails(id: number) {
    try {
      const res = await fetch(`/api/ordonnances/${id}`);
      if (res.ok) {
        const data = await res.json();
        // Update the ordonnance in the list with details
        setOrdonnances(prev => prev.map(o => 
          o.id === id ? { ...o, medicaments: data.medicaments, rappels: data.rappels } : o
        ));
      }
    } catch (error) {
      console.error("Failed to fetch details:", error);
    }
  }

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchOrdonnanceDetails(id);
    }
  };

  const startEdit = (ord: Ordonnance) => {
    setEditingId(ord.id);
    setEditForm({
      titre: ord.titre,
      nom_patient: ord.nom_patient,
      poids_patient: ord.poids_patient,
      categorie_age: ord.categorie_age
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/ordonnances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        toast.success("Ordonnance modifiée avec succès");
        fetchOrdonnances();
        setEditingId(null);
        setEditForm({});
      } else {
        toast.error("Erreur lors de la modification");
      }
    } catch (error) {
      toast.error("Erreur lors de la modification");
    }
  };

  const cancelOrdonnance = async (id: number) => {
    try {
      const res = await fetch(`/api/ordonnances/${id}/cancel`, {
        method: "PATCH"
      });
      if (res.ok) {
        toast.success("Ordonnance annulée");
        fetchOrdonnances();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const getStatusBadge = (ordonnance: Ordonnance) => {
    if (!ordonnance.est_active) {
      return <Badge className="bg-slate-500 text-white">Annulée</Badge>;
    }
    if (ordonnance.prises_effectuees >= ordonnance.prises_totales && ordonnance.prises_totales > 0) {
      return <Badge className="bg-green-500 text-white">Terminée</Badge>;
    }
    return <Badge className="bg-primary text-white">En cours</Badge>;
  };

  const getProgressPercentage = (ordonnance: Ordonnance) => {
    if (ordonnance.prises_totales === 0) return 0;
    return Math.round((ordonnance.prises_effectuees / ordonnance.prises_totales) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Mes Ordonnances
          </h1>
          <p className="text-slate-500 mt-2">Gérez vos ordonnances et suivez les rappels</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ordonnances.length}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ordonnances.filter(o => o.prises_effectuees >= o.prises_totales && o.est_active && o.prises_totales > 0).length}</p>
                <p className="text-sm text-slate-500">Terminées</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ordonnances.filter(o => (o.prises_effectuees < o.prises_totales || o.prises_totales === 0) && o.est_active).length}</p>
                <p className="text-sm text-slate-500">En cours</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ordonnances List */}
        {ordonnances.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Aucune ordonnance</h3>
              <p className="text-slate-500 mt-2">Vous n'avez pas encore d'ordonnances enregistrées</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ordonnances.map((ord) => (
              <Card key={ord.id} className={cn(
                "border-0 shadow-md transition-all hover:shadow-lg",
                !ord.est_active && "opacity-60"
              )}>
                <CardContent className="p-6">
                  {/* Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(ord.id)}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{ord.titre || `Ordonnance #${ord.id}`}</h3>
                        {getStatusBadge(ord)}
                        {expandedId === ord.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {ord.nom_patient || 'Patient'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(ord.date_ordonnance).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Pill className="w-4 h-4" />
                          {ord.nombre_medicaments} médicament(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Progression</span>
                        <span className="font-bold text-primary">{getProgressPercentage(ord)}%</span>
                      </div>
                      <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            getProgressPercentage(ord) === 100 ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${getProgressPercentage(ord)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {ord.prises_effectuees} / {ord.prises_totales} prises
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl"
                      onClick={() => startEdit(ord)}
                      disabled={!ord.est_active}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    {ord.est_active && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDeleteId(ord.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedId === ord.id && (
                    <div className="mt-6 pt-6 border-t space-y-6">
                      {/* Edit Form */}
                      {editingId === ord.id ? (
                        <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                          <h4 className="font-bold text-slate-700">Modifier l'ordonnance</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-600">Titre</label>
                              <Input 
                                value={editForm.titre || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, titre: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Nom du patient</label>
                              <Input 
                                value={editForm.nom_patient || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, nom_patient: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Poids (kg)</label>
                              <Input 
                                type="number"
                                value={editForm.poids_patient || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, poids_patient: parseFloat(e.target.value) || null }))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Catégorie d'âge</label>
                              <Input 
                                value={editForm.categorie_age || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, categorie_age: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="rounded-xl" onClick={() => saveEdit(ord.id)}>
                              <Save className="w-4 h-4 mr-1" />
                              Enregistrer
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={cancelEdit}>
                              <X className="w-4 h-4 mr-1" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* Medicaments List */}
                      <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Pill className="w-5 h-5 text-primary" />
                          Médicaments
                        </h4>
                        {ord.medicaments && ord.medicaments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ord.medicaments.map((med) => (
                              <div key={med.id} className="bg-white p-4 rounded-xl border">
                                <p className="font-bold text-slate-800">{med.medicament}</p>
                                <p className="text-sm text-slate-500">Dose: {med.dose}</p>
                                <p className="text-sm text-slate-500">Fréquence: {med.type_frequence}</p>
                                <p className="text-sm text-slate-500">Durée: {med.duree_jours} jours</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">Chargement des médicaments...</p>
                        )}
                      </div>

                      {/* Rappels List */}
                      <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Bell className="w-5 h-5 text-primary" />
                          Rappels à venir
                        </h4>
                        {ord.rappels && ord.rappels.length > 0 ? (
                          <div className="space-y-2">
                            {ord.rappels.filter(r => !r.statut_prise).slice(0, 10).map((rappel) => (
                              <div key={rappel.id} className="flex items-center justify-between bg-white p-3 rounded-xl border">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    rappel.statut_prise ? "bg-green-500" : "bg-amber-500"
                                  )} />
                                  <div>
                                    <p className="font-medium text-slate-800">{rappel.medicament}</p>
                                    <p className="text-xs text-slate-500">Dose: {rappel.dose}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-slate-700">
                                    {new Date(rappel.heure_prevue).toLocaleDateString('fr-FR')}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(rappel.heure_prevue).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {ord.rappels.filter(r => !r.statut_prise).length === 0 && (
                              <p className="text-slate-400 text-sm">Toutes les prises ont été effectuées</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">Chargement des rappels...</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Annuler l'ordonnance</DialogTitle>
          </DialogHeader>
          <p className="text-slate-500">Êtes-vous sûr de vouloir annuler cette ordonnance ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowDeleteDialog(false)}>
              Non, garder
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl"
              onClick={() => {
                if (deleteId) {
                  cancelOrdonnance(deleteId);
                  setShowDeleteDialog(false);
                  setDeleteId(null);
                }
              }}
            >
              Oui, annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
