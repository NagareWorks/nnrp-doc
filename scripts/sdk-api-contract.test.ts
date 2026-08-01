const contractPath = new URL(
  "../docs/public/contracts/nnrp-1-preview4-sdk-api.json",
  import.meta.url,
);

interface ContractField {
  name: string;
  type: string;
  required: boolean;
  wireType?: string;
  default?: unknown;
}

interface ContractMethod {
  name: string;
  parameters: ContractField[];
  returns: string;
  async?: boolean;
}

interface ContractType {
  fields: ContractField[];
  terminalMapping?: Record<string, string>;
  forbiddenDuplicates?: string[];
  variants?: string[];
  variantTypes?: Record<string, string | null>;
  builders?: Record<string, { input: string; output: string }>;
  methods?: ContractMethod[];
  failureType?: string;
}

interface ContractEnum {
  kind: "enum" | "flags";
  wireType: "u8" | "u16" | "u32" | "u64";
  values: Record<string, number>;
}

interface ContractMessageType {
  name: string;
  value: string;
  delivery: "role_method" | "connection_event" | "runtime_event";
}

interface RuntimeEventMessage {
  messageType: string;
  metadata: string;
  tail: string;
  client: boolean;
  server: boolean;
}

interface RoleMessage {
  messageType: string;
  metadataType: string | null;
  tail: "none" | "body" | "diagnostic";
  senders: ("client" | "server")[];
  receivers: ("client" | "server")[];
}

interface WireLayoutField {
  name: string;
  type: "u8" | "u16" | "u32" | "u64";
  offset: number;
  constant?: number;
}

interface WireLayout {
  size: number;
  fields: WireLayoutField[];
  canonicalHex?: string;
}

