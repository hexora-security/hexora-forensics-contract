export type LogLevel = 'INFO' | 'WARN' | 'CRITICAL' | 'SUCCESS' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface Finding {
  id: string;
  title: string;
  location: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  recommendation: string;
  codeSnippet: string;
  category: string;
}

export interface OpcodeRow {
  pc: string;
  opcode: string;
  gas: number;
  stackDepth: number;
  note: string;
  isCritical?: boolean;
  isWarning?: boolean;
}

export interface FunctionSelector {
  selector: string;
  signature: string;
  mutability: 'view' | 'pure' | 'nonpayable' | 'payable';
  visibility: 'public' | 'external';
  calls: number;
}

export interface ScanResult {
  confidenceScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  findingsSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: Finding[];
  opcodes: OpcodeRow[];
  selectors: FunctionSelector[];
  simulationTraces: string[];
  forkValidation: {
    blockNumber: number;
    stateDiffs: number;
    balanceChanges: number;
  };
}

export const mockInitialScanResult: ScanResult = {
  confidenceScore: 42,
  riskLevel: 'CRITICAL',
  findingsSummary: {
    critical: 3,
    high: 7,
    medium: 12,
    low: 4,
    info: 18,
  },
  findings: [
    {
      id: 'f1',
      title: 'Reentrancy in withdraw()',
      location: 'Vault.sol:42',
      severity: 'CRITICAL',
      description: 'The withdraw function makes an external call to the caller before updating their internal balance. This allows the caller to re-enter the withdraw function and drain the contract.',
      recommendation: 'Apply the Checks-Effects-Interactions pattern. Update the balance state variable before making the external call, or use a ReentrancyGuard modifier.',
      codeSnippet: `function withdraw(uint _amount) public {\n    require(balances[msg.sender] >= _amount);\n    (bool sent, ) = msg.sender.call{value: _amount}("");\n    require(sent, "Failed to send Ether");\n    balances[msg.sender] -= _amount;\n}`,
      category: 'Access Control'
    },
    {
      id: 'f2',
      title: 'Unprotected delegatecall',
      location: 'Proxy.sol:18',
      severity: 'CRITICAL',
      description: 'The contract uses delegatecall with user-supplied data without proper access controls. This could allow an attacker to execute arbitrary code in the context of the proxy, potentially destroying the contract or stealing funds.',
      recommendation: 'Restrict access to functions containing delegatecall. Ensure the target address is trusted and not user-controlled.',
      codeSnippet: `function execute(address target, bytes memory data) public {\n    (bool success, ) = target.delegatecall(data);\n    require(success);\n}`,
      category: 'Execution'
    },
    {
      id: 'f3',
      title: 'Integer Overflow in mint',
      location: 'Token.sol:112',
      severity: 'HIGH',
      description: 'Potential overflow in the mint function when adding to total supply. While Solidity 0.8+ has built-in checks, this contract is compiled with an older version or uses unchecked blocks improperly.',
      recommendation: 'Upgrade to Solidity ^0.8.0 or use SafeMath library for all arithmetic operations.',
      codeSnippet: `function mint(address to, uint256 amount) public onlyOwner {\n    totalSupply += amount;\n    balances[to] += amount;\n}`,
      category: 'Arithmetic'
    },
    {
      id: 'f4',
      title: 'Missing zero address validation',
      location: 'Token.sol:45',
      severity: 'LOW',
      description: 'The constructor assigns the owner role without checking if the address is the zero address.',
      recommendation: 'Add a require statement to ensure the new owner address is not address(0).',
      codeSnippet: `constructor(address _owner) {\n    owner = _owner;\n}`,
      category: 'Validation'
    }
  ],
  opcodes: [
    { pc: '0x00', opcode: 'PUSH1', gas: 3, stackDepth: 1, note: '0x80' },
    { pc: '0x02', opcode: 'PUSH1', gas: 3, stackDepth: 2, note: '0x40' },
    { pc: '0x04', opcode: 'MSTORE', gas: 12, stackDepth: 0, note: 'Memory[0x40] = 0x80' },
    { pc: '0x05', opcode: 'CALLVALUE', gas: 2, stackDepth: 1, note: '' },
    { pc: '0x06', opcode: 'DUP1', gas: 3, stackDepth: 2, note: '' },
    { pc: '0x07', opcode: 'ISZERO', gas: 3, stackDepth: 2, note: '' },
    { pc: '0x08', opcode: 'PUSH2', gas: 3, stackDepth: 3, note: '0x0010' },
    { pc: '0x0b', opcode: 'JUMPI', gas: 10, stackDepth: 1, note: 'Valid jump' },
    { pc: '0x0c', opcode: 'PUSH1', gas: 3, stackDepth: 2, note: '0x00' },
    { pc: '0x0e', opcode: 'DUP1', gas: 3, stackDepth: 3, note: '' },
    { pc: '0x0f', opcode: 'REVERT', gas: 0, stackDepth: 0, note: '' },
    { pc: '0x10', opcode: 'JUMPDEST', gas: 1, stackDepth: 1, note: '' },
    { pc: '0x11', opcode: 'CALL', gas: 700, stackDepth: 0, note: 'External Call', isCritical: true },
    { pc: '0x12', opcode: 'SSTORE', gas: 20000, stackDepth: 0, note: 'State Update', isWarning: true },
  ],
  selectors: [
    { selector: '0xa9059cbb', signature: 'transfer(address,uint256)', mutability: 'nonpayable', visibility: 'public', calls: 142 },
    { selector: '0x095ea7b3', signature: 'approve(address,uint256)', mutability: 'nonpayable', visibility: 'public', calls: 89 },
    { selector: '0x23b872dd', signature: 'transferFrom(address,address,uint256)', mutability: 'nonpayable', visibility: 'public', calls: 56 },
    { selector: '0x70a08231', signature: 'balanceOf(address)', mutability: 'view', visibility: 'public', calls: 412 },
    { selector: '0x18160ddd', signature: 'totalSupply()', mutability: 'view', visibility: 'public', calls: 105 },
  ],
  simulationTraces: [
    '[0] 0x6B175474... transfer(0x..., 100)',
    '  [1] 0x... SLOAD 0x01 -> 500',
    '  [1] 0x... SSTORE 0x01 -> 400',
    '  [1] 0x... SLOAD 0x02 -> 100',
    '  [1] 0x... SSTORE 0x02 -> 200',
    '  [1] LOG3 Transfer(0x..., 0x..., 100)',
  ],
  forkValidation: {
    blockNumber: 19438210,
    stateDiffs: 14,
    balanceChanges: 2,
  },
};

