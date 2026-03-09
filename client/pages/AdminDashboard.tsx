import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    Upload,
    Download,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminHeroCard, AdminStatCard, DistributionChart, ActivityChart } from "@/components/AdminComponents";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/components/images/takymed.png";
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

// Local African avatars from public folder
const AFRICAN_AVATARS = [
    "/avatars/patient1.png",
    "/avatars/patient2.png",
    "/avatars/doctor.png",
    "/avatars/pharmacist.png",
    "/avatars/default.png",
];

// Removed AFRICAN_AVATARS logic

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

interface AdminPharmacy {
    id: number;
    name: string;
    address: string;
    phone: string;
    stockCount: number;
    ownerName: string;
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
    maxOrdonnances: number | null;
    maxRappels: number | null;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes("clients")) return "users";
        if (path.includes("catalogue")) return "meds";
        if (path.includes("abonnements") || path.includes("settings")) return "settings";
        if (path.includes("pharmacies")) return "pharmacies";
        if (path.includes("analytics")) return "analytics";
        return "analytics"; // Default for /admin
    };

    const handleTabChange = (value: string) => {
        if (value === "users") navigate("/admin/clients");
        else if (value === "meds") navigate("/admin/catalogue");
        else if (value === "settings") navigate("/admin/settings");
        else if (value === "pharmacies") navigate("/admin/pharmacies");
        else if (value === "analytics") navigate("/admin");
    };

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
    const [medications, setMedications] = useState<AdminMedication[]>([]);
    const [settings, setSettings] = useState<AccountTypeSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [isAddMedOpen, setIsAddMedOpen] = useState(false);
    const [newMed, setNewMed] = useState({ name: "", unitId: 1, defaultDose: 1 });
    const [editingMed, setEditingMed] = useState<AdminMedication | null>(null);

    const refreshData = async () => {
        try {
            const [statsRes, usersRes, medsRes, settingsRes, pharmRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users"),
                fetch("/api/admin/medications"),
                fetch("/api/admin/settings"),
                fetch("/api/admin/pharmacies")
            ]);
            if (statsRes.ok && usersRes.ok && medsRes.ok && settingsRes.ok && pharmRes.ok) {
                setStats(await statsRes.json());
                const uData = await usersRes.json();
                setUsers(uData.users);
                const mData = await medsRes.json();
                setMedications(mData.medications);
                const sData = await settingsRes.json();
                setSettings(sData.types);
                const pData = await pharmRes.json();
                setPharmacies(pData.pharmacies);
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

    const handleUpdateSetting = async (id: number, price: number, description: string, maxOrdonnances: number | null, maxRappels: number | null) => {
        const res = await fetch(`/api/admin/settings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price, description, maxOrdonnances, maxRappels })
        });
        if (res.ok) { toast.success("Paramètres mis à jour"); refreshData(); }
        else toast.error("Erreur de sauvegarde");
    };

    // ============== CSV EXPORT ==============
    const handleExportCSV = () => {
        if (medications.length === 0) { toast.error("Aucun médicament à exporter"); return; }
        const header = "ID,Nom,Forme,Dose Défaut";
        const rows = medications.map(m => {
            const forme = m.unitId === 1 ? "Comprimé" : m.unitId === 2 ? "Gélule" : "Sirop";
            return `${m.id},"${m.name}","${forme}",${m.defaultDose}`;
        });
        const csv = [header, ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `takymed_medicaments_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export CSV téléchargé !");
    };

    // ============== CSV IMPORT ==============
    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            let imported = 0;
            // Skip header if present
            const startIdx = lines[0]?.toLowerCase().includes('nom') ? 1 : 0;
            for (let i = startIdx; i < lines.length; i++) {
                const parts = lines[i].split(',').map(s => s.replace(/"/g, '').trim());
                const name = parts[1] || parts[0]; // Support "ID,Nom,..." or just "Nom,..."
                if (!name) continue;
                const unitId = parts[2]?.toLowerCase().includes('gélule') ? 2 : parts[2]?.toLowerCase().includes('sirop') ? 3 : 1;
                const dose = parseFloat(parts[3] || parts[2]) || 1;
                try {
                    const res = await fetch("/api/admin/medications", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, unitId, defaultDose: dose })
                    });
                    if (res.ok) imported++;
                } catch { /* skip failed entries */ }
            }
            toast.success(`${imported} médicament(s) importé(s) avec succès !`);
            refreshData();
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    };

    // ============== PDF EXPORT ==============
    const handleExportPDF = () => {
        if (medications.length === 0) { toast.error("Aucun médicament à exporter"); return; }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Add logo
        try {
            doc.addImage(logoImg, 'PNG', 14, 10, 30, 30);
        } catch { /* logo load failed, continue without */ }

        // Header text
        doc.setFontSize(20);
        doc.setTextColor(0, 96, 147); // TEAL
        doc.text('TAKYMED', 50, 25);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Catalogue des Médicaments', 50, 32);
        doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 50, 38);

        // Separator
        doc.setDrawColor(0, 168, 89); // EMERALD
        doc.setLineWidth(0.8);
        doc.line(14, 45, pageWidth - 14, 45);

        // Table
        autoTable(doc, {
            startY: 50,
            head: [['#', 'Désignation', 'Forme', 'Dose Défaut']],
            body: medications.map((m, i) => [
                (i + 1).toString(),
                m.name,
                m.unitId === 1 ? 'Comprimé' : m.unitId === 2 ? 'Gélule' : 'Sirop',
                `${m.defaultDose} unité(s)`
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: [0, 96, 147],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
            },
            alternateRowStyles: { fillColor: [245, 248, 250] },
            styles: { fontSize: 9, cellPadding: 4 },
            margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = (doc as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`TAKYMED - Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }

        doc.save(`takymed_catalogue_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success("Export PDF téléchargé !");
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
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-white p-1 rounded-2xl border inline-flex h-auto shadow-sm" style={{ borderColor: "#e2e8f0" }}>
                    {[
                        { value: "users", label: "Clients" },
                        { value: "meds", label: "Catalogue" },
                        { value: "pharmacies", label: "Pharmacies" },
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
                                    <tr className="border-b" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Utilisateur</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Contact</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest text-right">Actions</th>
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
                                                            <div
                                                                className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-white shadow-sm border-2 border-white"
                                                                style={{
                                                                    background: u.type === 'Standard' ? '#3b82f6' :
                                                                        u.type === 'Professionnel' ? '#10b981' :
                                                                            u.type === 'Pharmacien' ? '#f59e0b' : '#8b5cf6'
                                                                }}
                                                            >
                                                                {displayName.substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-extrabold text-slate-900 text-sm">{displayName}</p>
                                                                <p className="text-xs text-slate-500 font-bold">ID #{u.id}</p>
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
                                                    <td className="px-6 py-4 text-sm text-slate-700 font-bold">
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
                        <div className="p-6 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: "#f1f5f9" }}>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Catalogue Médicaments</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{medications.length} produits référencés</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* CSV Import */}
                                <input
                                    type="file"
                                    id="csv-import-input"
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleImportCSV}
                                />
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 px-4 text-xs font-bold border-slate-200 hover:bg-slate-50"
                                    onClick={() => document.getElementById('csv-import-input')?.click()}
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Importer CSV
                                </Button>
                                {/* CSV Export */}
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 px-4 text-xs font-bold border-slate-200 hover:bg-slate-50"
                                    onClick={handleExportCSV}
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                                </Button>
                                {/* PDF Export */}
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 px-4 text-xs font-bold border-red-100 text-red-600 hover:bg-red-50"
                                    onClick={handleExportPDF}
                                >
                                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Export PDF
                                </Button>
                                {/* Add New */}
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
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Désignation</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Forme</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Dose Standard</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest text-right">Actions</th>
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
                                            <td className="px-6 py-4 text-sm text-slate-700 font-bold">
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

                {/* PHARMACIES TAB */}
                <TabsContent value="pharmacies" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Pharmacies Enregistrées</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">Gérez le réseau des officines</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Officine</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Gérant</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest">Contact & Adresse</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-700 tracking-widest text-right">Stock (Médicaments)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                                    {pharmacies.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #e0f0fa, #d0ede0)" }}>
                                                        <Briefcase size={16} style={{ color: TEAL }} />
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-700 text-sm">{p.ownerName || "—"}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-700 font-bold">{p.phone}</p>
                                                <p className="text-xs text-slate-500">{p.address}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 font-bold text-right">
                                                {p.stockCount} article(s)
                                            </td>
                                        </tr>
                                    ))}
                                    {pharmacies.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-bold text-sm">
                                                Aucune pharmacie enregistrée.
                                            </td>
                                        </tr>
                                    )}
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
        </div >
    );
}

