import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Timer,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------
 *  Types
 * -------------------------------------------------------------------- */

type Step =
  | "paywall"
  | "email"
  | "invoice"
  | "pending"
  | "confirmed"
  | "expired";

export interface PaymentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

/* ----------------------------------------------------------------------
 *  Mock data — replace with backend response
 * -------------------------------------------------------------------- */

const PAYMENT = {
  network: "Polygon",
  token: "USDT",
  amount: "3.99",
  address: "0xA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9T",
  priceUsd: "$3.99",
} as const;

const INVOICE_TTL_SECONDS = 15 * 60; // 15:00

/* ----------------------------------------------------------------------
 *  Component
 * -------------------------------------------------------------------- */

export function PaymentOverlay({
  isOpen,
  onClose,
  onUnlock,
}: PaymentOverlayProps) {
  const [step, setStep] = useState<Step>("paywall");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(INVOICE_TTL_SECONDS);

  // Reset machine whenever the dialog is closed.
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setStep("paywall");
      setEmail("");
      setEmailError(null);
      setSecondsLeft(INVOICE_TTL_SECONDS);
    }, 200); // wait for close animation
    return () => clearTimeout(t);
  }, [isOpen]);

  // Countdown — only ticks while the invoice is on screen.
  useEffect(() => {
    if (step !== "invoice") return;
    if (secondsLeft <= 0) {
      setStep("expired");
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  // Auto-confirm after pending.
  useEffect(() => {
    if (step !== "pending") return;
    const t = setTimeout(() => setStep("confirmed"), 2000);
    return () => clearTimeout(t);
  }, [step]);

  // Trigger callback on confirmed.
  useEffect(() => {
    if (step !== "confirmed") return;
    const t = setTimeout(() => {
      onUnlock();
    }, 1200);
    return () => clearTimeout(t);
  }, [step, onUnlock]);

  /* -------------------------------------------------------------------- */
  /*  Handlers                                                            */
  /* -------------------------------------------------------------------- */

  const handleStartPayment = useCallback(() => {
    setStep("email");
  }, []);

  const handleEmailSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim();
      // Lightweight RFC-ish check — not exhaustive on purpose.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setEmailError("Please enter a valid email address.");
        return;
      }
      setEmailError(null);
      setSecondsLeft(INVOICE_TTL_SECONDS);
      setStep("invoice");
    },
    [email],
  );

  const handleManualCheck = useCallback(() => {
    setStep("pending");
  }, []);

  const handleRegenerate = useCallback(() => {
    setSecondsLeft(INVOICE_TTL_SECONDS);
    setStep("invoice");
  }, []);

  /* -------------------------------------------------------------------- */
  /*  Render                                                              */
  /* -------------------------------------------------------------------- */

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#090c14]/96 p-0 shadow-[0_35px_120px_-30px_rgba(6,10,24,0.95)] backdrop-blur-2xl",
          step === "invoice" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_36%),radial-gradient(circle_at_85%_18%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
          <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl animate-[float-slow_8s_ease-in-out_infinite]" />
          <div className="absolute -right-12 bottom-6 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl animate-[float-slow_10s_ease-in-out_infinite]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),transparent_88%)]" />
        </div>

        <div
          className={cn(
            "relative h-[2px] w-full transition-colors",
            step === "confirmed"
              ? "bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"
              : step === "expired"
                ? "bg-gradient-to-r from-red-500/0 via-red-400 to-red-500/0"
                : "bg-gradient-to-r from-violet-500/0 via-violet-400 to-cyan-400/70",
          )}
        />

        <div className="relative z-10 p-6">
          {step === "paywall" && (
            <PaywallStep onContinue={handleStartPayment} />
          )}
          {step === "email" && (
            <EmailStep
              email={email}
              onEmailChange={(v) => {
                setEmail(v);
                if (emailError) setEmailError(null);
              }}
              error={emailError}
              onSubmit={handleEmailSubmit}
              onBack={() => setStep("paywall")}
            />
          )}
          {step === "invoice" && (
            <InvoiceStep
              secondsLeft={secondsLeft}
              onManualCheck={handleManualCheck}
            />
          )}
          {step === "pending" && <PendingStep />}
          {step === "confirmed" && <ConfirmedStep />}
          {step === "expired" && <ExpiredStep onRegenerate={handleRegenerate} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Paywall
 * -------------------------------------------------------------------- */

function PaywallStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <DialogHeader className="space-y-2 text-left">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-violet-500/5 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_12px_30px_-18px_rgba(139,92,246,0.8)]">
            <Lock className="h-5 w-5 text-violet-200" />
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Secure settlement
          </div>
        </div>
        <DialogTitle className="text-[28px] font-semibold tracking-tight text-white">
          Unlock full scan
        </DialogTitle>
        <DialogDescription className="max-w-[28rem] text-[15px] leading-6 text-slate-300/80">
          Run another contract analysis with full simulation &amp; fork
          validation.
        </DialogDescription>
      </DialogHeader>

      <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_40px_-28px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),transparent_45%,rgba(34,211,238,0.06))]" />
        <div className="flex items-end justify-between">
          <div className="relative z-10">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Per scan
            </div>
            <div className="mt-1 font-mono text-[2.2rem] font-semibold leading-none tracking-tight text-white">
              {PAYMENT.priceUsd}
            </div>
          </div>
          <Badge
            variant="outline"
            className="relative z-10 items-center gap-1.5 self-end rounded-none border-0 bg-transparent p-0 font-mono text-[16px] font-semibold leading-none text-white shadow-none"
          >
            <span className="mb-[10%] inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#26A17B] text-[9px] font-bold leading-none text-white">
              T
            </span>
            <span className="mb-[10%]">USDT</span>
          </Badge>
        </div>
      </Card>

      <FeatureList
        items={[
          "Full static + simulation + fork analysis",
          "Confidence breakdown & technical trace",
          "Suggested fixes for every attack vector",
        ]}
      />

      <Button
        size="lg"
        className="group relative h-12 w-full overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(90deg,#7c3aed,#8b5cf6,#a855f7)] text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(139,92,246,0.95)] transition-all hover:brightness-110"
        onClick={onContinue}
      >
        <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.22),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
        <Wallet className="mr-2 h-4 w-4" />
        Pay with Crypto
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Email
 * -------------------------------------------------------------------- */

