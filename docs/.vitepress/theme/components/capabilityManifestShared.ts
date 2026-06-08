export type SupportedLocale = "zh" | "en";

export type CapabilityCategory = "mandatory" | "optional" | "experimental" | "deprecated";

export type LocalizedText = Record<SupportedLocale, string>;

export type CapabilityOption = {
  token: string;
  layers: string;
  categories: CapabilityCategory[];
  description: LocalizedText;
  combination?: LocalizedText;
};

export type CapabilityVersionPreset = {
  version: string;
  title: LocalizedText;
  note: LocalizedText;
  recommendedPath: string;
  capabilities: CapabilityOption[];
};

export type ApiProfileRecipePreset = {
  id: string;
  operation: string;
  status: CapabilityCategory;
  requiredCapabilities: string[];
  summary: LocalizedText;
};

export type ApiProfileOperationPreset = {
  name: string;
  streaming: boolean;
  nonStreaming: boolean;
  toolCalls: boolean;
  cancellation: boolean;
};

export type ApiProfilePreset = {
  profile: string;
  schemaVersion: string;
  level: number;
  title: LocalizedText;
  note: LocalizedText;
  recommendedPath: string;
  protocolBaselines: string[];
  operations: ApiProfileOperationPreset[];
  recipes: ApiProfileRecipePreset[];
};

export type WireConformanceMode = "suite_as_client" | "suite_as_server" | "suite_as_proxy";

export type WireConformanceTransport = "tcp" | "quic" | "websocket" | "ipc";

export type WireConformanceScenarioPreset = {
  id: string;
  status: CapabilityCategory;
  requiredCapabilities: string[];
  summary: LocalizedText;
};

export type WireConformancePreset = {
  protocolVersion: string;
  suiteVersion: string;
  title: LocalizedText;
  note: LocalizedText;
  recommendedPath: string;
  modes: WireConformanceMode[];
  transports: WireConformanceTransport[];
  scenarios: WireConformanceScenarioPreset[];
};

export type CapabilityOptionOverride = {
  description?: LocalizedText;
  combination?: LocalizedText;
};

export type CapabilityVersionPresetOverride = {
  title?: LocalizedText;
  note?: LocalizedText;
  capabilityOverrides?: Record<string, CapabilityOptionOverride>;
};

export const capabilityManifestSchemaPath = "../../schemas/capability-manifest.schema.json";
export const apiProfileCapabilityManifestSchemaPath =
  "../../schemas/api-profile-capabilities.schema.json";
export const wireConformanceTargetSchemaPath =
  "../../schemas/wire-conformance-target.schema.json";
