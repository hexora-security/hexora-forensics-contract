import { getChainConfig, redactEndpointUrl, type RpcEndpoint, type ScannerChain } from "./runtime-config";

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: number;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string };
};

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

interface EndpointMetric {
  failures: number;
  requestsServed: number;
  avgLatencyMs: number;
  isHealthy: boolean;
}

interface ProbeCache {
  expiresAt: number;
  data: EndpointProbe[];
}

export interface EndpointProbe {
  endpoint: string;
  isHealthy: boolean;
  failures: number;
  requestsServed: number;
  avgLatencyMs: number;
  chainId: number | null;
}

const endpointMetrics = new Map<string, EndpointMetric>();
const probeCache = new Map<ScannerChain, ProbeCache>();
const PROBE_CACHE_TTL_MS = 10_000;

function getMetricKey(chain: ScannerChain, endpoint: RpcEndpoint): string {
  return `${chain}:${endpoint.url}`;
}

function getMetric(chain: ScannerChain, endpoint: RpcEndpoint): EndpointMetric {
  const key = getMetricKey(chain, endpoint);
  let metric = endpointMetrics.get(key);
  if (!metric) {
    metric = {
      failures: 0,
      requestsServed: 0,
      avgLatencyMs: 0,
      isHealthy: false,
    };
    endpointMetrics.set(key, metric);
  }
  return metric;
}

function updateMetric(chain: ScannerChain, endpoint: RpcEndpoint, latencyMs: number, ok: boolean): void {
  const metric = getMetric(chain, endpoint);
  const requestCount = metric.requestsServed;
  metric.requestsServed += 1;
  metric.avgLatencyMs = (metric.avgLatencyMs * requestCount + latencyMs) / metric.requestsServed;
  if (ok) {
    metric.isHealthy = true;
  } else {
    metric.failures += 1;
    metric.isHealthy = false;
  }
}

async function rpcRequest<T>(
  chain: ScannerChain,
  endpoint: RpcEndpoint,
  method: string,
  params: unknown[],
): Promise<T> {
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as JsonRpcResponse<T>;
    if ("error" in payload) {
      throw new Error(payload.error.message);
    }

    updateMetric(chain, endpoint, Date.now() - startedAt, true);
    return payload.result;
  } catch (error) {
    updateMetric(chain, endpoint, Date.now() - startedAt, false);
    throw new Error(
      `${redactEndpointUrl(endpoint.url)} ${method} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function requestWithFailover<T>(
  chain: ScannerChain,
  method: string,
  params: unknown[],
): Promise<{ result: T; endpoint: RpcEndpoint }> {
  const errors: string[] = [];
  const config = getChainConfig(chain);

  for (const endpoint of config.httpEndpoints) {
    try {
      const result = await rpcRequest<T>(chain, endpoint, method, params);
      return { result, endpoint };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors.join(" | "));
}

async function probeEndpoint(chain: ScannerChain, endpoint: RpcEndpoint): Promise<EndpointProbe> {
  try {
    const [blockNumberHex, chainIdHex] = await Promise.all([
      rpcRequest<string>(chain, endpoint, "eth_blockNumber", []),
      rpcRequest<string>(chain, endpoint, "eth_chainId", []),
    ]);

    void blockNumberHex;
    const metric = getMetric(chain, endpoint);
    return {
      endpoint: redactEndpointUrl(endpoint.url),
      isHealthy: true,
      failures: metric.failures,
      requestsServed: metric.requestsServed,
      avgLatencyMs: metric.avgLatencyMs,
      chainId: Number.parseInt(chainIdHex, 16),
    };
  } catch {
    const metric = getMetric(chain, endpoint);
    return {
      endpoint: redactEndpointUrl(endpoint.url),
      isHealthy: false,
      failures: metric.failures,
      requestsServed: metric.requestsServed,
      avgLatencyMs: metric.avgLatencyMs,
      chainId: null,
    };
  }
}

export async function listEndpointHealth(chain: ScannerChain): Promise<EndpointProbe[]> {
  const cached = probeCache.get(chain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const config = getChainConfig(chain);
  const data = await Promise.all(config.httpEndpoints.map((endpoint) => probeEndpoint(chain, endpoint)));
  probeCache.set(chain, {
    expiresAt: Date.now() + PROBE_CACHE_TTL_MS,
    data,
  });
  return data;
}

export async function getConnectedChainId(chain: ScannerChain): Promise<number> {
  const probes = await listEndpointHealth(chain);
  const healthy = probes.find((probe) => probe.isHealthy && probe.chainId != null);
  return healthy?.chainId ?? getChainConfig(chain).chainId;
}

export async function isAnvilConnected(chain: ScannerChain): Promise<boolean> {
  const config = getChainConfig(chain);
  try {
    const response = await fetch(config.anvilUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function anvilRpc<T>(chain: ScannerChain, method: string, params: unknown[]): Promise<T> {
  const config = getChainConfig(chain);
  const response = await fetch(config.anvilUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anvil ${method} failed: HTTP ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;
  if ("error" in payload) {
    throw new Error(`Anvil ${method} failed: ${payload.error.message}`);
  }

  return payload.result;
}
