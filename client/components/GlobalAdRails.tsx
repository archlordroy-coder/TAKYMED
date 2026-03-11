import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Megaphone, Pill } from "lucide-react";

interface NewMed {
  id: number;
  name: string;
  description?: string;
  price?: string;
}

export function GlobalAdRails() {
  const [items, setItems] = useState<NewMed[]>([]);

  useEffect(() => {
    async function loadAds() {
      try {
        const res = await fetch("/api/medications?new=true");
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.medications || []);
      } catch {
        // Keep silent: ads are non-blocking UI
      }
    }
    loadAds();
  }, []);

  const left = items[0];
  const right = items[1] ?? items[0];
  const mobile = useMemo(() => items[0], [items]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="hidden lg:block fixed left-2 top-24 z-40">
        <AdCard ad={left} compact />
      </div>
      <div className="hidden lg:block fixed right-2 top-24 z-40">
        <AdCard ad={right} compact />
      </div>

      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="mx-auto max-w-md">
          <AdCard ad={mobile} />
        </div>
      </div>
    </>
  );
}

function AdCard({ ad, compact = false }: { ad?: NewMed; compact?: boolean }) {
  if (!ad) return null;

  return (
    <div className="bg-white/95 backdrop-blur border rounded-2xl shadow-xl w-full lg:w-[210px]">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-primary">
          <Megaphone className="w-3 h-3" />
          Publicité
        </div>
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black truncate">{ad.name}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{ad.description || "Nouveau ce mois-ci"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] font-bold text-primary truncate">{ad.price || "Prix en pharmacie"}</span>
        </div>
        <Link to={`/search?q=${ad.name}`}>
          <Button size="sm" className="w-full h-8 rounded-xl text-xs font-bold">
            Voir
          </Button>
        </Link>
      </div>
      {!compact && <div className="h-1 bg-gradient-to-r from-primary to-emerald-500 rounded-b-2xl" />}
    </div>
  );
}
