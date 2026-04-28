import { formatDistanceToNow } from 'date-fns';
import { Copy, RefreshCw, Box, Network } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';
import { Button } from '@/components/ui/button';

export function ScanSummarySidebar({ state }: { state: ReturnType<typeof useScanState> }) {
  const { config, startedAt, completedAt, resetScan } = state;
  const isScanning = state.status === 'SCANNING';

  const copyAddress = () => {
    navigator.clipboard.writeText(config.address);
  };

  const duration = startedAt && completedAt 
    ? ((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1) + 's'
    : startedAt 
      ? 'In progress...'
      : '--';

  return (
    <aside className="w-full shrink-0 border-b border-border bg-card/20 px-4 py-4 backdrop-blur-md lg:w-[280px] lg:border-b-0 lg:border-r lg:bg-card/30 lg:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:max-w-none lg:gap-8">
        <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.95)] lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-2 lg:shadow-none">
          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Target Contract</h3>
            <div className="group flex items-center justify-between rounded-xl border border-white/10 bg-background/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:rounded-lg lg:border-border">
              <div className="truncate pr-2 font-mono text-sm" title={config.address}>
                {config.address.slice(0, 12)}...{config.address.slice(-8)}
              </div>
              <button 
                onClick={copyAddress}
                className="text-muted-foreground transition-opacity hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.95)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground lg:text-xs lg:tracking-wider">Configuration</h3>
            
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2.5 text-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Network className="w-4 h-4" />
                  <span>Network</span>
                </div>
                <span className="font-medium">{config.network}</span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2.5 text-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Box className="w-4 h-4" />
                  <span>Mode</span>
                </div>
                <span className="font-medium">{config.mode}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.95)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground lg:text-xs lg:tracking-wider">Session</h3>
            
            <div className="space-y-3 text-sm lg:space-y-2">
              <div className="flex justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium">{startedAt ? formatDistanceToNow(startedAt, { addSuffix: true }) : '--'}</span>
              </div>
              <div className="flex justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-mono">{duration}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-1 lg:pt-4 lg:mt-auto">
          {isScanning ? (
            <Button variant="ghost" className="h-11 w-full rounded-2xl border border-white/8 bg-white/[0.03] text-muted-foreground hover:text-destructive lg:h-10 lg:rounded-md lg:border-0 lg:bg-transparent" onClick={() => state.stopScan(false)}>
              Cancel scan
            </Button>
          ) : (
            <Button variant="outline" className="h-11 w-full gap-2 rounded-2xl border-white/15 bg-white/[0.03] shadow-[0_18px_34px_-26px_rgba(0,0,0,0.95)] lg:h-10 lg:rounded-md lg:border-border lg:bg-transparent lg:shadow-none" onClick={resetScan}>
              <RefreshCw className="w-4 h-4" />
              New scan
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