function EmailStep({
  email,
  onEmailChange,
  error,
  onSubmit,
  onBack,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <DialogHeader className="space-y-2 text-left">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-violet-500/5 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_12px_30px_-18px_rgba(139,92,246,0.8)]">
            <Mail className="h-5 w-5 text-violet-200" />
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Trusted unlock
          </div>
        </div>
        <DialogTitle className="text-[28px] font-semibold tracking-tight text-white">
          Continue to payment
        </DialogTitle>
        <DialogDescription className="max-w-[28rem] text-[15px] leading-6 text-slate-300/80">
          We&apos;ll use this to link your payment and send your report.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="payment-email"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Email
        </Label>
        <Input
          id="payment-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={cn(
            "h-12 rounded-2xl border-white/10 bg-white/[0.04] font-mono text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
            error &&
              "border-red-500/60 focus-visible:border-red-500/60 focus-visible:ring-red-500/20",
          )}
          aria-invalid={!!error}
          aria-describedby={error ? "payment-email-error" : undefined}
        />
        {error && (
          <p
            id="payment-email-error"
            className="text-xs text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-12 flex-1 rounded-2xl text-sm text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="h-12 flex-[2] rounded-2xl border border-white/15 bg-[linear-gradient(90deg,#7c3aed,#8b5cf6,#a855f7)] text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(139,92,246,0.95)] hover:brightness-110"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Invoice
 * -------------------------------------------------------------------- */

function InvoiceStep({
  secondsLeft,
  onManualCheck,
}: {
  secondsLeft: number;
  onManualCheck: () => void;
}) {
  const timeLabel = useMemo(() => formatTime(secondsLeft), [secondsLeft]);
  const lowTime = secondsLeft <= 60;

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader className="space-y-2 text-left">
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground w-fit">
          Invoice issued
        </div>
        <DialogTitle className="text-[28px] font-semibold tracking-tight text-white">
          Complete payment
        </DialogTitle>
        <DialogDescription className="max-w-[28rem] text-[15px] leading-6 text-slate-300/80">
          Send the exact amount to the address below. Status updates
          automatically.
        </DialogDescription>
      </DialogHeader>

      {/* Network / token row */}
      <div className="grid grid-cols-2 gap-2">
        <InfoTile label="Network" value={PAYMENT.network} />
        <InfoTile label="Token" value={PAYMENT.token} />
      </div>

      {/* Amount */}
      <CopyField
        label="Amount"
        value={PAYMENT.amount}
        suffix={PAYMENT.token}
        mono
        emphasize
      />

      {/* Address */}
      <CopyField label="Address" value={PAYMENT.address} mono truncate />

      <Separator className="bg-border/60" />

      {/* Status + timer */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
          <span>Awaiting payment...</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
            lowTime
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : "border-white/10 bg-white/[0.04] text-muted-foreground",
          )}
        >
          <Timer className="h-3 w-3" />
          {timeLabel}
        </div>
      </div>

      <Button
        size="lg"
        variant="outline"
        className="h-12 w-full rounded-2xl border-white/10 bg-white/[0.04] text-sm font-medium text-white shadow-[0_18px_30px_-22px_rgba(0,0,0,0.9)] hover:bg-white/[0.08]"
        onClick={onManualCheck}
      >
        I&apos;ve paid
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Pending
 * -------------------------------------------------------------------- */

function PendingStep() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/20 bg-gradient-to-br from-amber-500/20 to-amber-500/5 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_18px_30px_-20px_rgba(251,191,36,0.8)]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-200" />
      </div>
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-xl font-semibold tracking-tight text-white">
          Payment detected
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-300/75">
          Waiting for blockchain confirmation...
        </DialogDescription>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Confirmed
 * -------------------------------------------------------------------- */

function ConfirmedStep() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_0_1px_rgba(52,211,153,0.08),0_18px_30px_-20px_rgba(52,211,153,0.8)]">
        <ShieldCheck className="h-7 w-7 text-emerald-200" />
      </div>
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-xl font-semibold tracking-tight text-emerald-100">
          Payment confirmed
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-300/75">
          Unlocking your scan...
        </DialogDescription>
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Step: Expired
 * -------------------------------------------------------------------- */

function ExpiredStep({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <DialogHeader className="space-y-2 text-left">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/20 to-red-500/5 shadow-[0_0_0_1px_rgba(248,113,113,0.08),0_12px_30px_-18px_rgba(248,113,113,0.8)]">
            <Timer className="h-5 w-5 text-red-200" />
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Renewal required
          </div>
        </div>
        <DialogTitle className="text-[28px] font-semibold tracking-tight text-white">
          Payment expired
        </DialogTitle>
        <DialogDescription className="max-w-[28rem] text-[15px] leading-6 text-slate-300/80">
          The invoice window closed before payment was received. Generate a new
          one to try again.
        </DialogDescription>
      </DialogHeader>
      <Button
        size="lg"
        className="h-12 w-full rounded-2xl border border-white/15 bg-[linear-gradient(90deg,#7c3aed,#8b5cf6,#a855f7)] text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(139,92,246,0.95)] hover:brightness-110"
        onClick={onRegenerate}
      >
        Generate new invoice
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Sub-components
 * -------------------------------------------------------------------- */

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function CopyField({
  label,
  value,
  suffix,
  mono,
  truncate,
  emphasize,
}: {
  label: string;
  value: string;
  suffix?: string;
  mono?: boolean;
  truncate?: boolean;
  emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in restricted contexts — fail silent.
    }
  }, [value]);

  return (
    <div className="min-w-0 flex flex-col gap-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </Label>
      <div
        className={cn(
          "group min-w-0 flex items-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          emphasize && "border-violet-400/20 bg-violet-500/[0.07] shadow-[0_18px_30px_-24px_rgba(139,92,246,0.75),inset_0_1px_0_rgba(255,255,255,0.03)]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-sm text-white",
            mono && "font-mono",
            truncate && "truncate",
            emphasize && "text-base font-semibold text-violet-50",
          )}
          title={value}
        >
          {value}
          {suffix && (
            <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
          )}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-xl px-2 text-xs whitespace-nowrap",
            copied
              ? "text-emerald-300 hover:text-emerald-200"
              : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
          )}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li
          key={it}
          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-100/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------------
 *  Helpers
 * -------------------------------------------------------------------- */

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default PaymentOverlay;
