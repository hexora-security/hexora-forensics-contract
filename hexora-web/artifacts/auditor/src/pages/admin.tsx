import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { WalletBalance } from "@/components/admin/WalletBalance";
import { CyberpunkBackground } from "@/components/cyberpunk-bg";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <CyberpunkBackground className="z-0" overlayOpacity={0.16} />

      <div className="relative z-10 px-4 py-10 sm:px-8 lg:px-14">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-md neon-border-cyan bg-secondary/10" />
              <div className="absolute inset-1 rounded-sm bg-gradient-to-br from-secondary/70 to-primary/70" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-glow-cyan uppercase">
                Sentinel<span className="text-primary">.</span>admin
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                Engine control / Operators / Threat intel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WalletBalance />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="h-8 rounded-md border-border/60 bg-background/40 px-3 text-[11px] font-medium"
            >
              <ArrowLeft className="mr-1.5 h-3 w-3" />
              Back to Scanner
            </Button>
          </div>
        </header>

        <main className="mx-auto mt-10 max-w-5xl">
          <AdminDashboard />
        </main>
      </div>
    </div>
  );
}
