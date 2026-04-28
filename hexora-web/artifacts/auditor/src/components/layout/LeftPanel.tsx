import { Play, Square, Bug, Skull, Hash, AlertTriangle, EyeOff, Activity, GitBranch, Search, ShieldAlert, Cpu } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';
import { Switch } from '@/components/ui/switch';

const NETWORKS = [
  { id: 'Ethereum', symbol: 'Ξ', color: 'border-[#627EEA] text-[#627EEA] shadow-[#627EEA]' },
  { id: 'Arbitrum', symbol: 'ARB', color: 'border-[#28A0F0] text-[#28A0F0] shadow-[#28A0F0]' },
  { id: 'Base', symbol: 'BASE', color: 'border-[#0052FF] text-[#0052FF] shadow-[#0052FF]' },
  { id: 'Polygon', symbol: 'MATIC', color: 'border-[#8247E5] text-[#8247E5] shadow-[#8247E5]' },
  { id: 'BSC', symbol: 'BNB', color: 'border-[#F0B90B] text-[#F0B90B] shadow-[#F0B90B]' },
  { id: 'Optimism', symbol: 'OP', color: 'border-[#FF0420] text-[#FF0420] shadow-[#FF0420]' }
] as const;

const MODES = [
  { id: 'Static', desc: 'Fast AST structural analysis' },
  { id: 'Symbolic', desc: 'Path execution and constraint solving' },
  { id: 'Fuzzing', desc: 'Mutation-based invariant testing' },
  { id: 'Full', desc: 'All analysis engines active' }
] as const;