// --- EDITABLE SETTING CARD ---
function EditableSettingCard({
    setting,
    onSave,
}: {
    setting: AccountTypeSetting;
    onSave: (id: number, price: number, desc: string, maxOrdonnances: number | null, maxRappels: number | null) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(setting.price || 0);
    const [desc, setDesc] = useState(setting.description || "");
    const [maxOrdo, setMaxOrdo] = useState<number | string>(setting.maxOrdonnances === -1 || setting.maxOrdonnances === null ? '' : setting.maxOrdonnances);
    const [maxRappels, setMaxRappels] = useState<number | string>(setting.maxRappels === -1 || setting.maxRappels === null ? '' : setting.maxRappels);

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
                            onClick={() => {
                                const pMaxOrdo = maxOrdo === '' ? null : Number(maxOrdo);
                                const pMaxRappels = maxRappels === '' ? null : Number(maxRappels);
                                onSave(setting.id, price, desc, pMaxOrdo, pMaxRappels);
                                setIsEditing(false);
                            }}>
                            <Check size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 text-red-500"
                            onClick={() => {
                                setPrice(setting.price || 0);
                                setDesc(setting.description || "");
                                setMaxOrdo(setting.maxOrdonnances === -1 || setting.maxOrdonnances === null ? '' : setting.maxOrdonnances);
                                setMaxRappels(setting.maxRappels === -1 || setting.maxRappels === null ? '' : setting.maxRappels);
                                setIsEditing(false);
                            }}>
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
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1" title="Laissez vide pour illimité">Ordonnances Max</label>
                            <Input
                                type="number"
                                placeholder="Illimité"
                                value={maxOrdo}
                                onChange={e => setMaxOrdo(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-10 rounded-xl text-sm placeholder:text-teal-500 placeholder:italic"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1" title="Laissez vide pour illimité">Rappels Max</label>
                            <Input
                                type="number"
                                placeholder="Illimité"
                                value={maxRappels}
                                onChange={e => setMaxRappels(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-10 rounded-xl text-sm placeholder:text-teal-500 placeholder:italic"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{setting.description || "Aucune description"}</p>

                    <div className="flex gap-2 mb-4">
                        <span className="flex-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Ordonnances</span>
                            <span className="font-extrabold text-slate-700">{setting.maxOrdonnances === -1 || setting.maxOrdonnances === null ? '∞ Illimité' : setting.maxOrdonnances}</span>
                        </span>
                        <span className="flex-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Rappels</span>
                            <span className="font-extrabold text-slate-700">{setting.maxRappels === -1 || setting.maxRappels === null ? '∞ Illimité' : setting.maxRappels}</span>
                        </span>
                    </div>

                    <div className="pt-4 border-t flex items-end justify-between" style={{ borderColor: "#f1f5f9" }}>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarification</p>
                            <p className="text-2xl font-black tracking-tighter" style={{ color: accent }}>
                                {(setting.price || 0).toLocaleString()}
                                <span className="text-xs font-bold text-slate-400 ml-1">FCFA /mois</span>
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
