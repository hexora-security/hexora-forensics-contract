import { useState, useEffect } from 'react';
import { useScanState } from '@/hooks/useScanState';
import { mockInitialScanResult } from '@/lib/mock-data';
import { Search, ChevronRight, Copy } from 'lucide-react';

export function BottomPanel({ state }: { state: ReturnType<typeof useScanState> }) {
  const [activeTab, setActiveTab] = useState('opcode');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const result = state.status === 'COMPLETE' || state.status === 'IDLE' ? mockInitialScanResult : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!result || activeTab !== 'opcode') return;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, result.opcodes.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, activeTab]);

  return (
    <div className="h-[280px] bg-card border-t border-border flex shrink-0 z-10 relative">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary to-transparent z-20" />
      
      {/* Left Vertical Rail */}
      <div className="w-10 border-r border-border bg-secondary/30 flex flex-col items-center py-2 gap-2 z-10">
        <button className="w-6 h-6 border border-border bg-background hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Settings">
          <span className="text-[10px] font-mono">01</span>
        </button>
        <button className="w-6 h-6 border border-border bg-background hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative" title="Markers">
          <span className="text-[10px] font-mono">02</span>
          {result && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_5px_hsl(var(--neon-red))]" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs & Sub-toolbar */}
        <div className="flex items-center justify-between border-b border-border bg-card pr-2">
          <div className="flex h-full">
            {[
              { id: 'opcode', label: 'Opcode Analysis', hasIssue: true },
              { id: 'selectors', label: 'Function Selectors', hasIssue: false },
              { id: 'simulation', label: 'Simulation Trace', hasIssue: false },
              { id: 'fork', label: 'Fork Validation', hasIssue: false }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest border-r border-border transition-all relative flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'bg-background text-primary shadow-[inset_0_-2px_0_hsl(var(--neon-purple))]' : 'bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                {tab.hasIssue && result && <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_5px_hsl(var(--neon-red))]" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border bg-background px-2 py-0.5 focus-within:border-primary">
              <Search className="w-3 h-3 text-muted-foreground mr-1.5" />
              <input type="text" placeholder="Filter..." className="bg-transparent text-[10px] font-mono w-24 outline-none placeholder:text-muted-foreground/50" />
            </div>
            <div className="flex items-center border border-border bg-background px-2 py-0.5 focus-within:border-primary">
              <ChevronRight className="w-3 h-3 text-muted-foreground mr-1" />
              <input type="text" placeholder="Goto PC" className="bg-transparent text-[10px] font-mono w-16 outline-none placeholder:text-muted-foreground/50" />
            </div>
            <button className="border border-border bg-background p-1 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 bg-background overflow-hidden relative">
          {!result ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest">
              Data unavailable during scan
            </div>
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar relative">
              {activeTab === 'opcode' && (
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-card border-b border-border z-10 text-[9px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="w-6 px-1 border-r border-border text-center"></th>
                      <th className="px-2 py-1 font-normal w-16 border-r border-border">PC</th>
                      <th className="px-2 py-1 font-normal w-24 border-r border-border">Opcode</th>
                      <th className="px-2 py-1 font-normal w-12 border-r border-border text-right">Gas</th>
                      <th className="px-2 py-1 font-normal w-12 border-r border-border text-right">Stack</th>
                      <th className="px-2 py-1 font-normal">Note</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-mono">
                    {result.opcodes.map((row, i) => {
                      const isSelected = selectedIndex === i;
                      return (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedIndex(i)}
                          className={`border-b border-border/50 group outline-none opacity-0 animate-[fade-in_200ms_ease-out_forwards] cursor-pointer ${
                            isSelected ? 'bg-primary/10 relative' : 'hover:bg-secondary/50'
                          }`} 
                          style={{ animationDelay: `${Math.min(i * 5, 300)}ms` }}
                        >
                          {isSelected && <td className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_8px_hsl(var(--neon-purple))]" />}
                          <td className="w-6 px-1 border-r border-border/50 text-center">
                            {row.isCritical ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_5px_hsl(var(--neon-red))]" /> :
                             row.isWarning ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_5px_hsl(var(--warning))]" /> : null}
                          </td>
                          <td className={`px-2 py-0.5 border-r border-border/50 ${isSelected ? 'text-primary' : 'text-info'}`}>{row.pc}</td>
                          <td className={`px-2 py-0.5 border-r border-border/50 font-bold ${row.isCritical ? 'text-destructive' : row.isWarning ? 'text-warning' : isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{row.opcode}</td>
                          <td className="px-2 py-0.5 border-r border-border/50 text-muted-foreground text-right">{row.gas}</td>
                          <td className="px-2 py-0.5 border-r border-border/50 text-muted-foreground text-right">{row.stackDepth}</td>
                          <td className="px-2 py-0.5 text-muted-foreground truncate max-w-[400px]">{row.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {activeTab === 'selectors' && (
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-card border-b border-border z-10 text-[9px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 font-normal w-24">Selector</th>
                      <th className="px-2 py-1 font-normal">Signature</th>
                      <th className="px-2 py-1 font-normal w-24">Mutability</th>
                      <th className="px-2 py-1 font-normal w-24">Vis</th>
                      <th className="px-2 py-1 font-normal w-16 text-right">Calls</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-mono">
                    {result.selectors.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/50 group opacity-0 animate-[fade-in_200ms_ease-out_forwards]" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                        <td className="px-2 py-1 text-primary">{row.selector}</td>
                        <td className="px-2 py-1 text-foreground">{row.signature}</td>
                        <td className="px-2 py-1">
                          <span className={`px-1 py-0.5 bg-background border border-border text-[9px] uppercase ${row.mutability === 'payable' ? 'text-destructive' : row.mutability === 'nonpayable' ? 'text-warning' : 'text-success'}`}>
                            {row.mutability}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-muted-foreground uppercase text-[9px]">{row.visibility}</td>
                        <td className="px-2 py-1 text-muted-foreground text-right">{row.calls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'simulation' && (
                <div className="p-2 font-mono text-[11px] space-y-1">
                  {result.simulationTraces.map((trace, i) => (
                    <div key={i} className="whitespace-pre text-muted-foreground hover:text-foreground opacity-0 animate-[fade-in_200ms_ease-out_forwards]" style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>
                      {trace}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'fork' && (
                <div className="p-4 grid grid-cols-3 gap-4">
                  <div className="border border-border p-3 bg-card opacity-0 animate-[fade-in_200ms_ease-out_forwards]" style={{ animationDelay: '0ms' }}>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest mb-1">Block Number</div>
                    <div className="text-lg font-mono text-info">{result.forkValidation.blockNumber}</div>
                  </div>
                  <div className="border border-border p-3 bg-card opacity-0 animate-[fade-in_200ms_ease-out_forwards]" style={{ animationDelay: '50ms' }}>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest mb-1">State Diffs</div>
                    <div className="text-lg font-mono text-warning">{result.forkValidation.stateDiffs}</div>
                  </div>
                  <div className="border border-border p-3 bg-card opacity-0 animate-[fade-in_200ms_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest mb-1">Balance Changes</div>
                    <div className="text-lg font-mono text-destructive">{result.forkValidation.balanceChanges}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}