import { useState, useEffect, useRef, useCallback } from 'react';
import { generateLogs, LogEntry } from '../lib/mock-data';

export type ScanStatus = 'IDLE' | 'SCANNING' | 'COMPLETE' | 'ERROR';
export type ScanMode = 'Static' | 'Symbolic' | 'Fuzzing' | 'Full';
export type Network = 'Ethereum' | 'Arbitrum' | 'Base' | 'Polygon' | 'BSC' | 'Optimism';

export interface ScanConfig {
  address: string;
  network: Network;
  mode: ScanMode;
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

  const [scanSteps, setScanSteps] = useState([
    { id: 'bytecode', label: 'Fetching bytecode', status: 'pending' },
    { id: 'cfg', label: 'Building control flow graph', status: 'pending' },
    { id: 'static', label: 'Running static analysis', status: 'pending' },
    { id: 'symbolic', label: 'Executing symbolic paths', status: 'pending' },
    { id: 'fuzz', label: 'Fuzzing invariants', status: 'pending' },
    { id: 'report', label: 'Generating report', status: 'pending' }
  ]);

  const logGeneratorRef = useRef<Generator<LogEntry, void, unknown> | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const startScan = useCallback(() => {
    setStatus('SCANNING');
    setLogs([]);
    setScanProgress(0);
    setStartedAt(new Date());
    setCompletedAt(null);
    setScanSteps(steps => steps.map(s => ({ ...s, status: 'pending' })));
    
    logGeneratorRef.current = generateLogs();
    
    scanIntervalRef.current = window.setInterval(() => {
      if (logGeneratorRef.current) {
        const result = logGeneratorRef.current.next();
        if (!result.done) {
          setLogs((prev) => {
            const newLogs = [...prev, result.value];
            const progress = Math.min(99, Math.floor((newLogs.length / 19) * 100));
            setScanProgress(progress);
            
            // Update steps based on progress
            setScanSteps(steps => steps.map((step, idx) => {
              const stepProgressThreshold = (idx + 1) * (100 / steps.length);
              if (progress >= stepProgressThreshold) {
                return { ...step, status: 'complete' };
              } else if (progress >= stepProgressThreshold - (100 / steps.length)) {
                return { ...step, status: 'active' };
              }
              return step;
            }));

            return newLogs;
          });
        } else {
          stopScan(true);
        }
      }
    }, 150); // Slower, calmer progression
  }, []);

  const stopScan = useCallback((success = true) => {
    if (scanIntervalRef.current !== null) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStatus(success ? 'COMPLETE' : 'IDLE');
    setScanProgress(success ? 100 : 0);
    if (success) {
      setCompletedAt(new Date());
      setScanSteps(steps => steps.map(s => ({ ...s, status: 'complete' })));
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<ScanConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetScan = useCallback(() => {
    setStatus('IDLE');
    setLogs([]);
    setScanProgress(0);
    setStartedAt(null);
    setCompletedAt(null);
    setConfig(prev => ({ ...prev, address: '' }));
  }, []);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current !== null) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

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
