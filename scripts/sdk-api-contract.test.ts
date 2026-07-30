const contractPath = new URL(
  "../docs/public/contracts/nnrp-1-preview4-sdk-api.json",
  import.meta.url,
);

interface ContractField {
  name: string;
  type: string;
  required: boolean;
}

interface ContractType {
  fields: ContractField[];
  forbiddenDuplicates?: string[];
  variants?: string[];
  builders?: Record<string, { input: string; output: string }>;
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
  types: Record<string, ContractType>;
  messageTypes: ContractMessageType[];
  runtimeEventMessages: RuntimeEventMessage[];
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

async function loadContract(): Promise<SdkApiContract> {
  return JSON.parse(await Deno.readTextFile(contractPath)) as SdkApiContract;
}

Deno.test("Preview4 SDK contract freezes the required semantic types", async () => {
  const contract = await loadContract();
  assertEquals(contract.contract, "nnrp-1-preview4-sdk-api");
  assertEquals(contract.contractVersion, 4);
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
    ]
  ) {
    assert(contract.types[typeName] !== undefined, `${typeName} must be frozen`);
  }
});

Deno.test("current fixed wire layouts are closed, contiguous, and byte-sized", async () => {
  const contract = await loadContract();
  assertEquals(Object.keys(contract.wireLayouts).sort(), [
    "BodyRegionPrelude",
    "ExtensionFrameDescriptor",
    "InlineObjectBlockHeader",
    "ObjectReferenceBlock",
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
  assertEquals(contract.wireLayouts.TypedPayloadDescriptor.size, 24);
  assertEquals(contract.wireLayouts.ObjectReferenceBlock.size, 24);
  assertEquals(
    contract.wireLayouts.TypedPayloadDescriptor.fields.map((field) => field.name),
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
  assertEquals(contract.wireLayouts.TensorSectionDescriptor.size, 32);
  assertEquals(
    contract.wireLayouts.TensorSectionDescriptor.fields.map((field) => field.name),
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
  assertEquals(contract.types.SubmitRequest.builders, {
    tensor: { input: "TensorSubmitInput", output: "SubmitRequest" },
    token: { input: "TokenSubmitInput", output: "SubmitRequest" },
    typed_payload: { input: "TypedPayloadSubmitInput", output: "SubmitRequest" },
  });
  for (const builder of Object.values(contract.types.SubmitRequest.builders ?? {})) {
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

Deno.test("every maintained SDK projects every canonical role type", async () => {
  const contract = await loadContract();
  const requiredProjections = [
    "submitRequest",
    "submitHeaderContext",
    "submitBuilders",
    "runtimeFrameHeader",
    "runtimeEvent",
    "typedPayloadDescriptor",
    "typedPayloadFrame",
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
  }
});

Deno.test("message registry and runtime event map are closed and exhaustive", async () => {
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

  const metadataVariants = new Set(contract.types.RuntimeEventMetadata.variants);
  const tailVariants = new Set(contract.types.RuntimeEventTail.variants);
  for (const message of contract.runtimeEventMessages) {
    assert(metadataVariants.has(message.metadata), `${message.messageType} metadata is not frozen`);
    assert(tailVariants.has(message.tail), `${message.messageType} tail is not frozen`);
    assert(message.client || message.server, `${message.messageType} has no receiving role`);
  }
});

Deno.test("runtime events do not duplicate common-header fields", async () => {
  const contract = await loadContract();
  const event = contract.types.RuntimeEvent;
  assert(event !== undefined, "RuntimeEvent must be frozen");
  assert(
    event.forbiddenDuplicates !== undefined,
    "RuntimeEvent.forbiddenDuplicates must be frozen",
  );
  const eventFields = new Set(event.fields.map((field) => field.name));
  for (const duplicate of event.forbiddenDuplicates) {
    assertEquals(eventFields.has(duplicate), false, `RuntimeEvent duplicates ${duplicate}`);
  }
});
