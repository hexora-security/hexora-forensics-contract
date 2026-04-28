import { useState } from 'react';
import { ChevronDown, FileCode2, AlertCircle, Sparkles, ArrowUpRight } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';
import { mockInitialScanResult, Finding } from '@/lib/mock-data';

const SEVERITY_META: Record<string, { label: string; dot: string; ring: string; bg: string; text: string; bar: string; tint: string }> = {
  CRITICAL: { label: 'Critical', dot: 'bg-destructive', ring: 'ring-destructive/30', bg: 'bg-destructive/10', text: 'text-destructive', bar: 'bg-destructive', tint: 'from-destructive/8 to-transparent' },
  HIGH:     { label: 'High',     dot: 'bg-warning',     ring: 'ring-warning/30',     bg: 'bg-warning/10',     text: 'text-warning',     bar: 'bg-warning',     tint: 'from-warning/8 to-transparent' },
  MEDIUM:   { label: 'Medium',   dot: 'bg-yellow-500',  ring: 'ring-yellow-500/30',  bg: 'bg-yellow-500/10',  text: 'text-yellow-500',  bar: 'bg-yellow-500',  tint: 'from-yellow-500/8 to-transparent' },
  LOW:      { label: 'Low',      dot: 'bg-info',        ring: 'ring-info/30',        bg: 'bg-info/10',        text: 'text-info',        bar: 'bg-info',        tint: 'from-info/8 to-transparent' },
  INFO:     { label: 'Info',     dot: 'bg-muted-foreground', ring: 'ring-muted-foreground/20', bg: 'bg-muted/40', text: 'text-muted-foreground', bar: 'bg-muted-foreground', tint: 'from-muted/20 to-transparent' },
};

export function FindingsList({ state }: { state: ReturnType<typeof useScanState> }) {
  const isComplete = state.status === 'COMPLETE';
  const isScanning = state.status === 'SCANNING';
  const [filter, setFilter] = useState<string>('ALL');

  if (isScanning) {
    return (
      <div className="mt-8 animate-[fade-in_400ms_ease-out]">
        <h3 className="text-lg font-semibold mb-4">Findings</h3>
        <div className="bg-card/60 backdrop-blur border border-border border-dashed rounded-2xl p-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Findings will surface here as soon as the analyzer detects them.
          </div>
        </div>
      </div>
    );
  }

  if (!isComplete) return null;

  const findings = mockInitialScanResult.findings;
  const groups = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

  const counts: Record<string, number> = { ALL: findings.length };
  groups.forEach(g => { counts[g] = findings.filter(f => f.severity === g).length; });

  const visibleGroups = filter === 'ALL' ? groups : (groups.filter(g => g === filter) as readonly string[]);

  return (
    <div className="mt-6 animate-[fade-in_400ms_ease-out]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-[0.08em]">
          Findings <span className="text-muted-foreground font-normal tabular-nums ml-1">{findings.length}</span>
        </h3>
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5">
          {(['ALL', ...groups] as const).map(key => {
            const isActive = filter === key;
            const count = counts[key] ?? 0;
            const meta = key === 'ALL' ? null : SEVERITY_META[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                disabled={key !== 'ALL' && count === 0}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
                title={key === 'ALL' ? 'All findings' : meta!.label}
              >
                {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
                <span>{key === 'ALL' ? 'All' : meta!.label}</span>
                <span className="tabular-nums opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8">
        {visibleGroups.map(severity => {
          const severityFindings = findings.filter(f => f.severity === severity);
          if (severityFindings.length === 0) return null;
          const meta = SEVERITY_META[severity];

          return (
            <section key={severity} className="animate-[slide-up_300ms_ease-out]">
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className={`w-2 h-2 rounded-full ${meta.dot} ${severity === 'CRITICAL' ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`} />
                <h4 className={`text-xs font-bold uppercase tracking-[0.15em] ${meta.text}`}>{meta.label}</h4>
                <span className="text-xs font-mono text-muted-foreground/70 tabular-nums">×{severityFindings.length}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
              </div>

              <div className="space-y-2">
                {severityFindings.map((finding, idx) => (
                  <FindingCard key={finding.id} finding={finding} meta={meta} index={idx} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FindingCard({ finding, meta, index }: { finding: Finding; meta: typeof SEVERITY_META[string]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative group bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-border/80 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] ${expanded ? 'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]' : ''}`}
      style={{ animation: `slide-up 300ms ease-out ${index * 60}ms backwards` }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.bar}`} />
      <div className={`absolute inset-0 bg-gradient-to-r ${meta.tint} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

      <button
        onClick={() => setExpanded(!expanded)}
        className="relative w-full px-5 py-4 flex items-center gap-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">{finding.title}</span>
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${meta.bg} ${meta.text}`}>
              {finding.category}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <FileCode2 className="w-3 h-3" />
              {finding.location}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="truncate">{finding.description.split('.')[0]}.</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180 text-foreground' : ''}`} />
      </button>

      {expanded && (
        <div className="relative border-t border-border/60 px-5 pt-5 pb-5 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 animate-[slide-down_240ms_ease-out]">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <h5 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What's wrong</h5>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{finding.description}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className={`w-3.5 h-3.5 ${meta.text}`} />
                <h5 className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${meta.text}`}>How to fix</h5>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{finding.recommendation}</p>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group/link"
            >
              View full advisory
              <ArrowUpRight className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Affected code</h5>
              <span className="text-[10px] font-mono text-muted-foreground/60">{finding.location}</span>
            </div>
            <div className={`relative bg-background/80 border border-border rounded-lg overflow-hidden`}>
              <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${meta.bar} opacity-50`} />
              <pre className="text-[12px] font-mono leading-[1.6] p-4 pl-5 overflow-x-auto custom-scrollbar">
                <code className="text-foreground/90">{finding.codeSnippet}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
