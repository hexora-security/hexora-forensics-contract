import { useState, useCallback, useRef } from 'react';

export type ScanStatus = 'IDLE' | 'SCANNING' | 'COMPLETE' | 'ERROR';
export type ScanMode = 'Static' | 'Symbolic' | 'Fuzzing' | 'Full';
export type Network = 'Ethereum' | 'Arbitrum' | 'Base' | 'Polygon' | 'BSC' | 'Optimism';

export interface ScanConfig {
  address: string;
  network: Network;
  mode: ScanMode;
}

export interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'success' | 'error';
  timestamp: string;
}

export interface ScanStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export function useScanState() {
  const [status, setStatus] = useState<ScanStatus>('IDLE');
  const [config, setConfig] = useState<ScanConfig>({
    address: '',
    network: 'Ethereum',
    mode: 'Full',
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [scanSteps, setScanSteps] = useState<ScanStep[]>([
    { id: 'bytecode', label: 'Fetching bytecode', status: 'pending' },
    { id: 'opcodes', label: 'Opcode analysis', status: 'pending' },
    { id: 'selectors', label: 'ABI selector extraction', status: 'pending' },
    { id: 'proxy', label: 'Proxy & admin slot analysis', status: 'pending' },
    { id: 'simulation', label: 'eth_call simulation', status: 'pending' },
    { id: 'fork', label: 'Fork validation', status: 'pending' },
    { id: 'offensive', label: 'Offensive exploit analysis', status: 'pending' },
    { id: 'report', label: 'Generating report', status: 'pending' }
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((id: string, status: ScanStep['status']) => {
    setScanSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status } : step
    ));
  }, []);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs(prev => [...prev, {
      message,
      level,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const startScan = useCallback(async () => {
    if (!config.address) {
      addLog('No contract address provided', 'error');
      return;
    }

    setStatus('SCANNING');
    setLogs([]);
    setScanProgress(0);
    setStartedAt(new Date());
    setCompletedAt(null);
    setScanSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    // Mapeia o modo do frontend para o modo do Rust
    const modeMap: Record<ScanMode, string> = {
      'Static': 'fast',
      'Symbolic': 'deep',
      'Fuzzing': 'deep',
      'Full': 'deep'
    };

    // Mapeia rede para chain ID
    const chainMap: Record<Network, string> = {
      'Ethereum': 'ethereum',
      'Arbitrum': 'arbitrum',
      'Base': 'ethereum',
      'Polygon': 'ethereum', 
      'BSC': 'bnb',
      'Optimism': 'ethereum'
    };

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('http://localhost:3001/api/scanner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: config.address,
          chain: chainMap[config.network],
          mode: modeMap[config.mode],
          simulation: true,
          fork: 'force'
        }),
        signal: abortControllerRef.current.signal
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'step') {
                updateStep(data.id, data.status);
                // Mapeia ID do step para progresso
                const stepIndex = scanSteps.findIndex(s => s.id === data.id);
                if (stepIndex >= 0) {
                  const progress = ((stepIndex + 1) / scanSteps.length) * 100;
                  setScanProgress(progress);
                }
              }
              
              if (data.type === 'log') {
                addLog(data.message, data.level);
              }
              
              if (data.type === 'complete') {
                setStatus('COMPLETE');
                setScanProgress(100);
                setCompletedAt(new Date());
                addLog(`Scan complete! Severity: ${data.report.severity}`, 'success');
                addLog(`Confidence score: ${data.report.confidenceScore}/100`, 'info');
              }
              
              if (data.type === 'error') {
                setStatus('ERROR');
                addLog(data.message, 'error');
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        addLog('Scan cancelled', 'warn');
      } else {
        setStatus('ERROR');
        addLog(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }
  }, [config.address, config.network, config.mode, addLog, updateStep, scanSteps.length]);

  const stopScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('IDLE');
  }, []);

  const updateConfig = useCallback((updates: Partial<ScanConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetScan = useCallback(() => {
    stopScan();
    setStatus('IDLE');
    setLogs([]);
    setScanProgress(0);
    setStartedAt(null);
    setCompletedAt(null);
    setConfig(prev => ({ ...prev, address: '' }));
    setScanSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
  }, [stopScan]);

  return {
    status,
    config,
    logs,
    scanProgress,
    startedAt,
    completedAt,
    scanSteps,
    startScan,
    stopScan,
    resetScan,
    updateConfig,
    setLogs,
  };
}