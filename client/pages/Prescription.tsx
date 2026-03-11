import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Bell,
  Table,
  User,
  Clock,
  ChevronRight,
  Info,
  Calendar,
  Stethoscope,
  Save,
  MessageSquare,
  Smartphone,
  PhoneCall,
  Send,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MedicationEntry, DoseSchedule, FrequencyType } from "@shared/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";



export default function Prescription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patient, setPatient] = useState({
    title: "",
    name: user?.name || "",
    categorieAge: "",
    weight: 0
  });

  const [categories, setCategories] = useState<{ id: number, name: string, description: string }[]>([]);

  const [medications, setMedications] = useState<MedicationEntry[]>([
    {
      id: "1",
      name: "",
      frequencyType: "1x",
      times: ["08:00"],
      durationDays: 1,
      doseValue: 1,
      unit: "comprimé"
    }
  ]);

  const [notifConfig, setNotifConfig] = useState({
    phone: user?.phone || "",
    type: "whatsapp" as "sms" | "whatsapp" | "call" | "push"
  });

  const [dbMedications, setDbMedications] = useState<{ id: number, name: string }[]>([]);

  useEffect(() => {
    async function fetchMeds() {
      try {
        const res = await fetch('/api/medications');
        if (res.ok) {
          const data = await res.json();
          setDbMedications(data.medications);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des médicaments:", err);
      }
    }

    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
          // Set default category to the first one available
          if (data.categories.length > 0 && !patient.categorieAge) {
            setPatient(p => ({ ...p, categorieAge: data.categories[0].name }));
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des catégories:", err);
      }
    }

    fetchMeds();
    fetchCategories();
  }, []);

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        frequencyType: "1x",
        times: ["08:00"],
        durationDays: 1,
        doseValue: 1,
        unit: "comprimé"
      }
    ]);
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const updateMedication = (id: string, updates: Partial<MedicationEntry>) => {
    setMedications(medications.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const schedule: DoseSchedule[] = useMemo(() => {
    const result: DoseSchedule[] = [];
    medications.forEach(m => {
      if (!m.name || m.frequencyType === 'prn') return;

      for (let day = 1; day <= m.durationDays; day++) {
        if (m.frequencyType === 'interval' && m.intervalHours) {
          // Simplified interval logic for demo
          let hour = 8;
          while (hour < 24) {
            result.push({
              medicationId: m.id,
              medicationName: m.name,
              dose: m.doseValue,
              unit: m.unit,
              time: `${hour.toString().padStart(2, '0')}:00`,
              day,
              statusReminderSent: false,
              statusTaken: false
            });
            hour += m.intervalHours;
          }
        } else {
          m.times.forEach(timeStr => {
            result.push({
              medicationId: m.id,
              medicationName: m.name,
              dose: m.doseValue,
              unit: m.unit,
              time: timeStr,
              day,
              statusReminderSent: false,
              statusTaken: false
            });
          });
        }
      }
    });
    return result;
  }, [medications]);

  const handleNext = () => {
    if (step === 1) {
      if (medications.some(m => !m.name)) {
        toast.error("Veuillez remplir le nom de tous les médicaments.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        {/* Progress Header */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap",
            step >= 1 ? "bg-primary text-white" : "bg-slate-200 text-muted-foreground"
          )}>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</div>
            <span className="font-medium">Médicaments</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap",
            step >= 2 ? "bg-primary text-white" : "bg-slate-200 text-muted-foreground"
          )}>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</div>
            <span className="font-medium">Calendrier de Prise</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap",
            step >= 3 ? "bg-primary text-white" : "bg-slate-200 text-muted-foreground"
          )}>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</div>
            <span className="font-medium">Rappels & Validation</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Patient Header */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Stethoscope className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Détails de l'Ordonnance</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label>Nom du client</Label>
                  <Input
                    value={patient.title}
                    onChange={(e) => setPatient({ ...patient, title: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <select
                    title="Sélectionner la catégorie d'âge"
                    className="w-full h-12 rounded-xl border bg-slate-50 px-3 text-sm focus-visible:ring-2 ring-primary/20 outline-none"
                    value={patient.categorieAge}
                    onChange={(e) => setPatient({ ...patient, categorieAge: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)} {cat.description ? `(${cat.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {(patient.categorieAge === "bébé" || patient.categorieAge === "enfant") && (
                  <div className="space-y-2 animate-in slide-in-from-left duration-300">
                    <Label>Poids (kg)</Label>
                    <Input
                      type="number"
                      value={patient.weight}
                      onChange={(e) => setPatient({ ...patient, weight: parseInt(e.target.value) || 0 })}
                      className="rounded-xl h-12"
                      placeholder="Indispensable pour bébé/enfant"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Medications List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Liste des médicaments</h3>
                <Button onClick={addMedication} variant="outline" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un médicament
                </Button>
              </div>

              {medications.map((m, idx) => (
                <div key={m.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {idx + 1}
                      </div>
                      <div className="w-full max-w-[320px] space-y-1">
                        <Input
                          list={`medication-options-${m.id}`}
                          title="Saisir ou sélectionner un médicament"
                          value={m.name}
                          onChange={(e) => updateMedication(m.id, { name: e.target.value })}
                          placeholder="Saisir ou sélectionner un médicament"
                          className="bg-slate-50 text-base md:text-lg font-bold rounded-xl h-12 border-none focus-visible:ring-primary px-4 outline-none hover:bg-slate-100 transition-colors"
                        />
                        <datalist id={`medication-options-${m.id}`}>
                          {dbMedications.map((dbM) => (
                            <option key={dbM.id} value={dbM.name} />
                          ))}
                        </datalist>
                        <p className="text-[10px] text-muted-foreground">Vous pouvez choisir un médicament existant ou saisir un nouveau nom.</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMedication(m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fréquence des prises</Label>
                      <div className="flex flex-wrap gap-2">
                        {['1x', '2x', '3x', '6,8,12', 'prb'].map((freq) => {
                          const fMap: Record<string, FrequencyType> = {
                            '1x': '1x', '2x': '2x', '3x': '3x', '6,8,12': 'interval', 'prb': 'prn'
                          };
                          const currentFreq = fMap[freq];
                          return (
                            <button
                              key={freq}
                              onClick={() => {
                                const newTimes = currentFreq === '1x' ? ['08:00']
                                  : currentFreq === '2x' ? ['08:00', '20:00']
                                    : currentFreq === '3x' ? ['08:00', '14:00', '20:00'] : [];
                                updateMedication(m.id, {
                                  frequencyType: currentFreq,
                                  times: newTimes,
                                  intervalHours: currentFreq === 'interval' ? 8 : undefined
                                });
                              }}
                              className={cn(
                                "flex-1 min-w-[50px] py-2 rounded-xl border text-[10px] md:text-xs font-bold transition-all",
                                m.frequencyType === currentFreq ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 hover:bg-slate-100"
                              )}
                            >
                              {freq === 'prb' ? '-/-' : freq}
                            </button>
                          );
                        })}
                      </div>

                      {m.frequencyType === '1x' && <p className="text-xs text-primary mt-2">Une fois par jour le matin</p>}
                      {m.frequencyType === '2x' && <p className="text-xs text-primary mt-2">Deux fois par jour le matin et le soir</p>}
                      {m.frequencyType === '3x' && <p className="text-xs text-primary mt-2">Trois fois par jour le matin, le midi et le soir</p>}
                      {m.frequencyType === 'interval' && <p className="text-xs text-primary mt-2">Prises à intervalles réguliers</p>}
                      {m.frequencyType === 'prn' && <p className="text-xs text-primary mt-2">En cas de besoin</p>}

                      {/* Custom Time Selection for 1x, 2x, 3x */}
                      {(m.frequencyType === '1x' || m.frequencyType === '2x' || m.frequencyType === '3x') && (
                        <div className="grid grid-cols-1 gap-2 mt-4">
                          {m.times.map((t, tIdx) => (
                            <div key={tIdx} className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <Input
                                type="time"
                                value={t}
                                onChange={(e) => {
                                  const newTimes = [...m.times];
                                  newTimes[tIdx] = e.target.value;
                                  updateMedication(m.id, { times: newTimes });
                                }}
                                className="h-8 text-xs rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {m.frequencyType === 'interval' && (
                        <div className="space-y-2 mt-4">
                          <Label className="text-[10px] text-muted-foreground uppercase">Intervalle (heures)</Label>
                          <select
                            title="Choisir l'intervalle de temps"
                            className="w-full h-10 rounded-xl border bg-slate-50 px-3 text-xs outline-none"
                            value={m.intervalHours}
                            onChange={(e) => updateMedication(m.id, { intervalHours: parseInt(e.target.value) })}
                          >
                            <option value={6}>Toutes les 6 heures</option>
                            <option value={8}>Toutes les 8 heures</option>
                            <option value={12}>Toutes les 12 heures</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase">Dose</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={m.doseValue}
                              onChange={(e) => updateMedication(m.id, { doseValue: parseInt(e.target.value) || 0 })}
                              className="rounded-xl h-10 w-24 text-center"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase">Unité</Label>
                          <select
                            className="w-full h-10 rounded-xl border bg-slate-50 px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none"
                            value={m.unit}
                            onChange={(e) => updateMedication(m.id, { unit: e.target.value })}
                            aria-label="Unité de dosage"
                          >                        <option value="comprimé">comprimé</option>
                            <option value="mg">mg</option>
                            <option value="ml">ml</option>
                            <option value="goutte">goutte</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase">Durée (jours)</Label>
                          <Input
                            type="number"
                            value={m.durationDays}
                            onChange={(e) => updateMedication(m.id, { durationDays: parseInt(e.target.value) || 0 })}
                            className="rounded-xl h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-8">
              <Button size="lg" className="rounded-2xl h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20" onClick={handleNext}>
                Valider les Médicaments
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Table className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Calendrier des prises</h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" /> Planifié
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" /> Rappel envoyé
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left border-b">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider">Jour</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider">Médicament</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider">Dose</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider">Heure</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-center">Rappel</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-center">Pris</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">Jour {s.day}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-primary">{s.medicationName}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-medium">
                            {s.dose} {s.unit}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="font-mono">{s.time}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Checkbox checked={s.statusReminderSent} className="rounded-full h-5 w-5 border-2" />
                        </td>
                        <td className="p-4 text-center">
                          <Checkbox checked={s.statusTaken} className="rounded-full h-5 w-5 border-2" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm text-primary/80">
                  Les doses et les heures sont pré-calculées en fonction de vos réglages.
                  Vous pouvez modifier ces horaires individuellement dans les paramètres de notification.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-2xl h-14 px-8">
                Retour
              </Button>
              <Button size="lg" className="rounded-2xl h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20" onClick={handleNext}>
                Configurer les Rappels
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-8">
              <div className="text-center space-y-2">
                <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center text-primary mx-auto mb-4">
                  <Bell className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold">Méthodes de Rappel</h2>
                <p className="text-muted-foreground">
                  Définissez comment vous souhaitez être prévenu pour chaque prise.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto">
                <div className="space-y-4 text-center">
                  <div className="bg-slate-100 p-6 rounded-3xl space-y-4">
                    <Label className="text-lg font-bold">Votre Numéro</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <Input
                        value={notifConfig.phone}
                        onChange={(e) => setNotifConfig({ ...notifConfig, phone: e.target.value })}
                        className="pl-12 h-14 rounded-2xl text-lg font-mono tracking-wider"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-bold block text-center mb-4">Type de Notification</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <NotificationOption
                      selected={notifConfig.type === 'sms'}
                      onClick={() => setNotifConfig({ ...notifConfig, type: 'sms' })}
                      icon={<Smartphone className="w-5 h-5" />}
                      label="SMS"
                      color="#3b82f6"
                    />
                    <NotificationOption
                      selected={notifConfig.type === 'whatsapp'}
                      onClick={() => setNotifConfig({ ...notifConfig, type: 'whatsapp' })}
                      icon={<MessageSquare className="w-5 h-5" />}
                      label="WhatsApp"
                      color="#22c55e"
                    />
                    <NotificationOption
                      selected={notifConfig.type === 'call'}
                      onClick={() => setNotifConfig({ ...notifConfig, type: 'call' })}
                      icon={<PhoneCall className="w-5 h-5" />}
                      label="Appel"
                      color="#f97316"
                    />
                    <NotificationOption
                      selected={notifConfig.type === 'push'}
                      onClick={() => setNotifConfig({ ...notifConfig, type: 'push' })}
                      icon={<Bell className="w-5 h-5" />}
                      label="Push App"
                      color="#8b5cf6"
                    />
                  </div>
                </div>
              </div>

              <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-2xl border border-dashed flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Les messages seront jumelés si plusieurs médicaments doivent être pris à la même heure.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground italic">
                {notifConfig.phone ? `Destinataire: ${notifConfig.phone}` : "Veuillez entrer un numéro"}
              </span>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setStep(2)} className="rounded-2xl h-14 px-8">
                  Retour
                </Button>
                <Button
                  size="lg"
                  disabled={isSubmitting || !notifConfig.phone}
                  className="rounded-2xl h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20 bg-green-600 hover:bg-green-700 disabled:opacity-50 min-w-[200px]"
                  onClick={async () => {
                    if (!user) {
                      toast.error("Vous devez être connecté");
                      return;
                    }

                    setIsSubmitting(true);
                    try {
                      // 1. Save to DB
                      const res = await fetch("/api/prescriptions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          title: patient.title,
                          weight: patient.weight,
                          categorieAge: patient.categorieAge,
                          medications: medications.map(m => ({
                            ...m,
                            name: m.name
                          })),
                          notifConfig
                        })
                      });

                      if (!res.ok) throw new Error("Erreur de sauvegarde");

                      // 2. Simulation Step (What the user specifically requested)
                      const notifMethod = notifConfig.type === 'sms' ? 'SMS'
                        : notifConfig.type === 'call' ? 'Appel vocal'
                          : notifConfig.type === 'push' ? 'Notification Push'
                            : 'WhatsApp';

                      toast.info(`Initialisation de l'envoi des rappels...`, { duration: 2000 });

                      // Sequential simulation
                      await new Promise(r => setTimeout(r, 1500));
                      toast.loading(`Envoi du message de confirmation via ${notifMethod} au ${notifConfig.phone}...`, { id: "simul-notif" });

                      await new Promise(r => setTimeout(r, 2000));
                      toast.success(`Succès : Programme de rappel activé pour ${medications.length} médicament(s).`, { id: "simul-notif" });

                      await new Promise(r => setTimeout(r, 1000));
                      toast.success("Ordonnance enregistrée avec succès !");

                      setTimeout(() => navigate("/dashboard"), 1000);

                    } catch (error) {
                      console.error(error);
                      toast.error("Échec de l'enregistrement de l'ordonnance");
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Traitement...
                    </div>
                  ) : (
                    <>
                      Valider & Envoyer
                      <Send className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationOption({ selected, onClick, icon, label, color }: { selected: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all gap-3 relative overflow-hidden group",
        selected ? "text-white border-transparent shadow-2xl scale-105" : "bg-white border-slate-100 hover:border-primary/30"
      )}
      style={selected ? { background: `linear-gradient(135deg, ${color}, ${color}dd)` } : {}}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1 z-10 transition-transform group-hover:scale-110"
        style={{ background: selected ? 'rgba(255,255,255,0.2)' : `${color}15`, color: selected ? '#fff' : color }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest z-10">{label}</span>
      {selected && (
        <div className="absolute top-2 right-2 bg-white/20 rounded-full p-1 z-10">
          <Check className="w-3 h-3" />
        </div>
      )}
    </button>
  );
}
