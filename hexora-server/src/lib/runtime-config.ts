export type ScannerChain = "ethereum" | "arbitrum" | "bnb";
type EndpointProvider = "alchemy" | "infura" | "custom";
type EndpointTransport = "http" | "ws";

export interface RpcEndpoint {
  id: string;
  provider: EndpointProvider;
  transport: EndpointTransport;
  url: string;
}

export interface ChainRuntimeConfig {
  chain: ScannerChain;
  chainId: number;
  label: string;
  anvilUrl: string;
  httpEndpoints: RpcEndpoint[];
  wsEndpoints: RpcEndpoint[];
}

interface DerivedProviderConfig {
  alchemyHttpHost?: string;
  alchemyWsHost?: string;
  infuraHttpHost?: string;
  infuraWsHost?: string;
}

const CHAIN_METADATA: Record<
  ScannerChain,
  {
    chainId: number;
    label: string;
    envPrefix: string;
    derived: DerivedProviderConfig;
  }
> = {
  ethereum: {
    chainId: 1,
    label: "Ethereum",
    envPrefix: "ETHEREUM",
    derived: {
      alchemyHttpHost: "https://eth-mainnet.g.alchemy.com/v2",
      alchemyWsHost: "wss://eth-mainnet.g.alchemy.com/v2",
      infuraHttpHost: "https://mainnet.infura.io/v3",
      infuraWsHost: "wss://mainnet.infura.io/ws/v3",
    },
  },
  arbitrum: {
    chainId: 42161,
    label: "Arbitrum",
    envPrefix: "ARBITRUM",
    derived: {
      alchemyHttpHost: "https://arb-mainnet.g.alchemy.com/v2",
      alchemyWsHost: "wss://arb-mainnet.g.alchemy.com/v2",
      infuraHttpHost: "https://arbitrum-mainnet.infura.io/v3",
      infuraWsHost: "wss://arbitrum-mainnet.infura.io/ws/v3",
    },
  },
  bnb: {
    chainId: 56,
    label: "BNB Smart Chain",
    envPrefix: "BNB",
    derived: {},
  },
};

function parseValues(name: string): string[] {
  const value = process.env[name]?.trim();
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseChain(value: string | undefined): ScannerChain {
  if (value === "arbitrum" || value === "bnb") {
    return value;
  }
  return "ethereum";
}

function buildDerivedEndpoints(
  provider: "alchemy" | "infura",
  transport: EndpointTransport,
  hosts: DerivedProviderConfig,
  keys: string[],
): RpcEndpoint[] {
  const host =
    provider === "alchemy"
      ? transport === "http"
        ? hosts.alchemyHttpHost
        : hosts.alchemyWsHost
      : transport === "http"
        ? hosts.infuraHttpHost
        : hosts.infuraWsHost;

  if (!host) {
    return [];
  }

  return keys.map((key, index) => ({
    id: `${provider}-${transport}-${index + 1}`,
    provider,
    transport,
    url: `${host}/${key}`,
  }));
}

function buildCustomEndpoints(
  chain: ScannerChain,
  transport: EndpointTransport,
  values: string[],
): RpcEndpoint[] {
  return values.map((url, index) => ({
    id: `${chain}-custom-${transport}-${index + 1}`,
    provider: "custom",
    transport,
    url,
  }));
}

function createChainConfig(chain: ScannerChain): ChainRuntimeConfig {
  const metadata = CHAIN_METADATA[chain];
  const alchemyKeys = parseValues("ALCHEMY_KEYS");
  const infuraKeys = parseValues("INFURA_KEYS");
  const explicitHttp = parseValues(`${metadata.envPrefix}_HTTP_ENDPOINTS`);
  const explicitWs = parseValues(`${metadata.envPrefix}_WS_ENDPOINTS`);
  const chainIdOverride = Number(process.env[`${metadata.envPrefix}_CHAIN_ID`] ?? metadata.chainId);

  if (!Number.isInteger(chainIdOverride) || chainIdOverride <= 0) {
    throw new Error(`${metadata.envPrefix}_CHAIN_ID must be a positive integer`);
  }

  const httpEndpoints = [
    ...buildCustomEndpoints(chain, "http", explicitHttp),
    ...buildDerivedEndpoints("alchemy", "http", metadata.derived, alchemyKeys),
    ...buildDerivedEndpoints("infura", "http", metadata.derived, infuraKeys),
  ];

  const wsEndpoints = [
    ...buildCustomEndpoints(chain, "ws", explicitWs),
    ...buildDerivedEndpoints("alchemy", "ws", metadata.derived, alchemyKeys),
    ...buildDerivedEndpoints("infura", "ws", metadata.derived, infuraKeys),
  ];

  return {
    chain,
    chainId: chainIdOverride,
    label: metadata.label,
    anvilUrl: process.env.ANVIL_RPC_URL?.trim() || "http://127.0.0.1:8545",
    httpEndpoints,
    wsEndpoints,
  };
}

export const supportedChains = Object.keys(CHAIN_METADATA) as ScannerChain[];
export const defaultScannerChain = parseChain(process.env.SCANNER_CHAIN);
const chainConfigs = new Map<ScannerChain, ChainRuntimeConfig>(
  supportedChains.map((chain) => [chain, createChainConfig(chain)]),
);

export function getChainConfig(chain: ScannerChain): ChainRuntimeConfig {
  const config = chainConfigs.get(chain);
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  if (config.httpEndpoints.length === 0) {
    throw new Error(
      `No HTTP RPC endpoints configured for ${chain}. Set ${CHAIN_METADATA[chain].envPrefix}_HTTP_ENDPOINTS or provider keys.`,
    );
  }
  if (config.wsEndpoints.length === 0) {
    throw new Error(
      `No WS RPC endpoints configured for ${chain}. Set ${CHAIN_METADATA[chain].envPrefix}_WS_ENDPOINTS or provider keys.`,
    );
  }
  return config;
}

export function redactEndpointUrl(url: string): string {
  const match = url.match(/^(https?:\/\/|wss?:\/\/)(.*?)(\/(?:v2|v3)\/)([^/]+)$/i);
  if (!match) {
    return url;
  }

  const [, protocol, host, path, secret] = match;
  const visibleTail = secret.slice(-4);
  return `${protocol}${host}${path}***${visibleTail}`;
}
