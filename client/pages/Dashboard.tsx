import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Link } from "react-router-dom";
import {
   Bell,
   PlusCircle,
   Search,
   User,
   Calendar as CalendarUIIcon,
   Clock,
   CheckCircle2,
   AlertCircle,
   Store,
   ArrowRight,
   Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { DoseSchedule } from "@shared/api";
import { toast } from "sonner";

export default function Dashboard() {
   const { user } = useAuth();
   const [doses, setDoses] = useState<DoseSchedule[]>([]);
   const [stats, setStats] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      async function fetchPrescriptions() {
         if (!user?.id) return;
         try {
            const res = await fetch(`/api/prescriptions?userId=${user.id}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setDoses(data.doses);
            setStats(data.stats);
         } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement des ordonnances");
         } finally {
            setIsLoading(false);
         }
      }
      fetchPrescriptions();
   }, [user?.id]);

   if (!user) return null;

   return (
      <div className="bg-slate-50 min-h-screen pb-20">
         <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl animate-in fade-in duration-700">
            {/* Welcome Header */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border shadow-2xl mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
               <div className="flex items-center gap-8 relative z-10">
                  <div className="flex-1">
                     <h1 className="text-4xl font-black tracking-tighter mb-1">
                        Bonjour, <span className="text-primary">{user.name || user.phone || user.email?.split('@')[0]}</span>
                     </h1>
                     <p className="text-muted-foreground flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Espace <span className="text-primary font-bold capitalize">{user.type === 'professional' ? 'Pro' : user.type}</span> activé
                     </p>
                  </div>
               </div>
               <div className="flex w-full md:w-auto gap-4 relative z-10">
                  <Link to="/prescription" className="w-full md:w-auto">
                     <Button className="w-full rounded-2xl h-14 px-8 text-lg font-black shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
                        <PlusCircle className="w-6 h-6 mr-2" />
                        Nouvelle Ordonnance
                     </Button>
                  </Link>
               </div>
            </div>

            <Tabs defaultValue="today" className="space-y-8">
               <TabsList className="bg-white/50 backdrop-blur-sm border p-1 rounded-2xl h-14 w-full max-w-md mx-auto grid grid-cols-2 shadow-sm">
                  <TabsTrigger value="today" className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                     <Clock className="w-4 h-4 mr-2" />
                     Aujourd'hui
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                     <CalendarUIIcon className="w-4 h-4 mr-2" />
                     Calendrier
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="today" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Left Column: Quick Actions */}
                     <div className="lg:col-span-1 space-y-8">
                        <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                           <ArrowRight className="w-5 h-5 text-primary" />
                           Accès Rapide
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                           <DashboardActionCard
                              title="Rappels"
                              description="Gérez vos notifications de médicaments"
                              icon={<Bell className="w-6 h-6" />}
                              link="/prescription"
                              color="bg-primary"
                           />
                           <DashboardActionCard
                              title="Stocks Pharmacies"
                              description="Cherchez un médicament autour de vous"
                              icon={<Search className="w-6 h-6" />}
                              link="/search"
                              color="bg-secondary"
                           />
                           {user.type === 'pharmacist' && (
                              <DashboardActionCard
                                 title="Mes Pharmacies"
                                 description="Gérez vos officines et stocks"
                                 icon={<Store className="w-6 h-6" />}
                                 link="/pharmacy-mgmt"
                                 color="bg-slate-900"
                              />
                           )}
                        </div>
                     </div>

                     {/* Right Column: Status & Activity */}
                     <div className="lg:col-span-2 space-y-8">
                        <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                           <CalendarUIIcon className="w-5 h-5 text-primary" />
                           Aujourd'hui
                        </h2>

                        <div className="bg-white rounded-[40px] border shadow-sm p-8 space-y-8">
                           {/* Next Dose */}
                           <div className="flex flex-col md:flex-row gap-8 items-center border-b pb-8">
                              <div className="w-24 h-24 rounded-full border-8 border-primary/20 flex items-center justify-center text-primary font-bold text-lg relative">
                                 <Clock className="w-6 h-6 absolute -top-1 -right-1 bg-white rounded-full p-1 border shadow-sm" />
                                 {stats?.nextDose ? stats.nextDose.time : "--:--"}
                              </div>
                              <div className="flex-1 text-center md:text-left space-y-2">
                                 <h3 className="text-2xl font-bold">
                                    {stats?.nextDose ? `Prochaine prise : ${stats.nextDose.medicationName}` : "Aucune prise à venir"}
                                 </h3>
                                 <p className="text-muted-foreground">
                                    {stats?.nextDose
                                       ? `${stats.nextDose.dose} ${stats.nextDose.unit} à prendre pendant le ${stats.nextDose.type}.`
                                       : "Toutes vos prises sont terminées ou aucune n'est planifiée."}
                                 </p>
                                 {stats?.nextDose && (
                                    <div className="flex gap-4 justify-center md:justify-start pt-2">
                                       <Button size="sm" className="rounded-xl h-10 px-6 font-bold">
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          Marquer comme pris
                                       </Button>
                                       <Button variant="outline" size="sm" className="rounded-xl h-10 px-6">Plus tard</Button>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Stats */}
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                              <DashboardStat label="Observance" value={stats ? `${stats.observanceRate}%` : "0%"} subtext="Cette semaine" />
                              <DashboardStat label="Rappels actifs" value={stats ? stats.activeReminders.toString() : "0"} subtext={`Sur ${stats ? stats.plannedReminders : 0} planifiés`} />
                              <DashboardStat label="Pharmacies" value={stats ? stats.nearbyPharmacies.toString() : "0"} subtext="À proximité" />
                           </div>

                           {/* Tips */}
                           <div className="p-6 bg-slate-50 rounded-3xl border border-dashed flex items-start gap-4">
                              <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                              <div className="space-y-1">
                                 <p className="font-bold">Astuce Santé</p>
                                 <p className="text-sm text-muted-foreground leading-relaxed">
                                    Pensez à bien vous hydrater. Boire un grand verre d'eau facilite l'absorption de vos médicaments.
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="calendar" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-[40px] border shadow-xl p-8 lg:p-12 overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                        <div className="space-y-6">
                           <h2 className="text-3xl font-black tracking-tighter">Votre Calendrier de Santé</h2>
                           <p className="text-muted-foreground leading-relaxed">
                              Visualisez vos prises quotidiennes et planifiez votre semaine de traitement en toute sérénité.
                           </p>

                           <div className="p-6 bg-slate-50 rounded-[30px] border shadow-inner w-fit mx-auto lg:mx-0">
                              <CalendarUI
                                 mode="single"
                                 className="rounded-2xl bg-white border shadow-sm"
                              />
                           </div>

                           <div className="pt-4 flex flex-col gap-3">
                              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                 <div className="w-3 h-3 rounded-full bg-primary" />
                                 <span className="text-sm font-semibold">Jours avec prises programmées</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <h3 className="text-xl font-bold flex items-center gap-2">
                              <Clock className="w-5 h-5 text-primary" />
                              Prises Programmées
                           </h3>

                           <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {isLoading ? (
                                 <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                 </div>
                              ) : doses.length === 0 ? (
                                 <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed text-muted-foreground">
                                    Aucune prise programmée.
                                 </div>
                              ) : (
                                 doses.map((dose, idx) => (
                                    <div key={dose.id || idx} className="group p-4 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 hover:border-primary/30">
                                       <div className="w-12 h-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center border group-hover:bg-primary/5 transition-colors">
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Jour</span>
                                          <span className="text-lg font-black text-primary leading-none">{dose.day}</span>
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-slate-800 truncate">{dose.medicationName}</h4>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                             <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {dose.time}
                                             </span>
                                             <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">
                                                {dose.dose} {dose.unit}
                                             </span>
                                          </div>
                                       </div>
                                       <div className={cn(
                                          "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                                          dose.statusTaken ? "bg-green-500 border-green-500 text-white" : "bg-slate-50 text-slate-300"
                                       )}>
                                          <CheckCircle2 className="w-5 h-5" />
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </TabsContent>
            </Tabs>
         </div>
      </div>
   );
}

function DashboardActionCard({ title, description, icon, link, color }: { title: string, description: string, icon: React.ReactNode, link: string, color: string }) {
   return (
      <Link to={link} className="group">
         <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all flex items-center gap-5 hover:border-primary/20">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/5 transition-transform group-hover:scale-110", color)}>
               {icon}
            </div>
            <div className="flex-1 min-w-0">
               <h4 className="font-black text-lg group-hover:text-primary transition-colors tracking-tight">{title}</h4>
               <p className="text-xs font-medium text-muted-foreground truncate">{description}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
               <ChevronRight className="w-4 h-4" />
            </div>
         </div>
      </Link>
   );
}

function DashboardStat({ label, value, subtext }: { label: string, value: string, subtext: string }) {
   return (
      <div className="space-y-1">
         <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</p>
         <p className="text-2xl font-black text-foreground">{value}</p>
         <p className="text-[10px] text-muted-foreground">{subtext}</p>
      </div>
   );
}

function ChevronRight({ className }: { className?: string }) {
   return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
}



