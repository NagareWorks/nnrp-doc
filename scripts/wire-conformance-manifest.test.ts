import Ajv2020Module from "npm:ajv@8.17.1/dist/2020.js";
import type {
  WireConformancePreset,
  WireHostRouteProviderPreset,
} from "../docs/.vitepress/theme/components/capabilityManifestShared.ts";
import {
  buildWireHostRouteScenarioManifest,
  buildWireTargetManifest,
  type WireTransportTargetConfig,
} from "../docs/.vitepress/theme/components/wireConformanceManifest.ts";

type PresetDocument = {
  wire_conformance: WireConformancePreset[];
};

const repoRoot = new URL("../", import.meta.url);
const Ajv2020 = Ajv2020Module.default;
const presetDocument = JSON.parse(
  await Deno.readTextFile(
    new URL("docs/public/conformance/capability-manifest-presets.json", repoRoot),
  ),
) as PresetDocument;
const preset = presetDocument.wire_conformance.find((entry) =>
  entry.protocolVersion === "nnrp-1-preview4"
);

if (!preset) {
  throw new Error("nnrp-1-preview4 wire conformance preset was not generated");
}

for (const scenario of preset.scenarios) {
  if (scenario.expect.allowed_frames !== undefined) {
    if (scenario.expect.allowed_frames.length === 0) {
      throw new Error(`${scenario.id} allowed_frames must not be empty`);
    }
    for (const frame of scenario.expect.frames ?? []) {
      if (!scenario.expect.allowed_frames.includes(frame)) {
        throw new Error(`${scenario.id} required frame ${frame} is not allowed`);
      }
    }
  }
}

const transportSecurity = {
  server_name: "localhost",
  trusted_certificate_der_path: "certs/server.der",
  certificate_der_path: "certs/server.der",
  private_key_pkcs8_der_path: "certs/server-key.der",
};
const transportConfigs: WireTransportTargetConfig[] = [
  { enabled: true, name: "tcp", endpoint: "127.0.0.1:19091", tls: false },
  {
    enabled: true,
    name: "quic",
    endpoint: "127.0.0.1:19092",
    tls: true,
    security: transportSecurity,
  },
  {
    enabled: true,
    name: "websocket",
    endpoint: "ws://127.0.0.1:19093/nnrp",
    tls: false,
  },
  { enabled: true, name: "ipc", endpoint: "unix:///tmp/nnrp.sock", tls: false },
];
const hostRouteProviders = preset.hostRouteProviders.map((provider) => ({
  ...provider,
  platforms: [...provider.platforms],
  securityModes: [...provider.securityModes],
  enabled: true,
}));
const selectedScenarioIds = preset.scenarios.map((scenario) => scenario.id);
const targetManifest = buildWireTargetManifest({
  includeSchema: true,
  schemaPath: "../../schemas/wire-conformance-target.schema.json",
  targetName: "snapshot-target",
  preset,
  modes: preset.modes,
  transports: transportConfigs,
  hostRouteProviders,
  selectedScenarioIds,
  maxFrameBytes: 16 * 1024 * 1024,
  maxInFlight: 256,
});
const scenarioManifest = buildWireHostRouteScenarioManifest({
  includeSchema: true,
  schemaPath: "../../schemas/wire-conformance-scenario.schema.json",
  manifestName: "host-route-generated",
  preset,
  selectedScenarioIds,
});
const currentSnapshot = {
  target_manifest: targetManifest,
  host_route_scenario_manifest: scenarioManifest,
};
const snapshotUrl = new URL("snapshots/wire-conformance-host-route.json", import.meta.url);

if (Deno.env.get("UPDATE_SNAPSHOTS") === "1") {
  await Deno.mkdir(new URL("snapshots/", import.meta.url), { recursive: true });
  await Deno.writeTextFile(snapshotUrl, `${JSON.stringify(currentSnapshot, null, 2)}\n`);
}

const expectedSnapshot = JSON.parse(await Deno.readTextFile(snapshotUrl)) as Record<
  string,
  unknown
>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertJsonEquals(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);
  assert(
    actualJson === expectedJson,
    `${message}\nExpected:\n${expectedJson}\nActual:\n${actualJson}`,
  );
}

