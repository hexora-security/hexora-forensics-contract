import { useCallback, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useScanState } from '@/hooks/useScanState';
import { PaymentOverlay } from '@/components/PaymentOverlay';
import { ScanForm, type ScanRequest } from '@/components/ScanForm';
import { ScanSummarySidebar } from '@/components/results/ScanSummarySidebar';
import { RiskAssessment } from '@/components/results/RiskAssessment';
import { Button } from '@/components/ui/button';
import { CyberpunkBackground, Header } from '@/components/cyberpunk-bg';

export default function Home() {
  const scanState = useScanState();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [consumedScans, setConsumedScans] = useState(0);
  const [pendingScan, setPendingScan] = useState<ScanRequest | null>(null);

  const launchScan = useCallback((request: ScanRequest) => {
    scanState.updateConfig(request);
    scanState.startScan();
    setConsumedScans((value) => value + 1);
  }, [scanState]);

  const handleRequestScan = useCallback((request: ScanRequest) => {
    if (consumedScans === 0) {
      launchScan(request);
      return;
    }

    setPendingScan(request);
    setPaymentOpen(true);
  }, [consumedScans, launchScan]);

  const handleUnlock = useCallback(() => {
    setPaymentOpen(false);
    if (pendingScan) {
      launchScan(pendingScan);
      setPendingScan(null);
    }
  }, [launchScan, pendingScan]);

  const handleClosePayment = useCallback(() => {
    setPaymentOpen(false);
  }, []);

  const handleOpenPaymentDemo = useCallback(() => {
    setPendingScan(null);
    setPaymentOpen(true);
  }, []);

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      <CyberpunkBackground className="z-0" overlayOpacity={0.18} />
      <PaymentOverlay
        isOpen={paymentOpen}
        onClose={handleClosePayment}
        onUnlock={handleUnlock}
      />

      <div className="relative z-10 flex flex-col h-full">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          {scanState.status === 'IDLE' ? (
            <>
              <div className="pointer-events-none absolute right-6 top-24 z-20">
                <Button
                  type="button"
                  variant="outline"
                  className="pointer-events-auto gap-2 border-violet-500/30 bg-background/60 text-violet-100 hover:bg-violet-500/10 hover:text-violet-50"
                  onClick={handleOpenPaymentDemo}
                >
                  <CreditCard className="h-4 w-4" />
                  Demo payment overlay
                </Button>
              </div>
              <ScanForm state={scanState} onRequestScan={handleRequestScan} />
            </>
          ) : (
            <div className="flex h-full w-full flex-col animate-[fade-in_300ms_ease-out] lg:flex-row">
              <ScanSummarySidebar state={scanState} />
              <main className="flex-1 overflow-y-auto custom-scrollbar bg-background/40 backdrop-blur-sm">
                <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
                  <RiskAssessment
                    isScanning={scanState.status === 'SCANNING'}
                    progress={scanState.scanProgress}
                    logs={scanState.logs}
                  />
                </div>
              </main>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
