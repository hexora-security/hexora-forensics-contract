import { useState } from 'react';
import { useScanState } from '@/hooks/useScanState';
import { PlayCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NetworkIcon } from '@/components/NetworkIcon';
import type { Network, ScanMode } from '@/hooks/useScanState';

const NETWORKS = ['Ethereum', 'Arbitrum', 'Base', 'Polygon', 'BSC', 'Optimism'];
const MODES = ['Static', 'Symbolic', 'Fuzzing', 'Full'];

const DEMO_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

export interface ScanRequest {
  address: string;
  network: Network;
  mode: ScanMode;
}

export function ScanForm({
  state,
  onRequestScan,
}: {
  state: ReturnType<typeof useScanState>;
  onRequestScan: (request: ScanRequest) => void;
}) {
  const { config, updateConfig } = state;
  const [address, setAddress] = useState(config.address || '');

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.length > 10) {
      onRequestScan({
        address,
        network: config.network,
        mode: config.mode,
      });
    }
  };

  const handleDemo = () => {
    setAddress(DEMO_ADDRESS);
    onRequestScan({
      address: DEMO_ADDRESS,
      network: 'Ethereum',
      mode: 'Full',
    });
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="relative w-full max-w-[720px] animate-[slide-down_400ms_ease-out]">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Smart contract security scanner</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-foreground">Audit any smart contract before </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Static analysis, symbolic execution, and fork-based validation
          </p>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)] mb-12 overflow-hidden">
          <form onSubmit={handleScan}>
            <div className="px-5 pt-4 pb-2">
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="0x… paste a contract address to audit"
                className="h-14 text-lg font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 placeholder:text-muted-foreground/50"
                autoFocus
                spellCheck={false}
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-1">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <Select value={config.network} onValueChange={(v) => updateConfig({ network: v as any })}>
                  <SelectTrigger className="h-8 w-auto gap-1.5 bg-transparent border-border/60 px-2.5 text-xs font-medium shadow-none transition-colors hover:border-border hover:bg-secondary/40 sm:h-9 sm:gap-2 sm:px-3 sm:text-sm [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 sm:[&>span]:gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 sm:text-xs sm:tracking-wider">Network</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {NETWORKS.map(n => (
                      <SelectItem key={n} value={n}>
                        <div className="flex items-center gap-2">
                          <NetworkIcon network={n as any} className="w-4 h-4" />
                          <span>{n}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={config.mode} onValueChange={(v) => updateConfig({ mode: v as any })}>
                  <SelectTrigger className="h-8 w-auto gap-1.5 bg-transparent border-border/60 px-2.5 text-xs font-medium shadow-none transition-colors hover:border-border hover:bg-secondary/40 sm:h-9 sm:gap-2 sm:px-3 sm:text-sm">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 sm:text-xs sm:tracking-wider">Mode</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={address.length < 10}
                className="h-9 px-4 gap-1.5 text-sm font-medium shadow-sm group"
              >
                Run scan
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </form>
        </div>

        <div className="flex justify-center -mt-8 mb-12">
          <button
            type="button"
            onClick={handleDemo}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <PlayCircle className="w-4 h-4 group-hover:text-primary transition-colors" />
            <span>Try with demo contract</span>
            <span className="font-mono text-xs text-muted-foreground/60">(Uniswap V2 Router)</span>
          </button>
        </div>

        <div className="flex flex-row gap-3 text-sm">
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-center">
            <h3 className="text-sm font-semibold text-foreground">Reentrancy detection</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">Catches state-mutation reentry paths</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-center">
            <h3 className="text-sm font-semibold text-foreground">Symbolic execution</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">Explores edge case execution paths</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-center">
            <h3 className="text-sm font-semibold text-foreground">Fork validation</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">Tests exploits against live mainnet state</p>
          </div>
        </div>
      </div>
    </div>
  );
}