async function readSchema(name: string): Promise<Record<string, unknown>> {
  const configuredConformanceRoot = Deno.env.get("NNRP_CONFORMANCE_REPO")?.trim();
  const localUrl: string | URL = configuredConformanceRoot
    ? `${configuredConformanceRoot}/schemas/${name}`
    : new URL(`../nnrp-conformance/schemas/${name}`, repoRoot);
  try {
    return JSON.parse(await Deno.readTextFile(localUrl)) as Record<string, unknown>;
  } catch (error) {
    if (configuredConformanceRoot) {
      throw error;
    }
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const repository = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REPO")?.trim() ||
    "NagareWorks/nnrp-conformance";
  const reference = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REF")?.trim() || "main";
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/${reference}/schemas/${name}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${name} from ${repository}@${reference}: ${response.status} ${response.statusText}`,
    );
  }
  return JSON.parse(await response.text()) as Record<string, unknown>;
}

Deno.test("wire generator output matches the checked-in host-route snapshot", () => {
  assertJsonEquals(currentSnapshot, expectedSnapshot, "wire conformance snapshot changed");
});

Deno.test("wire generator output validates against the canonical schemas", async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const targetValidator = ajv.compile(await readSchema("wire-conformance-target.schema.json"));
  const scenarioValidator = ajv.compile(
    await readSchema("wire-conformance-scenario.schema.json"),
  );

  assert(
    targetValidator(targetManifest),
    `target manifest failed schema validation: ${JSON.stringify(targetValidator.errors)}`,
  );
  assert(
    scenarioValidator(scenarioManifest),
    `scenario manifest failed schema validation: ${JSON.stringify(scenarioValidator.errors)}`,
  );
});

Deno.test("wire generator preserves every frozen host-route carrier and oracle", () => {
  const providers = (targetManifest.wire_conformance as {
    host_route_providers: Array<{
      provider_id: string;
      transport: string;
      platforms: string[];
      installed: boolean;
      security_modes: string[];
    }>;
  }).host_route_providers;
  const providerById = new Map(providers.map((provider) => [provider.provider_id, provider]));
  const requiredProviders: Record<
    string,
    Pick<WireHostRouteProviderPreset, "transport"> & {
      platform: string;
    }
  > = {
    "nnrp.transport.tcp.native": { transport: "tcp", platform: "native" },
    "nnrp.transport.quic.native": { transport: "quic", platform: "native" },
    "nnrp.transport.ipc.native": { transport: "ipc", platform: "native" },
    "nnrp.transport.websocket.native": { transport: "websocket", platform: "native" },
    "nnrp.transport.websocket.browser-wasm": {
      transport: "websocket",
      platform: "browser",
    },
  };

  for (const [providerId, expected] of Object.entries(requiredProviders)) {
    const provider = providerById.get(providerId);
    assert(provider, `${providerId} is missing from the generated target manifest`);
    assert(provider.transport === expected.transport, `${providerId} has the wrong transport`);
    assert(provider.platforms.includes(expected.platform), `${providerId} has the wrong platform`);
  }
  assert(
    providerById.get("example.transport.quic.uninstalled")?.installed === false,
    "known-but-uninstalled provider must remain explicitly unavailable",
  );
  assert(
    providerById.get("nnrp.transport.websocket.native")?.security_modes?.includes("wss"),
    "native WebSocket provider must preserve the frozen WSS carrier",
  );

  const scenarios = scenarioManifest.scenarios as Array<{
    id: string;
    host_route: {
      application_endpoint: string;
      routes: Array<{ locator: string }>;
    };
    expect: { route: Record<string, unknown> };
  }>;
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  assert(scenarios.length === 12, "all 12 frozen host-route scenarios must be generated");
  for (const scenario of scenarios) {
    assert(
      /^nnrps?:\/\//.test(scenario.host_route.application_endpoint),
      `${scenario.id} must keep an NNRP application endpoint`,
    );
    assert(
      scenario.host_route.routes.every((route) => route.locator.startsWith("suite://")),
      `${scenario.id} must keep provider locators separate from the application endpoint`,
    );
  }

  assert(
    scenarioById.get("wire.host-route.client.multi-route")?.host_route.routes.length === 2,
    "multi-route client fixture is missing",
  );
  assert(
    scenarioById.get("wire.host-route.server.multi-listener")?.expect.route
      .accepted_transports instanceof Array,
    "multi-listener active-transport evidence is missing",
  );
  assert(
    scenarioById.get("wire.host-route.server.atomic-bind-rollback")?.expect.route
      .atomic_rollback === true,
    "atomic listener rollback evidence is missing",
  );
  assert(
    scenarioById.get("wire.host-route.server.terminal-listener-failure")?.expect.route
      .terminal_failure === "nnrp.transport.tcp.native",
    "terminal listener failure evidence is missing",
  );
  assertJsonEquals(
    scenarioById.get("wire.host-route.client.rejection-precedence")?.expect.route
      .rejection_reasons,
    ["route-unresolved"],
    "combined-failure rejection precedence changed",
  );

  const scenarioJson = JSON.stringify(scenarioManifest);
  for (const forbiddenSecretField of ["private_key", "certificate_der", "secret_bytes"]) {
    assert(
      !scenarioJson.includes(forbiddenSecretField),
      `host-route scenario serialized forbidden secret field ${forbiddenSecretField}`,
    );
  }
});