interface SdkApiContract {
  contract: string;
  contractVersion: number;
  rules: Record<string, boolean>;
  wireLayouts: Record<string, WireLayout>;
  enums: Record<string, ContractEnum>;
  semanticEnums: Record<string, string[]>;
  types: Record<string, ContractType>;
  messageTypes: ContractMessageType[];
  roleMethodMessages: RoleMessage[];
  connectionEventMessages: RoleMessage[];
  runtimeEventMessages: RuntimeEventMessage[];
  apiDomains: Record<string, string[]>;
  roleSurfaces: Record<string, unknown>;
  languageProjections: Record<string, Record<string, string | string[]>>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = "values differ"): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(
    actualJson === expectedJson,
    `${message}: expected ${expectedJson}, received ${actualJson}`,
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assert(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  assert(typeof value === "string", `${label} must be a string`);
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  assert(Array.isArray(value), `${label} must be an array`);
  for (const item of value) {
    assert(typeof item === "string", `${label} must contain only strings`);
  }
  return value as string[];
}

function requireVariants(contract: SdkApiContract, typeName: string): string[] {
  const type = requireContractType(contract, typeName);
  return requireStringArray(type.variants, `${typeName}.variants`);
}

function requireContractType(contract: SdkApiContract, typeName: string): ContractType {
  const type = contract.types[typeName];
  assert(type !== undefined, `${typeName} must be frozen`);
  return type;
}

function requireWireLayout(contract: SdkApiContract, layoutName: string): WireLayout {
  const layout = contract.wireLayouts[layoutName];
  assert(layout !== undefined, `${layoutName} wire layout must be frozen`);
  return layout;
}

async function loadContract(): Promise<SdkApiContract> {
  const contract = JSON.parse(await Deno.readTextFile(contractPath)) as Partial<SdkApiContract>;
  for (
    const key of [
      "rules",
      "wireLayouts",
      "enums",
      "semanticEnums",
      "types",
      "apiDomains",
      "roleSurfaces",
      "languageProjections",
    ] as const
  ) {
    requireRecord(contract[key], key);
  }
  for (
    const key of [
      "messageTypes",
      "roleMethodMessages",
      "connectionEventMessages",
      "runtimeEventMessages",
    ] as const
  ) {
    assert(Array.isArray(contract[key]), `${key} must be an array`);
  }
  assert(typeof contract.contract === "string", "contract must be a string");
  assert(typeof contract.contractVersion === "number", "contractVersion must be a number");
  return contract as SdkApiContract;
}

Deno.test("Preview4 SDK contract freezes the required semantic types", async () => {
  const contract = await loadContract();
  assertEquals(contract.contract, "nnrp-1-preview4-sdk-api");
  assertEquals(contract.contractVersion, 8);
  assertEquals(contract.rules.languageProjectionMustBeLossless, true);
  assertEquals(contract.rules.adapterNormalizationDoesNotProveApiParity, true);
  assertEquals(contract.rules.missingWireFieldsMayNotBeDefaulted, true);
  assertEquals(contract.rules.ffiCallsRemainCoarseGrained, true);
  assertEquals(contract.rules.profileBuildersOwnDerivedWireFields, true);
  assertEquals(contract.rules.publicRuntimeEventsRequireWireHeaders, true);
  assertEquals(contract.rules.localLifecycleEventsRemainSeparate, true);
  assertEquals(contract.rules.currentSuitesRejectLegacyPreviewWireLayouts, true);
  assertEquals(contract.rules.typedPayloadKindIsExplicitPerFrame, true);
  assertEquals(contract.rules.typedPayloadBitmapMatchesDescriptorUnion, true);
  assertEquals(contract.rules.roleMessageRegistriesMustBeExhaustive, true);
  assertEquals(contract.rules.crossSdkHostModelsRequireMachineProjection, true);
  assertEquals(contract.rules.languageProjectionTargetsMustExistBeforeRelease, true);
  assertEquals(contract.rules.allSdkApiDomainsRequireMachineProjection, true);
  assertEquals(contract.rules.ffiHandlesAreInternalImplementationDetails, true);
  assertEquals(contract.rules.sessionOptionsDeriveSessionOpenMetadata, true);
  assertEquals(contract.rules.applicationProfileOptionsRemainSeparate, true);
  assertEquals(contract.rules.legacyPreviewCompatibility, false);

  for (
    const typeName of [
      "RuntimeFrameHeader",
      "TypedPayloadDescriptor",
      "TypedPayloadFrame",
      "SubmitHeaderContext",
      "SubmitIdentity",
      "SubmitPolicy",
      "TensorSection",
      "SubmitObjectReferences",
      "TensorSubmitInput",
      "TokenChunk",
      "TokenSubmitInput",
      "TypedPayloadInputFrame",
      "TypedPayloadSubmitInput",
      "SubmitMetadata",
      "SubmitRequest",
      "RuntimeEventMetadata",
      "RuntimeEventTail",
      "RuntimeEvent",
      "CacheObjectId",
      "CacheLease",
      "CachePolicyOptions",
      "SchemaDescriptorHeader",
      "SchemaRegistry",
      "NnrpEndpoint",
      "ProviderEndpoint",
      "ClientTransportSecurity",
      "ServerTransportSecurity",
      "ClientProviderRoute",
      "ServerProviderRoute",
      "ClientProviderRouteEntry",
      "ServerProviderRouteEntry",
      "ClientSessionOptions",
      "ServerSessionOptions",
      "ClientBootstrapOptions",
      "ServerBootstrapOptions",
      "ServerAcceptOptions",
      "ServerSessionPolicy",
      "ServerSessionPolicyDecision",
      "ConnectionLifecycleSnapshot",
      "SessionLifecycleSnapshot",
      "TransportProviderMetadata",
      "TransportProviderDescriptor",
      "TransportSelectionOptions",
      "TransportSelection",
      "TransportSelectionFailure",
      "OperationLifecycleEvent",
      "TerminalEvent",
      "NnrpResult",
    ]
  ) {
    assert(contract.types[typeName] !== undefined, `${typeName} must be frozen`);
  }
});

Deno.test("terminal result and local lifecycle contracts are exact", async () => {
  const contract = await loadContract();
  const lifecycle = requireContractType(contract, "OperationLifecycleEvent");
  const terminalEvent = requireContractType(contract, "TerminalEvent");
  const result = requireContractType(contract, "NnrpResult");

  assertEquals(
    lifecycle.fields.map(({ name, type }) => ({ name, type })),
    [
      { name: "operation_id", type: "u64" },
      { name: "state", type: "OperationState" },
    ],
  );
  assertEquals(
    requireRecord(
      lifecycle.terminalMapping,
      "OperationLifecycleEvent.terminalMapping",
    ),
    {
      completed: "success",
      cancelled: "cancelled",
      superseded: "dropped",
      failed: "error",
    },
  );
  assertEquals(
    requireStringArray(terminalEvent.variants, "TerminalEvent.variants"),
    ["runtime", "lifecycle"],
  );
  assertEquals(
    requireRecord(terminalEvent.variantTypes, "TerminalEvent.variantTypes"),
    {
      runtime: "RuntimeEvent",
      lifecycle: "OperationLifecycleEvent",
    },
  );
  assertEquals(
    result.fields.map(({ name, type }) => ({ name, type })),
    [
      { name: "operation_id", type: "u64" },
      { name: "terminal_state", type: "ResultTerminalState" },
      { name: "event", type: "TerminalEvent" },
    ],
  );
});

Deno.test("canonical type and enum references form a closed graph", async () => {
  const contract = await loadContract();
  const primitiveTypes = new Set([
    "bool",
    "bytes",
    "i16",
    "string",
    "u8",
    "u16",
    "u32",
    "u64",
    "void",
  ]);
  const definedTypes = new Set([
    ...primitiveTypes,
    ...Object.keys(contract.types),
    ...Object.keys(contract.enums),
    ...Object.keys(contract.semanticEnums),
    ...Object.keys(contract.wireLayouts),
    "MessageType",
  ]);

  for (const [enumName, enumeration] of Object.entries(contract.enums)) {
    assert(
      enumeration.kind === "enum" || enumeration.kind === "flags",
      `${enumName} has an invalid kind`,
    );
    assert(primitiveTypes.has(enumeration.wireType), `${enumName} has an invalid wire type`);
    const values = Object.values(enumeration.values);
    assert(values.length > 0, `${enumName} has no frozen values`);
    assertEquals(new Set(values).size, values.length, `${enumName} contains duplicate values`);
  }

  for (const [typeName, type] of Object.entries(contract.types)) {
    for (const field of type.fields) {
      const reference = field.type.replace(/(?:\[\]|\?)+$/, "");
      assert(definedTypes.has(reference), `${typeName}.${field.name} references ${reference}`);
      if (field.wireType !== undefined) {
        assert(
          primitiveTypes.has(field.wireType),
          `${typeName}.${field.name} has invalid wireType`,
        );
      }
    }
    for (const method of type.methods ?? []) {
      for (const parameter of method.parameters) {
        const reference = parameter.type.replace(/(?:\[\]|\?)+$/, "");
        assert(definedTypes.has(reference), `${typeName}.${method.name} references ${reference}`);
      }
      const returnReference = method.returns.replace(/(?:\[\]|\?)+$/, "");
      assert(
        definedTypes.has(returnReference),
        `${typeName}.${method.name} returns ${returnReference}`,
      );
    }
    if (type.failureType !== undefined) {
      assert(definedTypes.has(type.failureType), `${typeName} failure type is not frozen`);
    }
  }

  for (const [enumName, values] of Object.entries(contract.semanticEnums)) {
    assert(values.length > 0, `${enumName} has no frozen semantic values`);
    assertEquals(new Set(values).size, values.length, `${enumName} contains duplicate values`);
  }
});

Deno.test("runtime metadata union maps every variant to one frozen type", async () => {
  const contract = await loadContract();
  const metadata = requireContractType(contract, "RuntimeEventMetadata");
  const variants = requireStringArray(metadata.variants, "RuntimeEventMetadata.variants");
  assert(metadata.variantTypes !== undefined, "RuntimeEventMetadata variant types are missing");
  assertEquals(
    Object.keys(metadata.variantTypes).sort(),
    variants.toSorted(),
    "runtime metadata variant map is incomplete",
  );
  assertEquals(metadata.variantTypes.none, null, "none metadata must have no payload type");
  for (const [variant, typeName] of Object.entries(metadata.variantTypes)) {
    if (variant === "none") continue;
    assert(typeName !== null, `${variant} metadata type is null`);
    assert(contract.types[typeName] !== undefined, `${variant} references missing ${typeName}`);
  }
});

Deno.test("current fixed wire layouts are closed, contiguous, and byte-sized", async () => {
  const contract = await loadContract();
  assertEquals(Object.keys(contract.wireLayouts).sort(), [
    "BodyRegionPrelude",
    "ExtensionFrameDescriptor",
    "InlineObjectBlockHeader",
    "ObjectReferenceBlock",
    "SchemaDescriptorHeader",
    "TensorSectionDescriptor",
    "TypedPayloadDescriptor",
  ]);

  const widths: Record<WireLayoutField["type"], number> = {
    u8: 1,
    u16: 2,
    u32: 4,
    u64: 8,
  };
  for (const [layoutName, layout] of Object.entries(contract.wireLayouts)) {
    const names = layout.fields.map((field) => field.name);
    assertEquals(new Set(names).size, names.length, `${layoutName} contains duplicate fields`);

    let cursor = 0;
    for (const field of layout.fields) {
      assertEquals(field.offset, cursor, `${layoutName}.${field.name} has a gap or overlap`);
      cursor += widths[field.type];
    }
    assertEquals(cursor, layout.size, `${layoutName} field widths do not fill the record`);
    if (layout.canonicalHex !== undefined) {
      assert(/^[0-9a-f]+$/.test(layout.canonicalHex), `${layoutName} canonical hex is invalid`);
      assertEquals(
        layout.canonicalHex.length,
        layout.size * 2,
        `${layoutName} canonical hex has the wrong length`,
      );
    }
  }
});

Deno.test("current data-plane layouts reject the superseded Preview2 widths", async () => {
  const contract = await loadContract();
  const typedPayload = requireWireLayout(contract, "TypedPayloadDescriptor");
  const objectReference = requireWireLayout(contract, "ObjectReferenceBlock");
  assertEquals(typedPayload.size, 24);
  assertEquals(objectReference.size, 24);
  assertEquals(
    typedPayload.fields.map((field) => field.name),
    [
      "profile_id",
      "payload_kind",
      "descriptor_flags",
      "schema_id",
      "schema_version",
      "stream_semantics",
      "reserved0",
      "offset",
      "length",
    ],
  );
});

Deno.test("tensor section layout preserves the inherited NNRP/1 semantic descriptor", async () => {
  const contract = await loadContract();
  const tensorSection = requireWireLayout(contract, "TensorSectionDescriptor");
  assertEquals(tensorSection.size, 32);
  assertEquals(
    tensorSection.fields.map((field) => field.name),
    [
      "role_id",
      "codec_id",
      "dtype_id",
      "layout_id",
      "scale_policy",
      "section_flags",
      "element_count_per_tile",
      "codec_table_bytes",
      "length_table_bytes",
      "payload_bytes",
      "payload_stride_bytes",
      "reserved",
    ],
  );
});

Deno.test("submit builders have closed input and output contracts", async () => {
  const contract = await loadContract();
  const submitRequest = requireContractType(contract, "SubmitRequest");
  assertEquals(submitRequest.builders, {
    tensor: { input: "TensorSubmitInput", output: "SubmitRequest" },
    token: { input: "TokenSubmitInput", output: "SubmitRequest" },
    typed_payload: { input: "TypedPayloadSubmitInput", output: "SubmitRequest" },
  });
  for (const builder of Object.values(submitRequest.builders ?? {})) {
    assert(contract.types[builder.input] !== undefined, `${builder.input} must be frozen`);
    assert(contract.types[builder.output] !== undefined, `${builder.output} must be frozen`);
  }
});

Deno.test("contract types have unique fields and explicit requiredness", async () => {
  const contract = await loadContract();
  for (const [typeName, type] of Object.entries(contract.types)) {
    const names = type.fields.map((field) => field.name);
    assertEquals(new Set(names).size, names.length, `${typeName} contains duplicate fields`);
    for (const field of type.fields) {
      assertEquals(
        typeof field.required,
        "boolean",
        `${typeName}.${field.name} lacks requiredness`,
      );
    }
  }
});

Deno.test("public role options freeze protocol intent and exclude FFI handles", async () => {
  const contract = await loadContract();
  const expectedFields: Record<string, string[]> = {
    ClientSessionOptions: [
      "requested_session_id",
      "profile_id",
      "schema_id",
      "schema_version",
      "priority_class",
      "default_deadline_ms",
      "max_in_flight_operations",
      "lease_ttl_hint_ms",
      "allow_resume",
      "resume_token_bytes",
      "cache_hints",
    ],
    ServerSessionOptions: [
      "supported_profiles",
      "supported_cache_objects",
      "max_cache_objects",
      "max_cache_object_bytes",
      "schema_registry",
      "resume_token_bytes",
      "max_in_flight_operations",
      "granted_operation_credit",
      "lease_ttl_ms",
      "resume_window_ms",
      "application_policy",
    ],
    ClientBootstrapOptions: [
      "endpoint",
      "provider_routes",
      "transport_policy",
      "session_defaults",
    ],
    ServerBootstrapOptions: [
      "endpoint",
      "provider_routes",
      "transport_policy",
      "session_defaults",
    ],
    ServerAcceptOptions: ["timeout_ms"],
  };

  for (const [typeName, fieldNames] of Object.entries(expectedFields)) {
    const fields = requireContractType(contract, typeName).fields;
    assertEquals(fields.map((field) => field.name), fieldNames, `${typeName} fields drifted`);
    for (const field of fields) {
      if (field.required) continue;
      assert("default" in field, `${typeName}.${field.name} has no frozen default`);
    }
  }

  const boundary = requireRecord(
    contract.roleSurfaces.publicOptionBoundary,
    "roleSurfaces.publicOptionBoundary",
  );
  const internalOnlyFields = requireStringArray(
    boundary.internalOnlyFields,
    "roleSurfaces.publicOptionBoundary.internalOnlyFields",
  );
  const profilePatchOnlyFields = requireStringArray(
    boundary.profilePatchOnlyFields,
    "roleSurfaces.publicOptionBoundary.profilePatchOnlyFields",
  );
  const publicFields = new Set(
    Object.keys(expectedFields).flatMap((typeName) =>
      requireContractType(contract, typeName).fields.map((field) => field.name)
    ),
  );
  for (const internalField of internalOnlyFields) {
    assert(!publicFields.has(internalField), `${internalField} leaked into public options`);
  }
  for (const patchField of profilePatchOnlyFields) {
    assert(!publicFields.has(patchField), `${patchField} leaked into SESSION_OPEN options`);
  }
});

Deno.test("schema registry contract freezes inherited NNRP/1 host semantics", async () => {
  const contract = await loadContract();
  const header = requireWireLayout(contract, "SchemaDescriptorHeader");
  const registry = requireContractType(contract, "SchemaRegistry");
  assertEquals(header.size, 32);
  assertEquals(
    registry.methods?.map((method) => method.name),
    ["install", "lookup", "invalidate", "validate_binding", "snapshot"],
  );
  assertEquals(registry.failureType, "SchemaRegistryFailure");
});

Deno.test("every maintained SDK projects every canonical role type", async () => {
  const contract = await loadContract();
  const requiredProjections = [
    "applicationEndpoint",
    "cacheLease",
    "cacheLeaseResult",
    "cacheObjectId",
    "cachePolicyOptions",
    "capabilityMetadata",
    "clientBootstrapOptions",
    "connectionLifecycle",
    "clientProviderRoute",
    "clientRoles",
    "clientSessionOptions",
    "clientTransportSecurity",
    "operationLifecycleEvent",
    "providerEndpoint",
    "result",
    "runtimeMetadataNamespace",
    "schemaDescriptor",
    "schemaRegistry",
    "serverAcceptOptions",
    "serverBootstrapOptions",
    "serverProviderRoute",
    "serverRoles",
    "serverSessionOptions",
    "serverSessionPolicy",
    "sessionLifecycle",
    "serverTransportSecurity",
    "submitRequest",
    "submitHeaderContext",
    "submitBuilders",
    "terminalEvent",
    "runtimeFrameHeader",
    "runtimeEvent",
    "typedPayloadDescriptor",
    "typedPayloadFrame",
    "transportProviderDescriptor",
    "transportProviderMetadata",
    "transportSelection",
    "transportSelectionFailure",
    "transportSelectionOptions",
  ];
  assertEquals(Object.keys(contract.languageProjections).sort(), [
    "csharp",
    "javascript",
    "python",
    "rust",
  ]);

  for (const [language, projection] of Object.entries(contract.languageProjections)) {
    assertEquals(
      Object.keys(projection).sort(),
      requiredProjections.toSorted(),
      `${language} projection is incomplete`,
    );
    for (const [projectionName, target] of Object.entries(projection)) {
      if (Array.isArray(target)) {
        assert(target.length > 0, `${language}.${projectionName} has no targets`);
        for (const item of target) {
          assert(item.length > 0, `${language}.${projectionName} has an empty target`);
        }
      } else {
        assert(target.length > 0, `${language}.${projectionName} has an empty target`);
      }
    }
  }
});

Deno.test("API domains cover every language projection without an unowned surface", async () => {
  const contract = await loadContract();
  assertEquals(Object.keys(contract.apiDomains).sort(), [
    "cache",
    "capability",
    "lifecycle",
    "roles",
    "runtimeEvents",
    "schema",
    "submission",
    "transport",
  ]);

  const rustProjection = contract.languageProjections.rust;
  assert(rustProjection !== undefined, "rust language projection must be frozen");
  const projected = Object.keys(rustProjection).sort();
  const owned = Object.values(contract.apiDomains).flat().sort();
  assertEquals(new Set(owned).size, owned.length, "an API projection belongs to multiple domains");
  assertEquals(owned, projected, "API domains do not cover the complete language projection");

  for (const [domain, projectionNames] of Object.entries(contract.apiDomains)) {
    assert(projectionNames.length > 0, `${domain} has no projected API`);
    for (const language of Object.keys(contract.languageProjections)) {
      for (const projectionName of projectionNames) {
        assert(
          contract.languageProjections[language][projectionName] !== undefined,
          `${language}.${projectionName} is missing from ${domain}`,
        );
      }
    }
  }
});

Deno.test("client and server role surfaces close every runtime message direction", async () => {
  const contract = await loadContract();
  const client = requireRecord(contract.roleSurfaces.client, "roleSurfaces.client");
  const server = requireRecord(contract.roleSurfaces.server, "roleSurfaces.server");
  const boundary = requireRecord(
    contract.roleSurfaces.transportBoundary,
    "roleSurfaces.transportBoundary",
  );

  assertEquals(client.sendMessages, "all runtimeEventMessages where server is true");
  assertEquals(client.receiveMessages, "all runtimeEventMessages where client is true");
  assertEquals(server.sendMessages, "all runtimeEventMessages where client is true");
  assertEquals(server.receiveMessages, "all runtimeEventMessages where server is true");
  assertEquals(client.resultType, "NnrpResult");
  assertEquals(server.resultType, "NnrpResult");
  assertEquals(client.lifecycleEventType, "OperationLifecycleEvent");
  assertEquals(server.lifecycleEventType, "OperationLifecycleEvent");
  assertEquals(boundary.applicationEndpointSchemes, ["nnrp", "nnrps"]);
  assertEquals(boundary.providerLocatorSchemes, ["tcp", "quic", "unix", "npipe", "ws", "wss"]);

  for (const mapping of contract.runtimeEventMessages) {
    assert(
      mapping.client || mapping.server,
      `${mapping.messageType} must have at least one receiving role`,
    );
  }
});

Deno.test("application endpoints and provider packages keep their ownership boundaries", async () => {
  const contract = await loadContract();
  const transportBoundary = requireRecord(
    contract.roleSurfaces.transportBoundary,
    "roleSurfaces.transportBoundary",
  );
  const providerBoundary = requireRecord(
    contract.roleSurfaces.providerBoundary,
    "roleSurfaces.providerBoundary",
  );

  assertEquals(
    requireStringArray(
      transportBoundary.applicationEndpointSchemes,
      "roleSurfaces.transportBoundary.applicationEndpointSchemes",
    ),
    ["nnrp", "nnrps"],
  );
  assertEquals(
    requireStringArray(
      transportBoundary.providerLocatorSchemes,
      "roleSurfaces.transportBoundary.providerLocatorSchemes",
    ),
    [
      "tcp",
      "quic",
      "unix",
      "npipe",
      "ws",
      "wss",
    ],
  );
  assert(
    requireString(transportBoundary.rule, "roleSurfaces.transportBoundary.rule").includes(
      "never replace the application endpoint",
    ),
    "provider locators must remain below the application endpoint",
  );

  assertEquals(
    requireStringArray(
      providerBoundary.packageOwns,
      "roleSurfaces.providerBoundary.packageOwns",
    ),
    [
      "connect",
      "listen",
      "probe",
      "transport-scoped-native-or-wasm-artifact",
    ],
  );
  assertEquals(
    requireStringArray(
      providerBoundary.sharedRuntimeOwns,
      "roleSurfaces.providerBoundary.sharedRuntimeOwns",
    ),
    [
      "provider-selection",
      "coarse-ffi-lifecycle",
      "session-runtime",
    ],
  );
  assert(
    requireString(providerBoundary.rule, "roleSurfaces.providerBoundary.rule").includes(
      "not a configuration flag",
    ),
    "provider packages must own real carrier behavior",
  );
});

Deno.test("message registry mappings are closed and exhaustive", async () => {
  const contract = await loadContract();
  const messageNames = contract.messageTypes.map((message) => message.name);
  const messageValues = contract.messageTypes.map((message) => message.value);
  assertEquals(new Set(messageNames).size, messageNames.length, "duplicate message name");
  assertEquals(new Set(messageValues).size, messageValues.length, "duplicate message value");

  const runtimeMessages = contract.messageTypes
    .filter((message) => message.delivery === "runtime_event")
    .map((message) => message.name)
    .sort();
  const mappedMessages = contract.runtimeEventMessages
    .map((message) => message.messageType)
    .sort();
  assertEquals(mappedMessages, runtimeMessages, "runtime event mapping is not exhaustive");

  const assertRoleMessageMap = (
    delivery: ContractMessageType["delivery"],
    mappings: RoleMessage[],
  ): void => {
    const expected = contract.messageTypes
      .filter((message) => message.delivery === delivery)
      .map((message) => message.name)
      .sort();
    assertEquals(
      mappings.map((message) => message.messageType).sort(),
      expected,
      `${delivery} mapping is not exhaustive`,
    );

    const tailVariants = new Set(requireVariants(contract, "RuntimeEventTail"));
    for (const mapping of mappings) {
      assert(
        mapping.metadataType === null || contract.types[mapping.metadataType] !== undefined,
        `${mapping.messageType} references missing metadata ${mapping.metadataType}`,
      );
      assert(tailVariants.has(mapping.tail), `${mapping.messageType} tail is not frozen`);
      assert(mapping.senders.length > 0, `${mapping.messageType} has no sending role`);
      assert(mapping.receivers.length > 0, `${mapping.messageType} has no receiving role`);
      for (const role of [...mapping.senders, ...mapping.receivers]) {
        assert(role === "client" || role === "server", `${mapping.messageType} has invalid role`);
      }
    }
  };

  assertRoleMessageMap("role_method", contract.roleMethodMessages);
  assertRoleMessageMap("connection_event", contract.connectionEventMessages);

  const metadataVariants = new Set(requireVariants(contract, "RuntimeEventMetadata"));
  const tailVariants = new Set(requireVariants(contract, "RuntimeEventTail"));
  for (const message of contract.runtimeEventMessages) {
    assert(metadataVariants.has(message.metadata), `${message.messageType} metadata is not frozen`);
    assert(tailVariants.has(message.tail), `${message.messageType} tail is not frozen`);
    assert(message.client || message.server, `${message.messageType} has no receiving role`);
  }
});

Deno.test("runtime events do not duplicate common-header fields", async () => {
  const contract = await loadContract();
  const event = requireContractType(contract, "RuntimeEvent");
  assert(
    event.forbiddenDuplicates !== undefined,
    "RuntimeEvent.forbiddenDuplicates must be frozen",
  );
  const eventFields = new Set(event.fields.map((field) => field.name));
  for (const duplicate of event.forbiddenDuplicates) {
    assertEquals(eventFields.has(duplicate), false, `RuntimeEvent duplicates ${duplicate}`);
  }
});
