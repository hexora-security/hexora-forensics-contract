import { Shield } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-8 lg:px-14">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-md neon-border-purple bg-primary/10" />
          <div className="absolute inset-1 rounded-sm bg-gradient-to-br from-primary/70 to-secondary/70" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-[0.18em] text-glow-purple uppercase">
            Sentinel<span className="text-secondary">.</span>chain
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            Smart Contract Security Scanner
          </div>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-8 rounded-md border-cyan-500/30 bg-background/50 px-3 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/10 hover:text-cyan-50"
      >
        <Link href="/admin">
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          Admin Console
        </Link>
      </Button>
    </header>
  );
}

export const ScannerDemo = Header;
