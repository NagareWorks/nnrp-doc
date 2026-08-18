import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  capabilityManifestPresetOverrides,
} from "../docs/.vitepress/theme/components/capabilityManifestPresetOverrides.ts";
import type {
  ApiProfilePreset,
  CapabilityCategory,
  CapabilityVersionPreset,
  LocalizedText,
  WireConformanceExpectation,
  WireConformanceMode,
  WireConformancePreset,
  WireConformanceStep,
  WireConformanceTransport,
  WireHostRouteFixture,
  WireHostRouteProviderPreset,
} from "../docs/.vitepress/theme/components/capabilityManifestShared.ts";

type ProtocolManifest = {
  protocol_version: string;
  status: string;
  case_manifests: string[];
};

type CaseDefinition = {
  layer: string;
  status: CapabilityCategory | "deprecated";
  required_capabilities: string[];
  description: string;
};

type CaseManifest = {
  manifest_name: string;
  cases: CaseDefinition[];
};

type ApiProfileSuiteManifest = {
  profile: string;
  schema_version: string;
  level: number;
  protocol_baselines: string[];
  recipe_manifests: string[];
};

type ApiProfileRecipe = {
  id: string;
  operation: string;
  required_capabilities?: string[];
  status?: CapabilityCategory;
  expect?: {
    terminal?: string;
    events?: Array<{
      type: string;
      min_count?: number;
      optional?: boolean;
    }>;
  };
};

type WireConformanceSuiteManifest = {
  protocol_version: string;
  suite_version: string;
  status: string;
  scenario_manifests: string[];
  modes?: WireConformanceMode[];
  transports?: WireConformanceTransport[];
};

type WireConformanceScenario = {
  id: string;
  mode: WireConformanceMode;
  status?: CapabilityCategory;
  feature: string;
  required_capabilities?: string[];
  description: string;
  steps: WireConformanceStep[];
  expect: WireConformanceExpectation;
  host_route?: WireHostRouteFixture;
};

type WireConformanceScenarioManifest = {
  scenarios: WireConformanceScenario[];
};

type TokenAggregate = {
  order: number;
  layers: Set<string>;
  categories: Set<CapabilityCategory>;
  descriptions: string[];
  combinations: string[];
};

type GitHubDirectoryEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
};

type ConformanceSource = {
  description: string;
  listVersionNames: () => Promise<string[]>;
  readJson: <T>(path: string) => Promise<T>;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = normalize(join(scriptDir, ".."));
const outputFile = join(
  repoRoot,
  "docs",
  ".vitepress",
  "theme",
  "components",
  "capabilityManifestPresets.generated.ts",
);
const jsonOutputFile = join(
  repoRoot,
  "docs",
  "public",
  "conformance",
  "capability-manifest-presets.json",
);
const siblingConformanceRoot = normalize(join(repoRoot, "..", "nnrp-conformance"));
const configuredConformanceRoot = Deno.env.get("NNRP_CONFORMANCE_REPO")?.trim();
const configuredConformanceGithubRepo = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REPO")?.trim();
const configuredConformanceGithubRef = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REF")?.trim();
const conformanceGithubRepo = configuredConformanceGithubRepo ||
  "NagareWorks/nnrp-conformance";
const conformanceGithubRef = configuredConformanceGithubRef || "main";
const conformanceGithubToken = Deno.env.get("NNRP_CONFORMANCE_GITHUB_TOKEN")?.trim() ||
  Deno.env.get("GITHUB_TOKEN")?.trim();

const layerOrder = new Map([
  ["L0", 0],
  ["L1", 1],
  ["L2", 2],
  ["L3", 3],
  ["L4", 4],
]);
const categoryOrder = new Map<CapabilityCategory, number>([
  ["mandatory", 0],
  ["optional", 1],
  ["experimental", 2],
  ["deprecated", 3],
]);

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }

    throw error;
  }
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function splitRepoPath(path: string): string[] {
  return path.split(/[\\/]+/).filter((segment) => segment.length > 0 && segment !== ".");
}