mockInitialScanResult.confidenceScore = 91;
mockInitialScanResult.riskLevel = 'LOW';
mockInitialScanResult.findingsSummary = {
  critical: 0,
  high: 0,
  medium: 1,
  low: 2,
  info: 6,
};
mockInitialScanResult.findings = [
  {
    id: 'f-proxy',
    title: 'Upgradeable proxy pattern detected',
    location: 'EIP-1967 slots',
    severity: 'INFO',
    description: 'The contract behaves as an upgradeable proxy. Delegatecall-based forwarding is present together with privileged upgrade selectors, and no unauthorized execution path was confirmed.',
    recommendation: 'This contract behaves as an upgradeable proxy (EIP-1967). Privileged upgrade functions are present but protected by access control. No exploitable execution path was identified. Risk is primarily associated with admin key compromise.',
    codeSnippet: `implementation: 0x1234567890abcdef1234567890abcdef12345678\nadmin: 0xabcdef1234567890abcdef1234567890abcdef12\nbeacon: not detected`,
    category: 'Proxy Architecture'
  },
  {
    id: 'f-admin',
    title: 'Admin key is the dominant residual risk',
    location: 'upgradeTo / upgradeToAndCall',
    severity: 'LOW',
    description: 'Upgrade authority appears access controlled. The remaining meaningful risk comes from privileged key compromise or malicious operator action.',
    recommendation: 'Protect admin authority with multisig, timelock, and upgrade monitoring.',
    codeSnippet: `if caller == admin {\n  upgradeTo(newImplementation);\n}`,
    category: 'Access Control'
  }
];

const LOG_MESSAGES = [
  { level: 'INFO', msg: 'Disassembling bytecode...' },
  { level: 'INFO', msg: 'Resolving JUMPDEST table...' },
  { level: 'DEBUG', msg: 'Building control flow graph...' },
  { level: 'INFO', msg: 'Reading EIP-1967 implementation slot...' },
  { level: 'SUCCESS', msg: 'Implementation resolved: 0x1234...5678' },
  { level: 'INFO', msg: 'Reading EIP-1967 admin slot...' },
  { level: 'SUCCESS', msg: 'Admin resolved: 0xabcd...ef12' },
  { level: 'INFO', msg: 'Upgrade selectors detected in runtime bytecode' },
  { level: 'WARN', msg: 'eth_call replay reverted across privileged entry points' },
  { level: 'INFO', msg: 'Treating upgrade paths as access controlled until disproven' },
  { level: 'DEBUG', msg: 'Offensive engine exploring exploitability graph...' },
  { level: 'SUCCESS', msg: 'No viable exploit paths found' },
  { level: 'INFO', msg: 'Fork validation started on local anvil...' },
  { level: 'SUCCESS', msg: 'Fork validation completed without state-changing exploit' },
  { level: 'SUCCESS', msg: 'Classified contract as UPGRADEABLE_PROXY' },
  { level: 'INFO', msg: 'Residual risk concentrated in admin key compromise' },
  { level: 'INFO', msg: 'Checking for selfdestruct...' },
  { level: 'SUCCESS', msg: 'No reachable selfdestruct found.' },
  { level: 'INFO', msg: 'Finalizing report...' },
] as const;

export function* generateLogs(): Generator<LogEntry, void, unknown> {
  let id = 0;
  for (const log of LOG_MESSAGES) {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    
    yield {
      id: `log_${id++}`,
      timestamp: ts,
      level: log.level as LogLevel,
      message: log.msg,
    };
  }
}
