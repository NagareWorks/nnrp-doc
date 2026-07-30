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
}

interface SdkApiContract {
  contract: string;
  contractVersion: number;
  rules: Record<string, boolean>;
  types: Record<string, ContractType>;
  languageProjections: Record<string, Record<string, string>>;
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
  assertEquals(contract.contractVersion, 1);
  assertEquals(contract.rules.languageProjectionMustBeLossless, true);
  assertEquals(contract.rules.adapterNormalizationDoesNotProveApiParity, true);
  assertEquals(contract.rules.missingWireFieldsMayNotBeDefaulted, true);
  assertEquals(contract.rules.ffiCallsRemainCoarseGrained, true);
  assertEquals(contract.rules.legacyPreviewCompatibility, false);

  for (
    const typeName of ["RuntimeFrameHeader", "SubmitMetadata", "SubmitRequest", "RuntimeEvent"]
  ) {
    assert(contract.types[typeName] !== undefined, `${typeName} must be frozen`);
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
  const requiredProjections = ["submitRequest", "runtimeFrameHeader", "runtimeEvent"];
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