function joinRepoPath(...segments: string[]): string {
  return segments.flatMap((segment) => splitRepoPath(segment)).join("/");
}

function buildGitHubHeaders(accept: string): Headers {
  const headers = new Headers({
    Accept: accept,
    "User-Agent": "nnrp-doc capability preset generator",
  });

  if (conformanceGithubToken) {
    headers.set("Authorization", `Bearer ${conformanceGithubToken}`);
  }

  return headers;
}

function buildGitHubContentsUrl(path: string): string {
  const encodedPath = splitRepoPath(path).map((segment) => encodeURIComponent(segment)).join("/");
  const ref = encodeURIComponent(conformanceGithubRef);
  return `https://api.github.com/repos/${conformanceGithubRepo}/contents/${encodedPath}?ref=${ref}`;
}

async function fetchGitHubDirectory(path: string): Promise<GitHubDirectoryEntry[]> {
  const response = await fetch(buildGitHubContentsUrl(path), {
    headers: buildGitHubHeaders("application/vnd.github+json"),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to list ${path} from ${conformanceGithubRepo}@${conformanceGithubRef}: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json() as GitHubDirectoryEntry[];
}

async function fetchGitHubJsonFile<T>(path: string): Promise<T> {
  const response = await fetch(buildGitHubContentsUrl(path), {
    headers: buildGitHubHeaders("application/vnd.github.raw+json"),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${path} from ${conformanceGithubRepo}@${conformanceGithubRef}: ${response.status} ${response.statusText}`,
    );
  }

  return JSON.parse(await response.text()) as T;
}

async function createConformanceSource(): Promise<ConformanceSource> {
  const localConformanceRoot = configuredConformanceRoot ||
    ((!configuredConformanceGithubRepo &&
        !configuredConformanceGithubRef &&
        await pathExists(join(siblingConformanceRoot, "protocol")))
      ? siblingConformanceRoot
      : undefined);

  if (localConformanceRoot) {
    const localProtocolRoot = join(localConformanceRoot, "protocol");
    if (!(await pathExists(localProtocolRoot))) {
      throw new Error(
        `NNRP_CONFORMANCE_REPO is set to ${localConformanceRoot}, but ${localProtocolRoot} does not exist.`,
      );
    }

    return {
      description: "local nnrp-conformance checkout",
      listVersionNames: async () => {
        const versionNames: string[] = [];

        for await (const entry of Deno.readDir(localProtocolRoot)) {
          if (entry.isDirectory) {
            versionNames.push(entry.name);
          }
        }

        return versionNames.sort();
      },
      readJson: async <T>(path: string) => {
        const absolutePath = join(localConformanceRoot, ...splitRepoPath(path));
        return await readJsonFile<T>(absolutePath);
      },
    };
  }

  return {
    description: `${conformanceGithubRepo}@${conformanceGithubRef}`,
    listVersionNames: async () => {
      const entries = await fetchGitHubDirectory("protocol");
      return entries.filter((entry) => entry.type === "dir").map((entry) => entry.name).sort();
    },
    readJson: async <T>(path: string) => await fetchGitHubJsonFile<T>(path),
  };
}

function fallbackText(text: string): LocalizedText {
  return { zh: text, en: text };
}

function buildFallbackNote(
  version: string,
  status: string,
  capabilityCount: number,
): LocalizedText {
  return {
    zh: `自动从 nnrp-conformance 的 ${status} 基线派生，当前共有 ${capabilityCount} 个能力 token。`,
    en:
      `Derived automatically from the ${status} nnrp-conformance baseline. ${capabilityCount} capability tokens are currently exposed.`,
  };
}

function buildFallbackDescription(descriptions: string[]): LocalizedText {
  const english = descriptions.length <= 1
    ? (descriptions[0] ?? "")
    : `Derived from ${descriptions.length} cases. ${descriptions.join(" ")}`;
  return fallbackText(english);
}

function buildFallbackCombination(combinations: string[]): LocalizedText | undefined {
  if (combinations.length === 0) {
    return undefined;
  }

  const english = combinations.length === 1
    ? `Also selected with ${combinations[0]}.`
    : `Appears in multiple combined selections: ${combinations.join("; ")}.`;
  return fallbackText(english);
}

function apiProfileTitle(profile: string, level: number): LocalizedText {
  return {
    zh: `${profile} Level ${level}`,
    en: `${profile} Level ${level}`,
  };
}

function apiProfileNote(recipeCount: number, baselines: string[]): LocalizedText {
  return {
    zh: `从 OpenAI NNRP API Profile 的声明式 recipe 派生，覆盖 ${recipeCount} 个用例，适用于 ${
      baselines.join(", ")
    }。`,
    en:
      `Derived from OpenAI NNRP API profile recipes. Covers ${recipeCount} declarative cases for ${
        baselines.join(", ")
      }.`,
  };
}

function recipeSummary(recipe: ApiProfileRecipe): LocalizedText {
  const terminal = recipe.expect?.terminal ?? "unspecified";
  const eventTypes = recipe.expect?.events?.map((event) => event.type).join(", ") ||
    "no expected events";
  const text = `${recipe.operation}: ${terminal}; expects ${eventTypes}.`;
  return {
    zh: text,
    en: text,
  };
}

function wireConformanceTitle(protocolVersion: string): LocalizedText {
  return {
    zh: `${protocolVersion} 线路级一致性测试`,
    en: `${protocolVersion} Wire-level Conformance`,
  };
}

function wireConformanceNote(scenarioCount: number): LocalizedText {
  return {
    zh:
      `从线路级测试场景声明派生，覆盖 ${scenarioCount} 个由测试套件直接扮演客户端、服务端或代理的协议级场景。`,
    en:
      `Derived from wire-level conformance scenario manifests. Covers ${scenarioCount} protocol scenarios where the runner directly acts as client, server, or proxy.`,
  };
}

function wireScenarioSummary(scenario: WireConformanceScenario): LocalizedText {
  const zhByScenario: Record<string, string> = {
    "wire.host-route.native.websocket-wss-client":
      "原生客户端保持 nnrps 应用端点，并通过由测试套件持有凭据的 WSS WebSocket 载体建立连接。",
  };
  const zhByFeature: Record<string, string> = {
    "control.cancel_abort":
      "提交操作后发送取消帧，并验证对端通过协作终止或结构化丢弃原因完成收敛。",
    "control.priority_deadline":
      "在代理路径注入优先级更新和过期时间，验证过期任务会被显式丢弃而不是迟到完成。",
    "control.progress_backpressure":
      "由测试套件扮演服务端，发送进度、部分结果和信用更新，验证客户端遵守背压。",
    "control.capability_route_cache":
      "协商能力成本并发送路由、执行和缓存提示，验证降级或缓存未命中会被显式返回。",
  };

  return {
    zh: zhByScenario[scenario.id] ?? zhByFeature[scenario.feature] ??
      "线路级测试场景会直接交换 NNRP 帧，并校验终态、关键帧和观测证据。",
    en: scenario.description,
  };
}

function collectHostRouteProviders(
  scenarios: WireConformanceScenario[],
  transportOrder: WireConformanceTransport[],
): WireHostRouteProviderPreset[] {
  type ProviderAggregate = WireHostRouteProviderPreset & {
    availability: Set<"installed" | "uninstalled">;
  };

  const providers = new Map<string, ProviderAggregate>();
  for (const scenario of scenarios) {
    const fixture = scenario.host_route;
    if (!fixture) {
      continue;
    }

    const locallyUnavailable = scenario.expect.route?.rejection_reasons?.includes(
      "local-unavailable",
    ) ?? false;
    if (locallyUnavailable && fixture.routes.length !== 1) {
      throw new Error(
        `${scenario.id} cannot derive provider availability from a multi-route local-unavailable expectation`,
      );
    }

    for (const route of fixture.routes) {
      const availability = locallyUnavailable ? "uninstalled" : "installed";
      const existing = providers.get(route.provider_id);
      if (!existing) {
        providers.set(route.provider_id, {
          transport: route.transport,
          providerId: route.provider_id,
          installed: availability === "installed",
          platforms: [fixture.platform],
          securityModes: [route.security.mode],
          availability: new Set([availability]),
        });
        continue;
      }

      if (existing.transport !== route.transport) {
        throw new Error(
          `${route.provider_id} is assigned to both ${existing.transport} and ${route.transport}`,
        );
      }
      existing.availability.add(availability);
      existing.platforms = dedupe([...existing.platforms, fixture.platform]);
      existing.securityModes = dedupe([...existing.securityModes, route.security.mode]);
    }
  }

  const order = new Map(transportOrder.map((transport, index) => [transport, index]));
  return Array.from(providers.values())
    .map((provider) => {
      if (provider.availability.size !== 1) {
        throw new Error(
          `${provider.providerId} is declared as both installed and uninstalled by host-route scenarios`,
        );
      }
      const { availability: _availability, ...preset } = provider;
      return preset;
    })
    .sort((left, right) =>
      (order.get(left.transport) ?? 99) - (order.get(right.transport) ?? 99) ||
      left.providerId.localeCompare(right.providerId)
    );
}

function deriveOperationPreset(operation: string, recipes: ApiProfileRecipe[]) {
  const capabilitySet = new Set(recipes.flatMap((recipe) => recipe.required_capabilities ?? []));

  return {
    name: operation,
    streaming: capabilitySet.has("api.streaming"),
    nonStreaming: capabilitySet.has("api.non_streaming"),
    toolCalls: capabilitySet.has("api.tool_calls"),
    cancellation: capabilitySet.has("api.cancellation"),
  };
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(path)) as T;
}

async function collectVersionPresets(
  source: ConformanceSource,
): Promise<CapabilityVersionPreset[]> {
  const presets: CapabilityVersionPreset[] = [];

  for (const versionName of await source.listVersionNames()) {
    const manifestPath = joinRepoPath("protocol", versionName, "manifest.json");

    let manifest: ProtocolManifest;
    try {
      manifest = await source.readJson<ProtocolManifest>(manifestPath);
    } catch {
      continue;
    }

    const tokenMap = new Map<string, TokenAggregate>();
    let order = 0;

    for (const relativeCasePath of manifest.case_manifests) {
      const caseManifestPath = joinRepoPath("protocol", versionName, relativeCasePath);
      const caseManifest = await source.readJson<CaseManifest>(caseManifestPath);

      for (const testCase of caseManifest.cases) {
        const requiredCapabilities = testCase.required_capabilities ?? [];
        if (requiredCapabilities.length === 0) {
          continue;
        }

        for (const token of requiredCapabilities) {
          if (!tokenMap.has(token)) {
            tokenMap.set(token, {
              order,
              layers: new Set<string>(),
              categories: new Set<CapabilityCategory>(),
              descriptions: [],
              combinations: [],
            });
            order += 1;
          }

          const aggregate = tokenMap.get(token)!;
          aggregate.layers.add(testCase.layer);
          aggregate.categories.add(testCase.status);
          aggregate.descriptions = dedupe([...aggregate.descriptions, testCase.description]);

          const combination = requiredCapabilities.filter((item) => item !== token);
          if (combination.length > 0) {
            aggregate.combinations = dedupe([...aggregate.combinations, combination.join(", ")]);
          }
        }
      }
    }

    const overrides = capabilityManifestPresetOverrides[manifest.protocol_version];
    const capabilities = Array.from(tokenMap.entries())
      .sort((left, right) => left[1].order - right[1].order)
      .map(([token, aggregate]) => {
        const tokenOverride = overrides?.capabilityOverrides?.[token];
        const categories = Array.from(aggregate.categories).sort(
          (left, right) => (categoryOrder.get(left) ?? 99) - (categoryOrder.get(right) ?? 99),
        );
        const layers = Array.from(aggregate.layers).sort(
          (left, right) => (layerOrder.get(left) ?? 99) - (layerOrder.get(right) ?? 99),
        );

        return {
          token,
          layers: layers.join(" / "),
          categories,
          description: tokenOverride?.description ??
            buildFallbackDescription(aggregate.descriptions),
          combination: tokenOverride?.combination ??
            buildFallbackCombination(aggregate.combinations),
        };
      });

    presets.push({
      version: manifest.protocol_version,
      title: overrides?.title ?? fallbackText(manifest.protocol_version),
      note: overrides?.note ??
        buildFallbackNote(manifest.protocol_version, manifest.status, capabilities.length),
      recommendedPath: `conformance/${manifest.protocol_version}.capabilities.json`,
      capabilities,
    });
  }

  return presets.sort((left, right) => left.version.localeCompare(right.version));
}

async function collectApiProfilePresets(source: ConformanceSource): Promise<ApiProfilePreset[]> {
  const suitePath = joinRepoPath("profiles", "openai-compatible", "1", "manifest.json");
  let suite: ApiProfileSuiteManifest;

  try {
    suite = await source.readJson<ApiProfileSuiteManifest>(suitePath);
  } catch {
    return [];
  }

  const recipes: ApiProfileRecipe[] = [];
  for (const relativeRecipePath of suite.recipe_manifests) {
    recipes.push(
      await source.readJson<ApiProfileRecipe>(
        joinRepoPath("profiles", "openai-compatible", "1", relativeRecipePath),
      ),
    );
  }

  const operationNames = dedupe(recipes.map((recipe) => recipe.operation));

  return [
    {
      profile: suite.profile,
      schemaVersion: suite.schema_version,
      level: suite.level,
      title: apiProfileTitle(suite.profile, suite.level),
      note: apiProfileNote(recipes.length, suite.protocol_baselines),
      recommendedPath: `conformance/${suite.profile}-${suite.level}.api-capabilities.json`,
      protocolBaselines: suite.protocol_baselines,
      operations: operationNames.map((operation) =>
        deriveOperationPreset(operation, recipes.filter((recipe) => recipe.operation === operation))
      ),
      recipes: recipes.map((recipe) => ({
        id: recipe.id,
        operation: recipe.operation,
        status: recipe.status ?? "mandatory",
        requiredCapabilities: recipe.required_capabilities ?? [],
        summary: recipeSummary(recipe),
      })),
    },
  ];
}

async function collectWireConformancePresets(
  source: ConformanceSource,
): Promise<WireConformancePreset[]> {
  const suitePath = joinRepoPath("wire-conformance", "nnrp-1-preview4", "manifest.json");
  let suite: WireConformanceSuiteManifest;

  try {
    suite = await source.readJson<WireConformanceSuiteManifest>(suitePath);
  } catch {
    return [];
  }

  const scenarios: WireConformanceScenario[] = [];
  for (const relativeScenarioPath of suite.scenario_manifests) {
    const manifest = await source.readJson<WireConformanceScenarioManifest>(
      joinRepoPath("wire-conformance", "nnrp-1-preview4", relativeScenarioPath),
    );
    scenarios.push(...manifest.scenarios);
  }

  return [
    {
      protocolVersion: suite.protocol_version,
      suiteVersion: suite.suite_version,
      title: wireConformanceTitle(suite.protocol_version),
      note: wireConformanceNote(scenarios.length),
      recommendedPath: `conformance/${suite.protocol_version}.wire-target.json`,
      modes: suite.modes ?? ["suite_as_client", "suite_as_server"],
      transports: suite.transports ?? ["tcp", "quic"],
      hostRouteProviders: collectHostRouteProviders(
        scenarios,
        suite.transports ?? ["tcp", "quic"],
      ),
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        mode: scenario.mode,
        status: scenario.status ?? "experimental",
        feature: scenario.feature,
        requiredCapabilities: scenario.required_capabilities ?? [],
        description: scenario.description,
        summary: wireScenarioSummary(scenario),
        steps: scenario.steps,
        expect: scenario.expect,
        ...(scenario.host_route ? { hostRoute: scenario.host_route } : {}),
      })),
    },
  ];
}

type GeneratedPresetContent = {
  presets: CapabilityVersionPreset[];
  api_profiles: ApiProfilePreset[];
  wire_conformance: WireConformancePreset[];
};

async function generatedAtFor(content: GeneratedPresetContent): Promise<string> {
  if (await pathExists(jsonOutputFile)) {
    try {
      const previous = await readJsonFile<GeneratedPresetContent & { generated_at?: string }>(
        jsonOutputFile,
      );
      const previousContent: GeneratedPresetContent = {
        presets: previous.presets,
        api_profiles: previous.api_profiles,
        wire_conformance: previous.wire_conformance,
      };
      if (
        previous.generated_at && JSON.stringify(previousContent) === JSON.stringify(content)
      ) {
        return previous.generated_at;
      }
    } catch {
      // A malformed checked-in output is replaced below with a fresh document.
    }
  }
  return new Date().toISOString();
}

async function main(): Promise<void> {
  const source = await createConformanceSource();
  let presets: CapabilityVersionPreset[];
  let apiProfilePresets: ApiProfilePreset[];
  let wireConformancePresets: WireConformancePreset[];

  try {
    presets = await collectVersionPresets(source);
    apiProfilePresets = await collectApiProfilePresets(source);
    wireConformancePresets = await collectWireConformancePresets(source);
  } catch (error) {
    if (
      configuredConformanceRoot ||
      source.description !== `${conformanceGithubRepo}@${conformanceGithubRef}`
    ) {
      throw error;
    }

    if ((await pathExists(outputFile)) && (await pathExists(jsonOutputFile))) {
      console.warn(
        `Failed to refresh capability presets from ${source.description}; using checked-in generated presets. ${error}`,
      );
      return;
    }

    throw error;
  }
  const output =
    `import type { ApiProfilePreset, CapabilityVersionPreset, WireConformancePreset } from "./capabilityManifestShared";\n\n// This file is auto-generated by scripts/generate-capability-manifest-presets.ts.\n// Do not edit it manually.\nexport const capabilityVersionPresets = ${
      JSON.stringify(presets, null, 2)
    } satisfies CapabilityVersionPreset[];\n\nexport const apiProfilePresets = ${
      JSON.stringify(apiProfilePresets, null, 2)
    } satisfies ApiProfilePreset[];\n\nexport const wireConformancePresets = ${
      JSON.stringify(wireConformancePresets, null, 2)
    } satisfies WireConformancePreset[];\n`;
  const generatedContent: GeneratedPresetContent = {
    presets,
    api_profiles: apiProfilePresets,
    wire_conformance: wireConformancePresets,
  };
  const jsonOutput = {
    generated_at: await generatedAtFor(generatedContent),
    source: source.description,
    ...generatedContent,
  };

  await Deno.mkdir(dirname(jsonOutputFile), { recursive: true });
  await Deno.writeTextFile(outputFile, output);
  await Deno.writeTextFile(jsonOutputFile, `${JSON.stringify(jsonOutput, null, 2)}\n`);
  console.log(
    `Generated ${presets.length} protocol capability preset versions, ${apiProfilePresets.length} API profile presets, and ${wireConformancePresets.length} wire conformance presets from ${source.description} into ${outputFile} and ${jsonOutputFile}`,
  );
}

await main();
