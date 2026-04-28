import { useRef, useEffect, useState } from 'react';
import { Filter, Trash2, Download, Lock, Unlock } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';

export function CenterPanel({ state }: { state: ReturnType<typeof useScanState> }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const [filters, setFilters] = useState({
    INFO: true,
    WARN: true,
    CRITICAL: true,
    SUCCESS: true,
    DEBUG: true,
  });

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

  const filteredLogs = state.logs.filter(log => filters[log.level]);

  return (
    <main className="flex-1 flex flex-col bg-background relative z-10 min-w-0 border-r border-border">
      <div className="h-8 border-b border-border bg-card flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest border transition-colors ${autoScroll ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground border-border hover:bg-secondary'}`}
          >
            {autoScroll ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            FOLLOW
          </button>
          <div className="h-3 w-[1px] bg-border" />
          <div className="flex gap-1">
            {(Object.keys(filters) as Array<keyof typeof filters>).map(level => (
              <button
                key={level}
                onClick={() => setFilters(prev => ({ ...prev, [level]: !prev[level] }))}
                className={`text-[9px] uppercase px-1.5 py-0.5 border ${filters[level] ? getLevelColors(level).border : 'border-transparent text-muted-foreground bg-secondary/50'} transition-colors`}
              >
                {level.slice(0,4)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.status === 'SCANNING' && (
            <span className="text-[9px] font-mono text-primary animate-pulse">
              1.24 KB/s · 12 lines/s
            </span>
          )}
          <div className="h-3 w-[1px] bg-border" />
          <span className="text-[9px] font-mono text-muted-foreground">{filteredLogs.length} L</span>
          <button onClick={() => state.setLogs([])} className="text-muted-foreground hover:text-foreground p-1" title="Clear Logs">
            <Trash2 className="w-3 h-3" />
          </button>
          <button className="text-muted-foreground hover:text-foreground p-1" title="Export Logs">
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="absolute top-8 left-0 right-0 h-[1px] bg-gradient-to-r from-primary to-transparent z-20" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 mix-blend-screen opacity-30">
        <div className="w-full h-8 bg-gradient-to-b from-[hsl(var(--neon-purple)/0.2)] to-transparent animate-[scanline_4s_linear_infinite]" />
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-tight relative z-10 bg-background flex"
      >
        <div className="w-9 shrink-0 bg-secondary/20 border-r border-border flex flex-col items-end pt-2 pb-8 text-[9px] text-muted-foreground/40 select-none">
          {filteredLogs.map((_, i) => (
             <div key={`line-${i}`} className="h-[18px] pr-1.5 leading-[18px]">{i + 1}</div>
          ))}
          {state.status === 'SCANNING' && <div className="h-[18px] pr-1.5 leading-[18px]">{filteredLogs.length + 1}</div>}
        </div>

        <div className="flex-1 pt-2 pb-8 pl-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <span className="text-xl mb-2">_</span>
              <span className="uppercase tracking-widest text-[10px]">Awaiting telemetry</span>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredLogs.map(log => {
                const colors = getLevelColors(log.level);
                return (
                  <div key={log.id} className={`flex gap-3 hover:bg-secondary/50 px-1 h-[18px] items-center animate-[fade-in_120ms_ease-out_forwards] ${colors.bg} ${log.level === 'CRITICAL' ? 'animate-[critical-flash_600ms_ease-out_forwards]' : ''}`}>
                    <span className="text-muted-foreground shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`${colors.text} shrink-0 w-16`}>{log.level.slice(0,4)}</span>
                    <span className={`text-foreground whitespace-pre break-all truncate ${colors.glow ? '[text-shadow:0_0_8px_hsl(var(--neon-red)/0.8)] font-bold' : ''}`}>
                      {log.message}
                    </span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
              {state.status === 'SCANNING' && (
                <div className="flex items-center h-[18px] px-1">
                  <div className="w-[1ch] h-3 bg-primary shadow-[0_0_8px_hsl(var(--neon-cyan))] animate-[fade-in_1s_ease-in-out_infinite_alternate]" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function getLevelColors(level: string) {
  switch(level) {
    case 'CRITICAL': return { text: 'text-destructive', border: 'border-destructive text-destructive bg-destructive/10', bg: 'bg-destructive/5', glow: true };
    case 'WARN': return { text: 'text-warning', border: 'border-warning text-warning bg-warning/10', bg: '', glow: false };
    case 'INFO': return { text: 'text-info', border: 'border-info text-info bg-info/10', bg: '', glow: false };
    case 'SUCCESS': return { text: 'text-success', border: 'border-success text-success bg-success/10', bg: '', glow: false };
    case 'DEBUG': return { text: 'text-muted-foreground', border: 'border-border text-muted-foreground bg-secondary', bg: '', glow: false };
    default: return { text: 'text-foreground', border: 'border-border', bg: '', glow: false };
  }
}