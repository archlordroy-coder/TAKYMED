import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users,
    Pill,
    Activity,
    Search,
    Briefcase,
    Shield,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminHeroCard, AdminStatCard, DistributionChart, ActivityChart } from "@/components/AdminComponents";
import { motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";

const TEAL = "#006093";
const EMERALD = "#00A859";

// African avatar pool (Unsplash, African people)
const AFRICAN_AVATARS = [
    "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1619895862022-09114b41f16f?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1500522144261-ea64433bbe27?auto=format&fit=crop&q=80&w=200&h=200",
    "https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&q=80&w=200&h=200",
];

function getAvatar(id: number) {
    return AFRICAN_AVATARS[id % AFRICAN_AVATARS.length];
}

interface AdminStats {
    users: number;
    prescriptions: number;
    medications: number;
    pharmacies: number;
    recentActivity: { id: number; type: string; message: string; time: string }[];
}

interface UserRecord {
    id: number;
    email: string;
    phone: string;
    type: string;
    name: string;
}

interface AdminMedication {
    id: number;
    name: string;
    defaultDose: number;
    unitId: number;
}

interface AccountTypeSetting {
    id: number;
    name: string;
    description: string;
    price: number;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [medications, setMedications] = useState<AdminMedication[]>([]);
    const [settings, setSettings] = useState<AccountTypeSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [isAddMedOpen, setIsAddMedOpen] = useState(false);
    const [newMed, setNewMed] = useState({ name: "", unitId: 1, defaultDose: 1 });
    const [editingMed, setEditingMed] = useState<AdminMedication | null>(null);

    const refreshData = async () => {
        try {
            const [statsRes, usersRes, medsRes, settingsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users"),
                fetch("/api/admin/medications"),
                fetch("/api/admin/settings")
            ]);
            if (statsRes.ok && usersRes.ok && medsRes.ok && settingsRes.ok) {
                setStats(await statsRes.json());
                const uData = await usersRes.json();
                setUsers(uData.users);
                const mData = await medsRes.json();
                setMedications(mData.medications);
                const sData = await settingsRes.json();
                setSettings(sData.types);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erreur de synchronisation");
        }
    };

    useEffect(() => {
        refreshData().finally(() => setLoading(false));
    }, []);

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Supprimer cet utilisateur ?")) return;
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) { toast.success("Utilisateur supprimé"); refreshData(); }
        else toast.error("Erreur lors de la suppression");
    };

    const handleAddMed = async () => {
        const res = await fetch("/api/admin/medications", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMed)
        });
        if (res.ok) {
            toast.success("Médicament ajouté");
            setIsAddMedOpen(false);
            setNewMed({ name: "", unitId: 1, defaultDose: 1 });
            refreshData();
        } else toast.error("Erreur d'ajout");
    };

    const handleUpdateMed = async () => {
        if (!editingMed) return;
        const res = await fetch(`/api/admin/medications/${editingMed.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingMed)
        });
        if (res.ok) { toast.success("Mis à jour"); setEditingMed(null); refreshData(); }
        else toast.error("Erreur de mise à jour");
    };

    const handleDeleteMed = async (id: number) => {
        if (!confirm("Retirer ce médicament ?")) return;
        const res = await fetch(`/api/admin/medications/${id}`, { method: 'DELETE' });
        if (res.ok) { toast.success("Médicament supprimé"); refreshData(); }
        else toast.error("Erreur de suppression");
    };

    const handleUpdateSetting = async (id: number, price: number, description: string) => {
        const res = await fetch(`/api/admin/settings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price, description })
        });
        if (res.ok) { toast.success("Paramètres mis à jour"); refreshData(); }
        else toast.error("Erreur de sauvegarde");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL, borderTopColor: "transparent" }} />
            </div>
        );
    }

    const sparkData = [{ value: 400 }, { value: 300 }, { value: 600 }, { value: 800 }, { value: 500 }, { value: 900 }, { value: 1100 }];

    const inputClass = "bg-slate-50 border-slate-200 rounded-xl h-11 text-slate-800 focus:border-teal-400 placeholder:text-slate-400";
    const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wide";

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Page Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter" style={{ color: "#1e293b" }}>
                        Panel Administrateur
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <Shield className="w-3 h-3" />
                        <span>Administration</span>
                        <span>/</span>
                        <span style={{ color: TEAL }}>Vue d'ensemble</span>
                    </div>
                </div>
                <Button
                    onClick={refreshData}
                    className="rounded-xl px-6 h-10 font-bold text-white shadow-md hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${TEAL}, ${EMERALD})` }}
                >
                    Actualiser
                </Button>
            </div>

            {/* Hero + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 h-full">
                    <AdminHeroCard
                        name={user?.name || "Admin"}
                        amount={stats?.prescriptions?.toString() || "0"}
                        targetPercent={85}
                    />
                </div>
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdminStatCard
                        label="Utilisateurs"
                        value={stats?.users?.toLocaleString() || "0"}
                        trend={12}
                        data={sparkData}
                        color="bg-[#006093]"
                        icon={<Users size={22} />}
                    />
                    <AdminStatCard
                        label="Prescriptions"
                        value={stats?.prescriptions?.toLocaleString() || "0"}
                        trend={8}
                        data={sparkData.map(d => ({ value: d.value * 0.8 }))}
                        color="bg-[#00A859]"
                        icon={<Activity size={22} />}
                    />
                    <AdminStatCard
                        label="Médicaments"
                        value={stats?.medications?.toLocaleString() || "0"}
                        trend={2}
                        data={sparkData.map(d => ({ value: 1000 - d.value }))}
                        color="bg-violet-500"
                        icon={<Pill size={22} />}
                    />
                    <AdminStatCard
                        label="Pharmacies"
                        value={stats?.pharmacies?.toLocaleString() || "0"}
                        trend={15}
                        data={sparkData.map(d => ({ value: (d.value + 200) * 0.5 }))}
                        color="bg-amber-500"
                        icon={<Briefcase size={22} />}
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-white p-1 rounded-2xl border inline-flex h-auto shadow-sm" style={{ borderColor: "#e2e8f0" }}>
                    {[
                        { value: "users", label: "Clients" },
                        { value: "meds", label: "Catalogue" },
                        { value: "settings", label: "Abonnements" },
                        { value: "analytics", label: "Analytique" },
                    ].map(tab => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-500 transition-all data-[state=active]:text-white data-[state=active]:shadow-md"
                            style={{}}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* USERS TAB */}
                <TabsContent value="users">
                    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                        <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: "#f1f5f9" }}>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Clients inscrits</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{users.length} comptes enregistrés</p>
                            </div>
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Rechercher..."
                                    className={cn("pl-10", inputClass)}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: "#f1f5f9", background: "#fafbfc" }}>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Utilisateur</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Contact</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                                    {users
                                        .filter(u => (u.name || u.email || u.phone || "").toLowerCase().includes(search.toLowerCase()))
                                        .map((u) => {
                                            const displayName = u.name || u.email || u.phone || `User #${u.id}`;
                                            return (
                                                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={getAvatar(u.id)}
                                                                alt={displayName}
                                                                className="h-10 w-10 rounded-xl object-cover border-2 border-white shadow-sm"
                                                            />
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{displayName}</p>
                                                                <p className="text-[10px] text-slate-400 font-semibold">ID #{u.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                            u.type === 'Standard' ? "text-blue-600 bg-blue-50" :
                                                                u.type === 'Professionnel' ? "text-emerald-600 bg-emerald-50" :
                                                                    u.type === 'Pharmacien' ? "text-amber-600 bg-amber-50" :
                                                                        "text-violet-600 bg-violet-50"
                                                        )}>
                                                            {u.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                        {u.email || u.phone || "—"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-red-50 hover:text-red-500 rounded-xl"
                                                            onClick={() => handleDeleteUser(u.id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* MEDS TAB */}
                <TabsContent value="meds">
                    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Catalogue Médicaments</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{medications.length} produits référencés</p>
                            </div>
                            <Dialog open={isAddMedOpen} onOpenChange={setIsAddMedOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        className="text-white rounded-xl px-5 h-10 font-bold shadow-md"
                                        style={{ background: `linear-gradient(135deg, ${TEAL}, ${EMERALD})` }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Nouveau
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl sm:max-w-md shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-slate-800">Ajouter au Catalogue</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Nom du Produit</label>
                                            <Input className={inputClass} value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className={labelClass}>Unité</label>
                                                <select
                                                    title="Sélectionner l'unité"
                                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-400"
                                                    value={newMed.unitId}
                                                    onChange={e => setNewMed({ ...newMed, unitId: parseInt(e.target.value) })}
                                                >
                                                    <option value={1}>Comprimé</option>
                                                    <option value={2}>Gélule</option>
                                                    <option value={3}>Sirop (ml)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Dose Défaut</label>
                                                <Input type="number" className={inputClass} value={newMed.defaultDose} onChange={e => setNewMed({ ...newMed, defaultDose: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            className="w-full h-11 rounded-xl font-bold text-white"
                                            style={{ background: `linear-gradient(135deg, ${TEAL}, ${EMERALD})` }}
                                            onClick={handleAddMed}
                                        >
                                            Ajouter au Catalogue
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: "#f1f5f9", background: "#fafbfc" }}>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Désignation</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Forme</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Dose Standard</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                                    {medications.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #e0f0fa, #d0ede0)" }}>
                                                        <Pill size={16} style={{ color: TEAL }} />
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{m.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase text-slate-600 bg-slate-100">
                                                    {m.unitId === 1 ? "Comprimé" : m.unitId === 2 ? "Gélule" : "Sirop"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {m.defaultDose} unité(s)
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-1">
                                                <Button variant="ghost" size="icon" className="hover:bg-teal-50 hover:text-teal-600 rounded-xl" onClick={() => setEditingMed(m)}>
                                                    <Edit2 size={15} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-500 rounded-xl" onClick={() => handleDeleteMed(m.id)}>
                                                    <Trash2 size={15} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* SETTINGS TAB */}
                <TabsContent value="settings">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {settings.map((s) => (
                            <EditableSettingCard key={s.id} setting={s} onSave={handleUpdateSetting} />
                        ))}
                    </div>
                </TabsContent>

                {/* ANALYTICS TAB */}
                <TabsContent value="analytics">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4"><DistributionChart /></div>
                        <div className="lg:col-span-8"><ActivityChart /></div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Med Dialog */}
            <Dialog open={!!editingMed} onOpenChange={open => !open && setEditingMed(null)}>
                <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl sm:max-w-md shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Éditer le Médicament</DialogTitle>
                    </DialogHeader>
                    {editingMed && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className={labelClass}>Nom</label>
                                <Input className={inputClass} value={editingMed.name} onChange={e => setEditingMed({ ...editingMed, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelClass}>Unité</label>
                                    <select
                                        title="Sélectionner l'unité"
                                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-400"
                                        value={editingMed.unitId}
                                        onChange={e => setEditingMed({ ...editingMed, unitId: parseInt(e.target.value) })}
                                    >
                                        <option value={1}>Comprimé</option>
                                        <option value={2}>Gélule</option>
                                        <option value={3}>Sirop (ml)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClass}>Dose Défaut</label>
                                    <Input type="number" className={inputClass} value={editingMed.defaultDose} onChange={e => setEditingMed({ ...editingMed, defaultDose: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            className="w-full h-11 rounded-xl font-bold text-white"
                            style={{ background: `linear-gradient(135deg, ${TEAL}, ${EMERALD})` }}
                            onClick={handleUpdateMed}
                        >
                            Sauvegarder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- EDITABLE SETTING CARD ---
function EditableSettingCard({
    setting,
    onSave,
}: {
    setting: AccountTypeSetting;
    onSave: (id: number, price: number, desc: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(setting.price);
    const [desc, setDesc] = useState(setting.description);

    const icons = [<Users size={22} />, <Briefcase size={22} />, <Pill size={22} />, <Shield size={22} />];
    const icon = icons[(setting.id - 1) % icons.length];

    // Color accent per plan
    const accents = [TEAL, EMERALD, "#f59e0b", "#8b5cf6"];
    const accent = accents[(setting.id - 1) % accents.length];

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-[2rem] p-6 border shadow-sm transition-all"
            style={{ borderColor: "#e2e8f0" }}
        >
            <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: accent }}>
                    {icon}
                </div>
                {!isEditing ? (
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100" onClick={() => setIsEditing(true)}>
                        <Edit2 size={15} className="text-slate-400" />
                    </Button>
                ) : (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-50 text-emerald-600"
                            onClick={() => { onSave(setting.id, price, desc); setIsEditing(false); }}>
                            <Check size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 text-red-500"
                            onClick={() => { setPrice(setting.price); setDesc(setting.description); setIsEditing(false); }}>
                            <X size={15} />
                        </Button>
                    </div>
                )}
            </div>

            <h4 className="text-base font-black text-slate-800 mb-2">{setting.name}</h4>

            {isEditing ? (
                <div className="space-y-3 mt-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Prix (FCFA)</label>
                        <Input
                            type="number"
                            value={price}
                            onChange={e => setPrice(parseInt(e.target.value))}
                            className="bg-slate-50 border-slate-200 h-10 rounded-xl text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Description</label>
                        <Input
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="bg-slate-50 border-slate-200 h-10 rounded-xl text-sm"
                        />
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 leading-relaxed">{setting.description || "Aucune description"}</p>
                    <div className="mt-5 pt-4 border-t flex items-end justify-between" style={{ borderColor: "#f1f5f9" }}>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarification</p>
                            <p className="text-2xl font-black tracking-tighter" style={{ color: accent }}>
                                {(setting.price || 0).toLocaleString()}
                                <span className="text-xs font-bold text-slate-400 ml-1">FCFA</span>
                            </p>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase" style={{ background: `${accent}15`, color: accent }}>
                            Actif
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}
