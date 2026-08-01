const root = new URL("../", import.meta.url);

interface ReferenceExpectation {
  path: string;
  required: string[];
}

const references: ReferenceExpectation[] = [
  {
    path: "docs/en/sdk/rust/api/client.md",
    required: [
      "## `NnrpResult`",
      "`operation_id`",
      "`terminal_state`",
      "`event`",
      "## `OperationLifecycleEvent`",
      "`state`",
    ],
  },
  {
    path: "docs/zh/sdk/rust/api/client.md",
    required: [
      "## `NnrpResult`",
      "`operation_id`",
      "`terminal_state`",
      "`event`",
      "## `OperationLifecycleEvent`",
      "`state`",
    ],
  },
  {
    path: "docs/en/sdk/python/api/client.md",
    required: [
      "`NativeRuntimeResult`",
      "`operation_id`",
      "`terminal_state`",
      "`event`",
      "### `OperationLifecycleEvent`",
      "`state`",
    ],
  },
  {
    path: "docs/zh/sdk/python/api/client.md",
    required: [
      "`NativeRuntimeResult`",
      "`operation_id`",
      "`terminal_state`",
      "`event`",
      "### `OperationLifecycleEvent`",
      "`state`",
    ],
  },
  {
    path: "docs/en/sdk/javascript/api/core.md",
    required: [
      "interface NnrpResult",
      "operationId: bigint",
      "terminalState: NnrpResultTerminalState",
      "event: NnrpRuntimeEvent",
      "interface NnrpOperationLifecycleEvent",
      "state: NnrpOperationState",
    ],
  },
  {
    path: "docs/zh/sdk/javascript/api/core.md",
    required: [
      "interface NnrpResult",
      "operationId: bigint",
      "terminalState: NnrpResultTerminalState",
      "event: NnrpRuntimeEvent",
      "interface NnrpOperationLifecycleEvent",
      "state: NnrpOperationState",
    ],
  },
  {
    path: "docs/en/sdk/csharp/api/client.md",
    required: [
      "### `NnrpResult`",
      "`OperationId`",
      "`TerminalState`",
      "`Event`",
      "### `NnrpOperationLifecycleEvent`",
      "`State`",
    ],
  },
  {
    path: "docs/zh/sdk/csharp/api/client.md",
    required: [
      "### `NnrpResult`",
      "`OperationId`",
      "`TerminalState`",
      "`Event`",
      "### `NnrpOperationLifecycleEvent`",
      "`State`",
    ],
  },
  {
    path: "docs/en/sdk/rust/quick-start.md",
    required: ["result.operation_id", "result.event.header.frame_id"],
  },
  {
    path: "docs/zh/sdk/rust/quick-start.md",
    required: ["result.operation_id", "result.event.header.frame_id"],
  },
  {
    path: "docs/en/sdk/python/quick-start.md",
    required: ["result.event.tail.body"],
  },
  {
    path: "docs/zh/sdk/python/quick-start.md",
    required: ["result.event.tail.body"],
  },
];

function assertIncludes(source: string, fragment: string, path: string): void {
  if (!source.includes(fragment)) {
    throw new Error(`${path} is missing frozen SDK API fragment: ${fragment}`);
  }
}

Deno.test("language SDK references publish the frozen result and lifecycle projections", async () => {
  for (const reference of references) {
    const source = await Deno.readTextFile(new URL(reference.path, root));
    for (const fragment of reference.required) {
      assertIncludes(source, fragment, reference.path);
    }
  }
});

Deno.test("language SDK references reject superseded result and lifecycle narratives", async () => {
  const sources = await Promise.all(
    references.map(async (reference) => ({
      path: reference.path,
      source: await Deno.readTextFile(new URL(reference.path, root)),
    })),
  );
  const forbidden = [
    "NnrpClientEvent::ResultDropReason",
    "| `frame_id` | `u32` | Result frame id.",
    "| `frame_id` | `u32` | Result frame id。",
    "`pending`, `dispatched`, `completed`, `dropped`, or `cancelled`",
    "`pending`、`dispatched`、`completed`、`dropped` 或 `cancelled`",
    "For `RESULT_PUSH`, `NativeRuntimeResult` exposes:",
    "对于 `RESULT_PUSH`，`NativeRuntimeResult` 提供：",
    "result.frame_id",
    "print(result.body)",
    ".submit(FrameSubmitMetadata::default(),",
  ];

  for (const { path, source } of sources) {
    for (const fragment of forbidden) {
      if (source.includes(fragment)) {
        throw new Error(`${path} still contains superseded SDK API fragment: ${fragment}`);
      }
    }
  }
});
