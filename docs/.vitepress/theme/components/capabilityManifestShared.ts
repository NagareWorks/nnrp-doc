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

export type WireHostPlatform = "native" | "browser";

export type WireHostRouteSecurityMode =
  | "plain"
  | "tls_server_auth"
  | "mutual_tls"
  | "wss"
  | "browser_host";

export type WireHostCredentialOwner = "none" | "suite" | "target" | "host";

export type WireHostRouteInjectedFailure =
  | "route_unresolved"
  | "security_incompatible"
  | "bind_failure"
  | "terminal_listener_failure";

export type WireHostRouteRejectionReason =
  | "policy-disallowed"
  | "local-unavailable"
  | "peer-unsupported"
  | "limit-exceeded"
  | "route-unresolved"
  | "security-unsatisfied"
  | "probe-missing"
  | "probe-failed";

export type WireHostRouteProviderPreset = {
  transport: WireConformanceTransport;
  providerId: string;
  installed: boolean;
  platforms: WireHostPlatform[];
  securityModes: WireHostRouteSecurityMode[];
};

export type WireHostRoute = {
  transport: WireConformanceTransport;
  provider_id: string;
  locator: string;
  security: {
    mode: WireHostRouteSecurityMode;
    credential_owner: WireHostCredentialOwner;
  };
  injected_failures?: WireHostRouteInjectedFailure[];
};

export type WireHostRouteFixture = {
  role: "client" | "server";
  platform: WireHostPlatform;
  application_endpoint: string;
  routes: WireHostRoute[];
};

export type WireHostRouteExpectation = {
  selected_count?: number;
  selected_transport?: WireConformanceTransport;
  rejection_reasons?: WireHostRouteRejectionReason[];
  bound_transports?: WireConformanceTransport[];
  accepted_transports?: WireConformanceTransport[];
  atomic_rollback?: boolean;
  logical_set_closed?: boolean;
  terminal_failure?: string;
};

export type WireConformanceStep = {
  action: string;
  frame?: string;
  payload?: Record<string, unknown>;
  timeout_ms?: number;
};

export type WireConformanceExpectation = {
  terminal: "success" | "cancelled" | "dropped" | "error";
  frames?: string[];
  allowed_frames?: string[];
  route?: WireHostRouteExpectation;
};

export type WireConformanceScenarioPreset = {
  id: string;
  mode: WireConformanceMode;
  status: CapabilityCategory;
  feature: string;
  requiredCapabilities: string[];
  description: string;
  summary: LocalizedText;
  steps: WireConformanceStep[];
  expect: WireConformanceExpectation;
  hostRoute?: WireHostRouteFixture;
};

export type WireConformancePreset = {
  protocolVersion: string;
  suiteVersion: string;
  title: LocalizedText;
  note: LocalizedText;
  recommendedPath: string;
  modes: WireConformanceMode[];
  transports: WireConformanceTransport[];
  hostRouteProviders: WireHostRouteProviderPreset[];
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
export const wireConformanceTargetSchemaPath = "../../schemas/wire-conformance-target.schema.json";
export const wireConformanceScenarioSchemaPath =
  "../../schemas/wire-conformance-scenario.schema.json";
