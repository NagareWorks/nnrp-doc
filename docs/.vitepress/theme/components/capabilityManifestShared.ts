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