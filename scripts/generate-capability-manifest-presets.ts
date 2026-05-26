import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  capabilityManifestPresetOverrides
} from "../docs/.vitepress/theme/components/capabilityManifestPresetOverrides.ts";
import type {
  CapabilityCategory,
  CapabilityVersionPreset,
  LocalizedText
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
  "capabilityManifestPresets.generated.ts"
);
const jsonOutputFile = join(
  repoRoot,
  "docs",
  "public",
  "conformance",
  "capability-manifest-presets.json"
);
const siblingConformanceRoot = normalize(join(repoRoot, "..", "nnrp-conformance"));
const configuredConformanceRoot = Deno.env.get("NNRP_CONFORMANCE_REPO")?.trim();
const conformanceGithubRepo = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REPO")?.trim() || "NagareWorks/nnrp-conformance";
const conformanceGithubRef = Deno.env.get("NNRP_CONFORMANCE_GITHUB_REF")?.trim() || "main";
const conformanceGithubToken = Deno.env.get("NNRP_CONFORMANCE_GITHUB_TOKEN")?.trim() || Deno.env.get("GITHUB_TOKEN")?.trim();

const layerOrder = new Map([
  ["L0", 0],
  ["L1", 1],
  ["L2", 2],
  ["L3", 3],
  ["L4", 4]
]);
const categoryOrder = new Map<CapabilityCategory, number>([
  ["mandatory", 0],
  ["optional", 1],
  ["experimental", 2],
  ["deprecated", 3]
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

function dedupe(items: string[]): string[] {
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
    "User-Agent": "nnrp-doc capability preset generator"
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
    headers: buildGitHubHeaders("application/vnd.github+json")
  });

  if (!response.ok) {
    throw new Error(`Failed to list ${path} from ${conformanceGithubRepo}@${conformanceGithubRef}: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GitHubDirectoryEntry[];
}

async function fetchGitHubJsonFile<T>(path: string): Promise<T> {
  const response = await fetch(buildGitHubContentsUrl(path), {
    headers: buildGitHubHeaders("application/vnd.github.raw+json")
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path} from ${conformanceGithubRepo}@${conformanceGithubRef}: ${response.status} ${response.statusText}`);
  }

  return JSON.parse(await response.text()) as T;
}

async function createConformanceSource(): Promise<ConformanceSource> {
  const localConformanceRoot = configuredConformanceRoot ||
    ((await pathExists(join(siblingConformanceRoot, "protocol"))) ? siblingConformanceRoot : undefined);

  if (localConformanceRoot) {
    const localProtocolRoot = join(localConformanceRoot, "protocol");
    if (!(await pathExists(localProtocolRoot))) {
      throw new Error(`NNRP_CONFORMANCE_REPO is set to ${localConformanceRoot}, but ${localProtocolRoot} does not exist.`);
    }

    return {
      description: localConformanceRoot,
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
      }
    };
  }

  return {
    description: `${conformanceGithubRepo}@${conformanceGithubRef}`,
    listVersionNames: async () => {
      const entries = await fetchGitHubDirectory("protocol");
      return entries.filter((entry) => entry.type === "dir").map((entry) => entry.name).sort();
    },
    readJson: async <T>(path: string) => await fetchGitHubJsonFile<T>(path)
  };
}

function fallbackText(text: string): LocalizedText {
  return { zh: text, en: text };
}

function buildFallbackNote(version: string, status: string, capabilityCount: number): LocalizedText {
  return {
    zh: `自动从 nnrp-conformance 的 ${status} baseline 派生，当前共有 ${capabilityCount} 个 capability token。`,
    en: `Derived automatically from the ${status} nnrp-conformance baseline. ${capabilityCount} capability tokens are currently exposed.`
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

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(path)) as T;
}

async function collectVersionPresets(source: ConformanceSource): Promise<CapabilityVersionPreset[]> {
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
              combinations: []
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
          (left, right) => (categoryOrder.get(left) ?? 99) - (categoryOrder.get(right) ?? 99)
        );
        const layers = Array.from(aggregate.layers).sort(
          (left, right) => (layerOrder.get(left) ?? 99) - (layerOrder.get(right) ?? 99)
        );

        return {
          token,
          layers: layers.join(" / "),
          categories,
          description: tokenOverride?.description ?? buildFallbackDescription(aggregate.descriptions),
          combination: tokenOverride?.combination ?? buildFallbackCombination(aggregate.combinations)
        };
      });

    presets.push({
      version: manifest.protocol_version,
      title: overrides?.title ?? fallbackText(manifest.protocol_version),
      note: overrides?.note ?? buildFallbackNote(manifest.protocol_version, manifest.status, capabilities.length),
      recommendedPath: `conformance/${manifest.protocol_version}.capabilities.json`,
      capabilities
    });
  }

  return presets.sort((left, right) => left.version.localeCompare(right.version));
}

async function main(): Promise<void> {
  const source = await createConformanceSource();
  let presets: CapabilityVersionPreset[];

  try {
    presets = await collectVersionPresets(source);
  } catch (error) {
    if (configuredConformanceRoot || source.description !== `${conformanceGithubRepo}@${conformanceGithubRef}`) {
      throw error;
    }

    if ((await pathExists(outputFile)) && (await pathExists(jsonOutputFile))) {
      console.warn(
        `Failed to refresh capability presets from ${source.description}; using checked-in generated presets. ${error}`
      );
      return;
    }

    throw error;
  }
  const output = `import type { CapabilityVersionPreset } from "./capabilityManifestShared";\n\n// This file is auto-generated by scripts/generate-capability-manifest-presets.ts.\n// Do not edit it manually.\nexport const capabilityVersionPresets = ${JSON.stringify(presets, null, 2)} satisfies CapabilityVersionPreset[];\n`;
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    source: source.description,
    presets
  };

  await Deno.mkdir(dirname(jsonOutputFile), { recursive: true });
  await Deno.writeTextFile(outputFile, output);
  await Deno.writeTextFile(jsonOutputFile, `${JSON.stringify(jsonOutput, null, 2)}\n`);
  console.log(`Generated ${presets.length} capability preset versions from ${source.description} into ${outputFile} and ${jsonOutputFile}`);
}

await main();