export function LeftPanel({ state, onOpenCmd }: { state: ReturnType<typeof useScanState>, onOpenCmd: () => void }) {
  const isScanning = state.status === 'SCANNING';
  const { config, toggleConfig, updateConfig, operatorSession, recentTargets } = state;

  const getEstRuntime = () => {
    switch (config.mode) {
      case 'Static': return '~3s';
      case 'Symbolic': return '~9s';
      case 'Fuzzing': return '~18s';
      case 'Full': return '~12s';
      default: return '~12s';
    }
  };

  const isAddressValid = config.address.length === 42 && config.address.startsWith('0x');

  return (
    <aside className="w-[280px] border-r border-border bg-card flex flex-col shrink-0 z-10 relative overflow-hidden text-[11px]">
      
      {/* 1. Operator session header */}
      <div className="h-[52px] border-b border-border bg-secondary/30 flex items-center justify-between px-3 relative shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary to-transparent" />
        <div className="flex flex-col justify-center">
          <div className="text-[9px] uppercase font-bold text-primary flex items-center gap-1.5 mb-0.5">
            <ShieldAlert className="w-3 h-3" />
            <span>OPERATOR // ROOT</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">{operatorSession.id}</div>
        </div>
        <div className="flex flex-col items-end justify-center font-mono text-[9px] text-muted-foreground gap-0.5">
          <div className="flex gap-2">
            <span className="uppercase text-muted-foreground/70">RPC</span>
            <span className="text-info w-[3ch] text-right">{operatorSession.rpcLatency.toFixed(0)}ms</span>
          </div>
          <div className="flex gap-2">
            <span className="uppercase text-muted-foreground/70">MEM</span>
            <span className="text-warning w-[4ch] text-right">{operatorSession.mempoolDepth}</span>
          </div>
          <div className="flex gap-2">
            <span className="uppercase text-muted-foreground/70">BLK</span>
            <span className="text-foreground w-[8ch] text-right">{operatorSession.blockNumber}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 2. Target acquisition */}
        <div className="p-3 border-b border-border relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-2">Target Acquisition</h2>
          <div className="relative mb-2">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">0x</div>
            <input 
              type="text" 
              value={config.address.replace(/^0x/, '')}
              onChange={(e) => updateConfig({ address: '0x' + e.target.value })}
              disabled={isScanning}
              className="w-full bg-background border border-border text-xs font-mono p-1.5 pl-6 pr-6 focus:outline-none focus:border-primary disabled:opacity-50"
              placeholder="Address..."
              spellCheck={false}
            />
            <div className={`absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${isAddressValid ? 'bg-success shadow-[0_0_5px_hsl(var(--neon-green))]' : 'bg-muted-foreground'}`} />
          </div>
          
          <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground mb-3 px-1">
            <span title="Bytecode size">BC: 24.1KB</span>
            <span>BLK: 14M</span>
            <span className="text-success border border-success/30 px-1 bg-success/5">VERIFIED</span>
          </div>

          <h3 className="text-[9px] uppercase text-muted-foreground/70 mb-1.5">Recent Targets</h3>
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {recentTargets.map(t => (
              <button 
                key={t.address}
                onClick={() => updateConfig({ address: t.address, network: t.network as any })}
                className="flex flex-col items-center bg-secondary/40 hover:bg-secondary border border-border p-1.5 shrink-0 transition-colors min-w-[50px]"
              >
                <span className="text-[10px] font-bold text-foreground mb-0.5">{t.nickname}</span>
                <span className="text-[8px] font-mono text-muted-foreground">{t.address.slice(2, 6)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Network selector */}
        <div className="p-3 border-b border-border relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-2">Network Segment</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {NETWORKS.map(net => {
              const isActive = config.network === net.id;
              return (
                <button
                  key={net.id}
                  onClick={() => updateConfig({ network: net.id as any })}
                  disabled={isScanning}
                  className={`relative flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-bold uppercase transition-all ${
                    isActive ? `bg-background border ${net.color} shadow-[inset_0_0_10px_currentColor,0_0_5px_currentColor]` : 'bg-secondary/30 border border-border text-muted-foreground hover:bg-secondary'
                  } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="font-mono">{net.symbol}</span>
                  {net.id.slice(0,3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Scan mode */}
        <div className="p-3 border-b border-border relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-2">Scan Mode</h2>
          <div className="flex border border-border bg-background">
            {MODES.map(mode => {
              const isActive = config.mode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => updateConfig({ mode: mode.id as any })}
                  disabled={isScanning}
                  title={mode.desc}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-secondary/50'
                  } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_hsl(var(--neon-purple))]" />}
                  {mode.id.slice(0,4)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Detector toggles */}
        <div className="p-3 relative">
          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-2 text-primary">Detectors</h2>
          <div className="space-y-1 mb-4">
            <ToggleRow label="Reentrancy" icon={GitBranch} severity="CRIT" value={config.toggles.detectReentrancy} onChange={() => toggleConfig('detectReentrancy')} disabled={isScanning} />
            <ToggleRow label="Selfdestruct" icon={Skull} severity="CRIT" value={config.toggles.checkSelfdestruct} onChange={() => toggleConfig('checkSelfdestruct')} disabled={isScanning} />
            <ToggleRow label="Int Overflow" icon={Hash} severity="HIGH" value={config.toggles.integerOverflow} onChange={() => toggleConfig('integerOverflow')} disabled={isScanning} />
            <ToggleRow label="Unchecked Call" icon={AlertTriangle} severity="MED" value={config.toggles.uncheckedCall} onChange={() => toggleConfig('uncheckedCall')} disabled={isScanning} />
            <ToggleRow label="Tx Origin" icon={EyeOff} severity="HIGH" value={config.toggles.txOrigin} onChange={() => toggleConfig('txOrigin')} disabled={isScanning} />
          </div>

          <div className="h-[1px] bg-border my-3 relative">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary to-transparent opacity-30" />
          </div>

          <h2 className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-2 text-info">Execution</h2>
          <div className="space-y-1">
            <ToggleRow label="Simulation" icon={Activity} severity="SYS" value={config.toggles.simulation} onChange={() => toggleConfig('simulation')} disabled={isScanning} colorClass="text-info" />
            <ToggleRow label="Fork Mode" icon={GitBranch} severity="SYS" value={config.toggles.forkMode} onChange={() => toggleConfig('forkMode')} disabled={isScanning} colorClass="text-info" />
            <ToggleRow label="Trace Internal" icon={Search} severity="SYS" value={config.toggles.traceInternal} onChange={() => toggleConfig('traceInternal')} disabled={isScanning} colorClass="text-info" />
            <ToggleRow label="Symbolic Paths" icon={Cpu} severity="EXP" value={config.toggles.symbolicPaths} onChange={() => toggleConfig('symbolicPaths')} disabled={isScanning} colorClass="text-info" />
            <ToggleRow label="MEV Replay" icon={Play} severity="EXP" value={config.toggles.mevReplay} onChange={() => toggleConfig('mevReplay')} disabled={isScanning} colorClass="text-info" />
          </div>
        </div>
      </div>

      {/* 6. RUN SCAN */}
      <div className="p-3 border-t border-border bg-card shrink-0 relative">
        <div className="flex justify-between items-center mb-1.5 px-1">
          <span className="text-[9px] uppercase font-mono text-muted-foreground">EST. RUNTIME: {getEstRuntime()}</span>
          <div className="flex gap-1">
            <span className="text-[9px] px-1 py-0.5 bg-secondary text-muted-foreground border border-border">⌘K</span>
            <span className="text-[9px] px-1 py-0.5 bg-secondary text-muted-foreground border border-border">⏎</span>
          </div>
        </div>

        {isScanning ? (
          <button 
            onClick={() => state.stopScan(false)}
            className="w-full bg-destructive/10 text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground p-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all animate-[neon-pulse_1.5s_ease-in-out_infinite]"
            style={{ '--glow-color': 'var(--neon-red)' } as React.CSSProperties}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            HALT SCAN
          </button>
        ) : (
          <button 
            onClick={state.startScan}
            className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground p-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_hsl(var(--neon-purple)/0.5)] active:scale-[0.98]"
            style={{ '--glow-color': 'var(--neon-purple)' } as React.CSSProperties}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            RUN SCAN
          </button>
        )}
        
        <div className="flex gap-2 mt-2">
          <button className="flex-1 py-1.5 text-[9px] uppercase border border-border text-muted-foreground hover:bg-secondary transition-colors font-bold tracking-widest">Save Preset</button>
          <button className="flex-1 py-1.5 text-[9px] uppercase border border-border text-muted-foreground hover:bg-secondary transition-colors font-bold tracking-widest">Clear</button>
        </div>
      </div>
    </aside>
  );
}

function ToggleRow({ label, icon: Icon, severity, value, onChange, disabled, colorClass = "text-primary" }: any) {
  return (
    <label className={`flex items-center justify-between p-1.5 border border-border cursor-pointer select-none transition-colors relative group ${value ? 'bg-primary/5 border-primary/30' : 'bg-background hover:bg-secondary/50'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {value && <div className={`absolute left-0 top-0 bottom-0 w-[2px] bg-current shadow-[0_0_8px_currentColor] ${colorClass}`} />}
      <div className="flex items-center gap-2 pl-1.5">
        <Icon className={`w-3.5 h-3.5 ${value ? colorClass : 'text-muted-foreground'}`} />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-2 pr-1">
        <span className={`text-[8px] font-mono px-1 py-0.5 border ${
          severity === 'CRIT' ? 'text-destructive border-destructive/50' :
          severity === 'HIGH' ? 'text-warning border-warning/50' :
          severity === 'MED' ? 'text-yellow-500 border-yellow-500/50' :
          'text-muted-foreground border-border'
        }`}>[{severity}]</span>
        <Switch checked={value} onCheckedChange={onChange} className="scale-75 origin-right" />
      </div>
    </label>
  );
}
