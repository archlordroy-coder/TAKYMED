import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";

const TEAL = "#006093";
const EMERALD = "#00A859";

// --- HERO CARD ---
interface AdminHeroCardProps {
    name: string;
    amount: string;
    targetPercent: number;
}

export function AdminHeroCard({ name, amount, targetPercent }: AdminHeroCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2.5rem] p-8 h-full flex flex-col justify-between shadow-lg"
            style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${EMERALD} 100%)` }}
        >
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Système actif</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                    Bienvenue, {name} 👋
                </h2>
                <p className="text-white/80 text-sm mt-1">Voici un résumé de l'activité du système.</p>

                <div className="mt-8">
                    <p className="text-5xl font-black text-white tracking-tighter">{amount}</p>
                    <p className="text-xs font-bold text-white/70 mt-1 uppercase tracking-widest">
                        Ordonnances totales
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mt-8">
                    <div className="flex justify-between text-xs text-white/80 font-bold mb-2">
                        <span>Objectif du mois</span>
                        <span>{targetPercent}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{ width: `${targetPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full" />
        </motion.div>
    );
}

// --- STAT CARD WITH SPARKLINE ---
interface AdminStatCardProps {
    label: string;
    value: string;
    trend: number;
    data: { value: number }[];
    color: string;
    icon: React.ReactNode;
}

export function AdminStatCard({ label, value, trend, data, color, icon }: AdminStatCardProps) {
    const isPositive = trend > 0;

    return (
        <motion.div
            whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,96,147,0.12)" }}
            className="bg-white rounded-[2rem] p-6 border transition-all shadow-sm"
            style={{ borderColor: "#e2e8f0" }}
        >
            <div className="flex items-start justify-between mb-5">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md", color)}>
                    {icon}
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg",
                    isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"
                )}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                </div>
            </div>

            <div className="space-y-0.5 mb-5">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            </div>

            <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? EMERALD : "#f43f5e"} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={isPositive ? EMERALD : "#f43f5e"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isPositive ? EMERALD : "#f43f5e"}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#grad-${label})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

// --- DISTRIBUTION CHART (PIE) ---
const PIE_DATA = [
    { name: 'Standard', value: 400, color: TEAL },
    { name: 'Professionnel', value: 300, color: EMERALD },
    { name: 'Pharmacien', value: 300, color: '#f59e0b' },
];

export function DistributionChart() {
    return (
        <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm h-full" style={{ borderColor: "#e2e8f0" }}>
            <div className="flex items-center justify-between mb-8">
                <h4 className="text-base font-bold text-slate-800 tracking-tight">Répartition Comptes</h4>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                    <MoreHorizontal className="text-slate-400" size={18} />
                </Button>
            </div>

            <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={PIE_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={6}
                            dataKey="value"
                        >
                            {PIE_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                            itemStyle={{ color: '#334155' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-black text-slate-800">68%</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Actifs</p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {PIE_DATA.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-600 font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{Math.round(item.value / 10)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- ACTIVITY CHART (BAR) ---
const BAR_DATA = [
    { name: 'Jan', prescriptions: 40, visites: 24 },
    { name: 'Fév', prescriptions: 30, visites: 14 },
    { name: 'Mar', prescriptions: 55, visites: 38 },
    { name: 'Avr', prescriptions: 28, visites: 39 },
    { name: 'Mai', prescriptions: 19, visites: 48 },
    { name: 'Jun', prescriptions: 60, visites: 38 },
    { name: 'Jul', prescriptions: 70, visites: 43 },
];

export function ActivityChart() {
    return (
        <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm h-full" style={{ borderColor: "#e2e8f0" }}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Activité Mensuelle du Système</h4>
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full" style={{ background: TEAL }} />
                            <span className="text-xs text-slate-600 font-bold uppercase">Prescriptions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full" style={{ background: EMERALD }} />
                            <span className="text-xs text-slate-600 font-bold uppercase">Visites</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                    <MoreHorizontal className="text-slate-400" size={18} />
                </Button>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BAR_DATA} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc', radius: 8 }}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        />
                        <Bar dataKey="prescriptions" fill={TEAL} radius={[6, 6, 0, 0]} barSize={14} />
                        <Bar dataKey="visites" fill={EMERALD} radius={[6, 6, 0, 0]} barSize={14} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
