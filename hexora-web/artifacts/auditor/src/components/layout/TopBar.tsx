import { useScanState } from '@/hooks/useScanState';

function formatAddress(address: string) {
  if (!address) return 'No target loaded';
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function getStatusTone(status: ReturnType<typeof useScanState>['status']) {
  switch (status) {
    case 'SCANNING':
      return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
    case 'COMPLETE':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'ERROR':
      return 'text-red-300 border-red-500/30 bg-red-500/10';
    default:
      return 'text-zinc-300 border-border bg-background/60';
  }
}

export function TopBar({ state }: { state: ReturnType<typeof useScanState> }) {
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="grid min-h-14 grid-cols-1 gap-2 px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-[minmax(0,1.8fr)_auto_auto_auto] sm:items-center sm:gap-3 sm:px-6 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]">
        <div className="min-w-0 rounded-md border border-border/70 bg-background/60 px-2.5 py-2 sm:px-3">
          <div className="mb-1 text-[9px] text-muted-foreground/70 sm:text-[10px]">Contract Address</div>
          <div className="truncate font-mono text-[11px] tracking-[0.06em] text-foreground normal-case sm:text-[12px] sm:tracking-[0.08em]">
            {formatAddress(state.config.address)}
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2 sm:px-3">
          <div className="mb-1 text-[9px] text-muted-foreground/70 sm:text-[10px]">Network</div>
          <div className="text-[11px] tracking-[0.06em] text-foreground normal-case sm:text-[12px] sm:tracking-[0.08em]">
            {state.config.network}
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2 sm:px-3">
          <div className="mb-1 text-[9px] text-muted-foreground/70 sm:text-[10px]">Scan Mode</div>
          <div className="text-[11px] tracking-[0.06em] text-foreground normal-case sm:text-[12px] sm:tracking-[0.08em]">
            {state.config.mode}
          </div>
        </div>

        <div className={`rounded-md border px-2.5 py-2 sm:px-3 ${getStatusTone(state.status)}`}>
          <div className="mb-1 text-[9px] text-current/70 sm:text-[10px]">System Status</div>
          <div className="text-[11px] tracking-[0.1em] normal-case sm:text-[12px] sm:tracking-[0.12em]">
            {state.status}
          </div>
        </div>
      </div>
    </header>
  );
}
