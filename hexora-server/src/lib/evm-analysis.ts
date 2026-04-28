export interface BytecodeFlag {
  opcode: string;
  offset: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
}

export interface BytecodeAnalysisResult {
  byteLength: number;
  flags: BytecodeFlag[];
  functionSelectors: string[];
  dangerousMatches: string[];
  hasSelfdestruct: boolean;
  hasDelegatecall: boolean;
  hasCallcode: boolean;
  hasCreate2: boolean;
  isProxy: boolean;
  riskScore: number;
}

const PUSH4 = 0x63;
const OPCODE_SELFDESTRUCT = 0xff;
const OPCODE_DELEGATECALL = 0xf4;
const OPCODE_CALLCODE = 0xf2;
const OPCODE_CREATE2 = 0xf5;

const DANGEROUS_SELECTORS = new Map<string, string>([
  ["0x41c0e1b5", "Self-destruct trigger"],
  ["0xcbf0b0c0", "Self-destruct alias"],
  ["0x83197ef0", "Self-destruct alias"],
  ["0x853828b6", "Full balance drain"],
  ["0x4c6aebf8", "Explicit drain function"],
  ["0xf2fde38b", "Ownership transfer"],
  ["0x715018a6", "Ownership renunciation"],
  ["0x3659cfe6", "Upgrade proxy implementation"],
  ["0x4f1ef286", "Upgrade with delegatecall"],
  ["0x8129fc1c", "Unprotected initializer"],
  ["0xa5a1f3e2", "Backdoor destroy"],
  ["0xdb2e21bc", "Emergency drain"],
]);

function decodeHex(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    throw new Error("Invalid bytecode payload");
  }

  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

function extractSelectors(bytecode: Uint8Array): string[] {
  const selectors: string[] = [];

  for (let index = 0; index < bytecode.length; ) {
    const opcode = bytecode[index];

    if (opcode === PUSH4 && index + 4 < bytecode.length) {
      const selector = `0x${Buffer.from(bytecode.slice(index + 1, index + 5)).toString("hex")}`;
      if (selector !== "0x00000000" && selector !== "0xffffffff" && !selectors.includes(selector)) {
        selectors.push(selector);
      }
      index += 5;
      continue;
    }

    if (opcode >= 0x60 && opcode <= 0x7f) {
      const pushLength = opcode - 0x5f;
      index += 1 + pushLength;
      continue;
    }

    index += 1;
  }

  return selectors;
}

export function analyzeBytecode(bytecodeHex: string): BytecodeAnalysisResult {
  const bytecode = decodeHex(bytecodeHex);
  const flags: BytecodeFlag[] = [];
  let hasSelfdestruct = false;
  let hasDelegatecall = false;
  let hasCallcode = false;
  let hasCreate2 = false;
  let riskScore = 0;

  for (let index = 0; index < bytecode.length; index += 1) {
    const opcode = bytecode[index];

    if (opcode === OPCODE_SELFDESTRUCT) {
      hasSelfdestruct = true;
      riskScore += 50;
      flags.push({
        opcode: "SELFDESTRUCT",
        offset: index,
        severity: "CRITICAL",
        description: `SELFDESTRUCT found at 0x${index.toString(16).padStart(4, "0")}`,
      });
      continue;
    }

    if (opcode === OPCODE_DELEGATECALL) {
      hasDelegatecall = true;
      riskScore += 35;
      flags.push({
        opcode: "DELEGATECALL",
        offset: index,
        severity: "HIGH",
        description: `DELEGATECALL found at 0x${index.toString(16).padStart(4, "0")}`,
      });
      continue;
    }

    if (opcode === OPCODE_CALLCODE) {
      hasCallcode = true;
      riskScore += 30;
      flags.push({
        opcode: "CALLCODE",
        offset: index,
        severity: "HIGH",
        description: `CALLCODE found at 0x${index.toString(16).padStart(4, "0")}`,
      });
      continue;
    }

    if (opcode === OPCODE_CREATE2) {
      hasCreate2 = true;
      riskScore += 10;
      flags.push({
        opcode: "CREATE2",
        offset: index,
        severity: "MEDIUM",
        description: `CREATE2 found at 0x${index.toString(16).padStart(4, "0")}`,
      });
    }
  }

  const functionSelectors = extractSelectors(bytecode);
  const dangerousMatches = functionSelectors
    .filter((selector) => DANGEROUS_SELECTORS.has(selector))
    .map((selector) => `${selector} ${DANGEROUS_SELECTORS.get(selector)}`);

  return {
    byteLength: bytecode.length,
    flags,
    functionSelectors,
    dangerousMatches,
    hasSelfdestruct,
    hasDelegatecall,
    hasCallcode,
    hasCreate2,
    isProxy: hasDelegatecall && functionSelectors.length <= 3,
    riskScore,
  };
}

export function classifyKind(analysis: BytecodeAnalysisResult): string {
  if (analysis.hasSelfdestruct) return "UNPROTECTED_SELFDESTRUCT";
  if (
    analysis.hasDelegatecall &&
    analysis.dangerousMatches.some((match) => match.includes("Upgrade proxy implementation") || match.includes("Upgrade with delegatecall"))
  ) {
    return "UPGRADEABLE_PROXY";
  }
  if (analysis.hasDelegatecall && analysis.isProxy) return "DELEGATECALL_PROXY";
  if (analysis.hasDelegatecall) return "DANGEROUS_DELEGATECALL";
  if (analysis.hasCallcode) return "PRIVILEGED_CALLCODE";
  if (analysis.dangerousMatches.some((match) => match.includes("initializer"))) {
    return "UNPROTECTED_INITIALIZER";
  }
  if (analysis.dangerousMatches.some((match) => match.includes("Ownership"))) {
    return "ACCESS_CONTROL_RISK";
  }
  if (analysis.hasCreate2) return "CREATE2_RISK";
  if (analysis.flags.length > 0 || analysis.functionSelectors.length > 0) {
    return "SUSPICIOUS_BYTECODE";
  }
  return "CLEAN_CONTRACT";
}

export function classifySeverity(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "INFO";
}
