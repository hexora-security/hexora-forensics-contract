import { CheckCircle2, Circle, Loader2, Download, Share2, MoreHorizontal } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';
import { mockInitialScanResult } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';

export function ResultHero({ state }: { state: ReturnType<typeof useScanState> }) {
  const isComplete = state.status === 'COMPLETE';
  const isScanning = state.status === 'SCANNING';
  
  if (isScanning) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm animate-[fade-in_400ms_ease-out]">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-2">Analyzing bytecode...</h2>
          <p className="text-muted-foreground mb-8">Please wait while we perform static and symbolic analysis.</p>
          
          <div className="mb-8">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${state.scanProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-muted-foreground font-mono">
              <span>Progress</span>
              <span>{state.scanProgress}%</span>
            </div>
          </div>

          <div className="space-y-3">
            {state.scanSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                {step.status === 'complete' ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-muted" />
                )}
                <span className={step.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isComplete) return null;

  const result = mockInitialScanResult;

  const getRiskColors = (risk: string) => {
    switch(risk) {
      case 'CRITICAL': return 'bg-destructive text-destructive-foreground';
      case 'HIGH': return 'bg-warning text-warning-foreground';
      case 'MEDIUM': return 'bg-yellow-500 text-yellow-950';
      case 'LOW': return 'bg-info text-info-foreground';
      case 'SAFE': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getVerdict = (risk: string, counts: typeof result.findingsSummary) => {
    if (risk === 'CRITICAL') return `We found ${counts.critical} critical issues that could allow funds to be drained.`;
    if (risk === 'HIGH') return `We found ${counts.high} high severity issues requiring immediate attention.`;
    if (risk === 'SAFE') return 'No significant vulnerabilities were detected during the analysis.';
    return `Analysis complete. Found ${counts.medium + counts.low} minor issues.`;
  };

  return (
    <div className="relative bg-card/85 backdrop-blur-md border border-border rounded-xl shadow-sm animate-[fade-in_400ms_ease-out] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative px-6 py-5 flex items-center gap-6">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums leading-none">{result.confidenceScore}</span>
          <span className="text-xs font-medium text-muted-foreground/80">/100</span>
        </div>

        <div className="w-px h-10 bg-border shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.1em] ${getRiskColors(result.riskLevel)}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${result.riskLevel === 'CRITICAL' ? 'animate-pulse' : ''}`} />
              {result.riskLevel}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {result.findingsSummary.critical + result.findingsSummary.high + result.findingsSummary.medium + result.findingsSummary.low + result.findingsSummary.info} checks · depth 12
            </span>
          </div>
          <h2 className="text-base font-semibold text-foreground truncate">{getVerdict(result.riskLevel, result.findingsSummary)}</h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download report">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Share">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="More">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <SeverityBar summary={result.findingsSummary} />
    </div>
  );
}

function SeverityBar({ summary }: { summary: { critical: number; high: number; medium: number; low: number; info: number } }) {
  const total = summary.critical + summary.high + summary.medium + summary.low + summary.info;
  if (total === 0) return null;

  const segments = [
    { key: 'critical', count: summary.critical, color: 'bg-destructive', label: 'Critical' },
    { key: 'high', count: summary.high, color: 'bg-warning', label: 'High' },
    { key: 'medium', count: summary.medium, color: 'bg-yellow-500', label: 'Medium' },
    { key: 'low', count: summary.low, color: 'bg-info', label: 'Low' },
    { key: 'info', count: summary.info, color: 'bg-muted-foreground/40', label: 'Info' },
  ];

  return (
    <div className="relative px-6 pb-4">
      <div className="flex h-1 w-full rounded-full overflow-hidden bg-secondary/40">
        {segments.map(s => s.count > 0 && (
          <div
            key={s.key}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs">
        {segments.map(s => s.count > 0 && (
          <div key={s.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
            <span className="font-medium text-foreground tabular-nums">{s.count}</span>
            <span>{s.label.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}