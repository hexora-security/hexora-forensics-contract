import { useState, useEffect } from 'react';
import { useScanState } from '@/hooks/useScanState';
import { mockInitialScanResult } from '@/lib/mock-data';
import { ArrowRight } from 'lucide-react';

function useCountUp(end: number, duration: number = 600, active: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(end * easeProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, active]);

  return count;
}

export function RightPanel({ state }: { state: ReturnType<typeof useScanState> }) {
  const result = state.status === 'COMPLETE' || state.status === 'IDLE' ? mockInitialScanResult : null;
  const isComplete = !!result;

  const score = useCountUp(result?.confidenceScore || 0, 600, isComplete);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = isComplete ? circumference - (score / 100) * circumference : circumference;
  
  const getRiskGlow = (risk: string) => {
    switch(risk) {
      case 'CRITICAL': return '[text-shadow:0_0_15px_hsl(var(--neon-red)/0.8)] text-destructive';
      case 'HIGH': return '[text-shadow:0_0_15px_hsl(var(--warning)/0.8)] text-warning';
      case 'MEDIUM': return '[text-shadow:0_0_15px_hsl(var(--yellow-500)/0.8)] text-yellow-500';
      case 'LOW': return '[text-shadow:0_0_15px_hsl(var(--neon-green)/0.8)] text-success';
      case 'SAFE': return 'text-success/50';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskStroke = (risk: string) => {
    switch(risk) {
      case 'CRITICAL': return 'stroke-destructive';
      case 'HIGH': return 'stroke-warning';
      case 'MEDIUM': return 'stroke-yellow-500';
      case 'LOW': return 'stroke-success';
      case 'SAFE': return 'stroke-success/50';
      default: return 'stroke-muted-foreground';
    }
  };

  return (
    <aside className="w-[340px] bg-card flex flex-col shrink-0 z-10 border-b border-border relative">
      <div className="p-4 border-b border-border bg-background/50 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary to-transparent" />
        
        <div className="relative w-32 h-32 flex items-center justify-center mb-2">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="45" stroke="currentColor" strokeWidth="2" fill="none" className="text-secondary" />
            <circle 
              cx="64" 
              cy="64" 
              r="45" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ease-out ${getRiskStroke(result?.riskLevel || 'SAFE')}`} 
              style={{ filter: result?.riskLevel === 'CRITICAL' ? 'drop-shadow(0 0 4px hsl(var(--neon-red)))' : 'none' }}
            />
          </svg>
          <div className="flex flex-col items-center justify-center relative z-10 bg-background rounded-full w-20 h-20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            <div className={`text-2xl font-mono font-bold tracking-tighter transition-colors ${getRiskGlow(result?.riskLevel || 'SAFE')}`}>
              {result ? `${score.toFixed(0)}` : '--'}
            </div>
            <div className="text-[8px] text-muted-foreground font-mono uppercase">Score</div>
          </div>
        </div>

        <div className={`inline-flex px-4 py-1 border text-[10px] font-bold uppercase tracking-widest ${getRiskColors(result?.riskLevel || 'SAFE')} ${result?.riskLevel === 'CRITICAL' ? 'animate-[neon-pulse_1s_ease-in-out_infinite]' : ''}`}
             style={{ '--glow-color': result?.riskLevel === 'CRITICAL' ? 'var(--neon-red)' : result?.riskLevel === 'HIGH' ? 'var(--warning)' : 'transparent' } as React.CSSProperties}>
          {result ? result.riskLevel : 'AWAITING'}
        </div>

        <div className="mt-3 text-[9px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 border border-border">
          SIG: {state.scanSignature || 'PENDING'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 border-b border-border relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-3">Severity Heatmap</h2>
          <div className="flex items-end gap-1 h-16 bg-background border border-border p-2">
            <HeatmapBar label="CRI" value={result?.findingsSummary.critical} max={20} color="bg-destructive shadow-[0_0_8px_hsl(var(--neon-red))]" isComplete={isComplete} />
            <HeatmapBar label="HIG" value={result?.findingsSummary.high} max={20} color="bg-warning shadow-[0_0_8px_hsl(var(--warning))]" isComplete={isComplete} />
            <HeatmapBar label="MED" value={result?.findingsSummary.medium} max={20} color="bg-yellow-500" isComplete={isComplete} />
            <HeatmapBar label="LOW" value={result?.findingsSummary.low} max={20} color="bg-success" isComplete={isComplete} />
            <HeatmapBar label="INF" value={result?.findingsSummary.info} max={20} color="bg-info" isComplete={isComplete} />
          </div>
        </div>

        <div className="p-3 border-b border-border relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-3 text-destructive">Critical Findings</h2>
          <div className="space-y-2">
            {result ? result.topFindings.map((finding, i) => (
              <div 
                key={finding.id} 
                className="group border border-border bg-background p-2 relative shadow-[0_0_8px_hsl(var(--neon-red)/0.1)] border-destructive/20 animate-[fade-in_200ms_ease-out_forwards] opacity-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-destructive shadow-[0_0_8px_hsl(var(--neon-red))] animate-[status-dot-pulse_2s_ease-in-out_infinite]" />
                
                <div className="flex items-start gap-2 mb-1 pl-1">
                  <span className="text-[9px] font-mono bg-destructive/20 text-destructive px-1 py-0.5 border border-destructive/30 shrink-0">
                    {finding.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-destructive truncate" title={finding.title}>{finding.title}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-end pl-1 mt-1">
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 max-w-[80%]">{finding.description}</p>
                  <span className="text-[9px] font-mono text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    JUMP <ArrowRight className="w-2 h-2" />
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border bg-secondary/20">No findings available</div>
            )}
          </div>
        </div>

        <div className="p-3 relative border-b border-border">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-3">Recent Scans</h2>
          <div className="space-y-1.5">
            {state.scanHistory.map((scan, i) => (
              <button key={scan.id} className="w-full flex items-center justify-between p-1.5 border border-border bg-background hover:bg-secondary transition-colors text-left group">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    scan.risk === 'CRITICAL' ? 'bg-destructive' :
                    scan.risk === 'HIGH' ? 'bg-warning' :
                    scan.risk === 'MEDIUM' ? 'bg-yellow-500' :
                    'bg-success'
                  }`} />
                  <span className="text-[10px] font-bold uppercase">{scan.nickname}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                  <span className="group-hover:text-foreground transition-colors">{scan.score.toFixed(1)}</span>
                  <span>{scan.completedAt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HeatmapBar({ label, value = 0, max, color, isComplete }: { label: string, value?: number, max: number, color: string, isComplete: boolean }) {
  const count = useCountUp(value, 600, isComplete);
  const heightPercent = isComplete ? Math.max(5, (count / max) * 100) : 5;

  return (
    <div className="flex-1 flex flex-col items-center gap-1 group relative">
      <div className="absolute -top-6 bg-popover border border-border px-1 py-0.5 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        {Math.round(count)}
      </div>
      <div className="w-full bg-secondary relative h-[40px] flex items-end">
        <div className={`w-full ${color} transition-all duration-700 ease-out opacity-80 group-hover:opacity-100`} style={{ height: `${heightPercent}%` }} />
      </div>
      <span className="text-[8px] font-mono text-muted-foreground uppercase">{label}</span>
    </div>
  );
}

function getRiskColors(risk: string) {
  switch(risk) {
    case 'CRITICAL': return 'bg-destructive/10 border-destructive text-destructive shadow-[0_0_15px_hsl(var(--neon-red)/0.3)]';
    case 'HIGH': return 'bg-warning/10 border-warning text-warning shadow-[0_0_10px_hsl(var(--warning)/0.2)]';
    case 'MEDIUM': return 'bg-yellow-500/10 border-yellow-500 text-yellow-500';
    case 'LOW': return 'bg-success/10 border-success text-success';
    case 'SAFE': return 'bg-background border-success/30 text-success/50';
    default: return 'bg-background border-border text-muted-foreground';
  }
}