import { useState, useRef, useEffect } from 'react';
import { useScanState } from '@/hooks/useScanState';
import { mockInitialScanResult } from '@/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';

export function TechnicalDetails({ state }: { state: ReturnType<typeof useScanState> }) {
  const isScanning = state.status === 'SCANNING';
  const isComplete = state.status === 'COMPLETE';
  const [isOpen, setIsOpen] = useState(false);
  const result = isComplete ? mockInitialScanResult : null;

  // Auto expand when scanning starts
  useEffect(() => {
    if (isScanning) setIsOpen(true);
  }, [isScanning]);

  if (state.status === 'IDLE') return null;

  return (
    <div className="mt-8 mb-12 animate-[fade-in_400ms_ease-out]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <h3 className="text-lg font-semibold">Technical details</h3>
          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t border-border">
          <Tabs defaultValue="livelog" className="w-full">
            <div className="px-6 pt-4 border-b border-border bg-secondary/10">
              <TabsList className="bg-transparent h-auto p-0 gap-6">
                <TabsTrigger value="livelog" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0 font-medium">Live Log</TabsTrigger>
                <TabsTrigger value="opcodes" disabled={!isComplete} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0 font-medium">Opcodes</TabsTrigger>
                <TabsTrigger value="selectors" disabled={!isComplete} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0 font-medium">Function Selectors</TabsTrigger>
                <TabsTrigger value="simulation" disabled={!isComplete} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0 font-medium">Simulation Trace</TabsTrigger>
                <TabsTrigger value="fork" disabled={!isComplete} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0 font-medium">Fork Validation</TabsTrigger>
              </TabsList>
            </div>

            <div className="bg-background/50 h-[400px] overflow-hidden">
              <TabsContent value="livelog" className="h-full m-0 border-0">
                <LiveLogViewer state={state} />
              </TabsContent>
              
              <TabsContent value="opcodes" className="h-full m-0 border-0 overflow-y-auto custom-scrollbar p-0">
                {result && (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-6 py-3 font-semibold w-24">PC</th>
                        <th className="px-6 py-3 font-semibold w-32">Opcode</th>
                        <th className="px-6 py-3 font-semibold w-24 text-right">Gas</th>
                        <th className="px-6 py-3 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {result.opcodes.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-2 text-muted-foreground">{row.pc}</td>
                          <td className={`px-6 py-2 font-medium ${row.isCritical ? 'text-destructive' : row.isWarning ? 'text-warning' : 'text-foreground'}`}>{row.opcode}</td>
                          <td className="px-6 py-2 text-muted-foreground text-right">{row.gas}</td>
                          <td className="px-6 py-2 text-muted-foreground">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TabsContent>

              <TabsContent value="selectors" className="h-full m-0 border-0 overflow-y-auto custom-scrollbar p-0">
                {result && (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-6 py-3 font-semibold w-32">Selector</th>
                        <th className="px-6 py-3 font-semibold">Signature</th>
                        <th className="px-6 py-3 font-semibold w-32">Mutability</th>
                        <th className="px-6 py-3 font-semibold w-32">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {result.selectors.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-3 text-primary">{row.selector}</td>
                          <td className="px-6 py-3 text-foreground">{row.signature}</td>
                          <td className="px-6 py-3 text-muted-foreground capitalize">{row.mutability}</td>
                          <td className="px-6 py-3 text-muted-foreground capitalize">{row.visibility}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TabsContent>

              <TabsContent value="simulation" className="h-full m-0 border-0 overflow-y-auto custom-scrollbar p-6">
                {result && (
                  <div className="font-mono text-sm space-y-1">
                    {result.simulationTraces.map((trace, i) => (
                      <div key={i} className="text-muted-foreground whitespace-pre">{trace}</div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fork" className="h-full m-0 border-0 overflow-y-auto custom-scrollbar p-6">
                {result && (
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-secondary/30 border border-border rounded-lg p-6 text-center">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Block Number</div>
                      <div className="text-3xl font-mono text-foreground">{result.forkValidation.blockNumber}</div>
                    </div>
                    <div className="bg-secondary/30 border border-border rounded-lg p-6 text-center">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">State Diffs</div>
                      <div className="text-3xl font-mono text-foreground">{result.forkValidation.stateDiffs}</div>
                    </div>
                    <div className="bg-secondary/30 border border-border rounded-lg p-6 text-center">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Balance Changes</div>
                      <div className="text-3xl font-mono text-foreground">{result.forkValidation.balanceChanges}</div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function LiveLogViewer({ state }: { state: ReturnType<typeof useScanState> }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [state.logs, autoScroll]);

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'CRITICAL': return 'text-destructive';
      case 'WARN': return 'text-warning';
      case 'INFO': return 'text-info';
      case 'SUCCESS': return 'text-success';
      case 'DEBUG': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-secondary/10 shrink-0">
        <div className="flex items-center gap-4 text-xs">
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 font-medium transition-colors ${autoScroll ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {autoScroll ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            Auto-scroll
          </button>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{state.logs.length} events</span>
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed"
      >
        {state.logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Waiting for scan telemetry...
          </div>
        ) : (
          <div className="space-y-0.5">
            {state.logs.map(log => (
              <div key={log.id} className="grid grid-cols-[120px_88px_1fr] items-baseline gap-4 group py-0.5 animate-[fade-in_200ms_ease-out]">
                <span className="text-muted-foreground/60 tabular-nums">{log.timestamp}</span>
                <span className={`font-semibold tracking-wide text-xs uppercase ${getLevelColor(log.level)}`}>{log.level}</span>
                <span className="text-foreground/90 break-words group-hover:text-foreground transition-colors">
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}