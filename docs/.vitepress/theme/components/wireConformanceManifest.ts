import type {
  WireConformanceMode,
  WireConformancePreset,
  WireConformanceTransport,
  WireHostPlatform,
  WireHostRouteProviderPreset,
  WireHostRouteSecurityMode,
} from "./capabilityManifestShared.ts";

export type WireTransportTargetConfig = {
  enabled: boolean;
  name: WireConformanceTransport;
  endpoint: string;
  tls: boolean;
  security?: {
    server_name: string;
    trusted_certificate_der_path: string;
    certificate_der_path: string;
    private_key_pkcs8_der_path: string;
  };
};

export type WireHostRouteProviderConfig = WireHostRouteProviderPreset & {
  enabled: boolean;
};

export type WireTargetManifestInput = {
  includeSchema: boolean;
  schemaPath: string;
  targetName: string;
  preset: WireConformancePreset;
  modes: WireConformanceMode[];
  transports: WireTransportTargetConfig[];
  hostRouteProviders: WireHostRouteProviderConfig[];
  selectedScenarioIds: string[];
  maxFrameBytes: number;
  maxInFlight: number;
};

export type WireHostRouteScenarioManifestInput = {
  includeSchema: boolean;
  schemaPath: string;
  manifestName: string;
  preset: WireConformancePreset;
  selectedScenarioIds: string[];
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildWireTargetManifest(input: WireTargetManifestInput): Record<string, unknown> {
  const selectedScenarios = input.preset.scenarios.filter((scenario) =>
    input.selectedScenarioIds.includes(scenario.id)
  );
  const hostRouteProviders = input.hostRouteProviders
    .filter((provider) => provider.enabled)
    .map((provider) => ({
      transport: provider.transport,
      provider_id: provider.providerId,
      installed: provider.installed,
      platforms: unique<WireHostPlatform>(provider.platforms),
      security_modes: unique<WireHostRouteSecurityMode>(provider.securityModes),
    }));
  const capabilities = unique([
    ...selectedScenarios.flatMap((scenario) => scenario.requiredCapabilities),
    ...(hostRouteProviders.length > 0 ? ["host.routes"] : []),
  ]).sort();
  const transports = input.transports.filter((transport) => transport.enabled).map((transport) => {
    const entry: Record<string, unknown> = {
      name: transport.name,
      endpoint: transport.endpoint.trim(),
      tls: transport.tls,
    };
    if (transport.tls && transport.security) {
      entry.security = cloneJson(transport.security);
    }
    return entry;
  });
  const manifest: Record<string, unknown> = {
    target_name: input.targetName.trim(),
    protocol_version: input.preset.protocolVersion,
    suite_version: input.preset.suiteVersion,
    wire_conformance: {
      modes: unique(input.modes),
      transports,
      ...(hostRouteProviders.length > 0 ? { host_route_providers: hostRouteProviders } : {}),
      capabilities,
      limits: {
        max_frame_bytes: Number(input.maxFrameBytes),
        max_in_flight: Number(input.maxInFlight),
      },
    },
  };
  if (input.includeSchema && input.schemaPath.trim()) {
    return { $schema: input.schemaPath.trim(), ...manifest };
  }
  return manifest;
}

export function buildWireHostRouteScenarioManifest(
  input: WireHostRouteScenarioManifestInput,
): Record<string, unknown> {
  const selectedIds = new Set(input.selectedScenarioIds);
  const scenarios = input.preset.scenarios
    .filter((scenario) => scenario.hostRoute && selectedIds.has(scenario.id))
    .map((scenario) => ({
      id: scenario.id,
      mode: scenario.mode,
      host_route: cloneJson(scenario.hostRoute),
      status: scenario.status,
      feature: scenario.feature,
      required_capabilities: [...scenario.requiredCapabilities],
      description: scenario.description,
      steps: cloneJson(scenario.steps),
      expect: cloneJson(scenario.expect),
    }));
  const manifest: Record<string, unknown> = {
    protocol_version: input.preset.protocolVersion,
    manifest_name: input.manifestName.trim(),
    scenarios,
  };
  if (input.includeSchema && input.schemaPath.trim()) {
    return { $schema: input.schemaPath.trim(), ...manifest };
  }
  return manifest;
}

export function stringifyManifest(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}
