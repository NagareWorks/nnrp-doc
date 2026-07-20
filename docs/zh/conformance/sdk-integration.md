# SDK 集成指南 — 面向 SDK 开发者

<div class="page-note">
本页面描述 SDK 仓库当前正式接入模型。如果你在维护一致性测试套件本身，请参阅 <a href="./manifests">Manifest 参考</a>。
</div>

## 集成原则

SDK 仓库接入一致性测试时，必须遵守以下边界：

1. 一致性测试必须是**独立 CI job**，不能再嵌入单元测试、覆盖率或语言自带测试框架的主 job。
2. 一致性测试的执行编排由 `nnrp-conformance` 提供的 `run-conformance` action 统一负责。
3. SDK 仓库负责声明 capability manifest，并在开启行为验证时提供适配器命令。
4. SDK 的 pytest、xUnit 或其他单测框架不能替代 suite 生成的 execution plan 与统一 result schema。

## 接入契约

suite 负责 baseline 选择、canonical vector 生成、execution plan 创建和 result 校验。SDK
仓库只负责实现自己的适配器入口，以及按需附带证据文件。

| 接入面 | 职责 | suite 与实现仓库交换什么 |
| --- | --- | --- |
| capability selection | 决定当前实现会被选择哪些公共 case | capability manifest、conformance report |
| canonical vectors | 从可读 recipe 生成确定性的字节级 fixture | suite 生成的 vector manifest |
| adapter execution | 执行选中的动态行为用例并返回机器可读结果 | execution plan、适配器命令、case-result report |
| benchmark execution | 测量选中的延迟与吞吐场景 | benchmark plan、benchmark command、benchmark result report |
| API profile execution | 验证适配器级 OpenAI-compatible API 表面 | API profile capability manifest、profile execution plan、API profile results |
| wire-level execution | 由 runner 直接扮演客户端、服务端或代理，验证真实端点 | wire target manifest、wire execution plan、wire results、evidence 文件 |

---

## 第一步：创建 capability manifest

在仓库根目录创建 `conformance/<protocol-version>.capabilities.json`（例如
`conformance/nnrp-1-preview3.capabilities.json`）。路径是约定俗成的，suite action 通过
`capabilities-path` 读取它。

如果你不想手写 JSON，可以直接使用 [能力声明生成器](./capability-manifest-generator)
先生成骨架，再回到版本化能力列表核对 token 语义。

### 能力声明字段参考

| 字段                  | 类型        | 是否必填 | 合法取值         | 说明                                                                                     |
| --------------------- | ----------- | -------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `$schema`             | string      | 否       | URI              | JSON Schema 引用。                                                                       |
| `implementation_name` | string      | **是**   | 非空字符串       | 你的实现的规范短名称。会出现在报告输出和 CI 日志中，例如 `nnrp-py`、`nnrp-cs`。          |
| `protocol_version`    | string      | **是**   | 非空字符串       | 目标协议版本线，必须与 suite action 传入的 `protocol-version` 完全一致。                 |
| `supports`            | string 数组 | **是**   | 唯一的能力 token | 你已完成并愿意对外宣称支持的能力。未声明能力不会被伪装成通过，而是归类为 `not_claimed`。 |

### 按版本查能力 token

能力 token 现在单独维护在版本化能力列表中，不再把某个版本的全部 token
硬编码在集成指南里。这样做有两个好处：

1. SDK 开发者可以直接跳到目标版本页，不会把 preview2、preview3 的 token 混在一起。
2. 同一个 token 名称在不同版本中可以拥有不同语义边界，文档也能按版本分别解释。

<div class="doc-grid">
  <div class="doc-card">
    <h3><a href="./capabilities/">能力列表总览</a></h3>
    <p>先看 token 是什么、何时应该写进 `supports`，以及为什么有些用例没有 token。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/nnrp-1-preview2">nnrp-1-preview2</a></h3>
    <p>Preview2 的完整 token 表，包含组合要求、相关 case 和每个能力的详细约束。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/nnrp-1-preview3">nnrp-1-preview3</a></h3>
    <p>Preview3 当前 mandatory core 与 optional/experimental token 的能力目录。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/nnrp-1-preview4">nnrp-1-preview4</a></h3>
    <p>Preview4 运行时控制、运行时对象、缓存引用与线路级端点能力目录。</p>
  </div>
</div>

::: tip 关于组合选择 有些 case 不是由单个 token 触发，而是要求多个 token 同时声明。例如 inline
tensor 路径会同时依赖 `frame_submit.tensor.inline` 和
`result_push.basic`。具体组合关系请直接看对应版本页。 :::

### Capability manifest 示例

```json
{
  "$schema": "../../schemas/capability-manifest.schema.json",
  "implementation_name": "nnrp-py",
  "protocol_version": "nnrp-1-preview3",
  "supports": [
    "handshake.basic",
    "session.open_close",
    "frame_submit.tensor.inline",
    "result_push.basic"
  ]
}
```

::: warning 只声明已完成的能力 声明某个能力意味着接受针对该 token 对应所有 `mandatory` 用例的 CI
硬约束。未完成能力不要提前写入 manifest。 :::

---

## 第二步：实现 SDK 适配器命令

suite action 不直接调用你的测试框架，而是调用你提供的适配器命令。这个命令必须消费 suite 生成的
execution plan，并输出统一 schema 的 case-result report。

### 命令契约

你的命令至少要支持以下参数：

| 环境变量                           | 是否必填 | 说明                                                  |
| ---------------------------------- | -------- | ----------------------------------------------------- |
| `NNRP_CONFORMANCE_ADAPTER_PLAN`    | **是**   | suite 生成的 execution plan JSON 绝对路径。           |
| `NNRP_CONFORMANCE_ADAPTER_RESULTS` | **是**   | 适配器必须写入的 case-result report JSON 绝对路径。 |

输出文件必须满足以下要求：

1. UTF-8 JSON，建议无 BOM。
2. 顶层必须包含 `protocol_version`、`implementation_name` 和 `results`。
3. 每个 result 条目必须包含 `id` 和 `outcome`。
4. result id 必须与 execution plan 中的 case id 完全一致。

### 推荐的命令形态

Python：

```bash
python -m nnrp.tools.adapter_conformance
```

C#：

```powershell
dotnet run --project tools/Nnrp.ConformanceAdapter/Nnrp.ConformanceAdapter.csproj
```

::: tip 这里不要再写嵌入式一致性测试 正式接入边界是“suite-owned plan + 适配器命令 +
suite-validated results”。语言内测试仍可保留本仓库自己的单元/集成回归，但它们不再承担公共
一致性测试职责。 :::

---

## 第三步：本地调试 suite runner

CI 正式路径应优先使用 suite action；以下命令只用于本地排障和人工核对。

::: tip 替换成你的目标 baseline 以下命令中的 `<protocol-version>`、`<path-to-protocol-manifest>` 和
`<path-to-recipe>` 都应替换成你当前对接的版本线。 :::

### `summary` — 查看 execution plan

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <path-to-protocol-manifest> \
  --capabilities conformance/<protocol-version>.capabilities.json
```

### `generate-vectors` — 生成 canonical 向量 manifest

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  generate-vectors \
  --recipe <nnrp-conformance 路径>/protocol/<protocol-version>/vectors/semantic-vectors.json \
  --output /tmp/canonical-vectors.json
```

### `verify-vectors` — 验证 canonical 产物确定性

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-vectors \
  --recipe <nnrp-conformance 路径>/protocol/<protocol-version>/vectors/semantic-vectors.json \
  --manifest /tmp/canonical-vectors.json
```

### `validate-adapter-results` — 校验 adapter 输出

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  validate-adapter-results \
  --plan /tmp/adapter-plan.json \
  --results /tmp/adapter-results.json
```

### SDK benchmark command

当启用 suite-owned benchmark plan 时，SDK 命令会读取 `NNRP_CONFORMANCE_BENCHMARK_PLAN` 或
`--plan`，并写入 `NNRP_CONFORMANCE_BENCHMARK_RESULTS` 或 `--output`。

Python:

```bash
python -m nnrp.tools.benchmark \
  --plan /tmp/benchmark-plan.json \
  --output /tmp/benchmark-results.json
```

### OpenAI API profile plan

提供 OpenAI-compatible NNRP API 表面的适配器需要单独维护一份 API profile capability
manifest。Runner 会把它和 OpenAI profile suite manifest 合并，生成 recipe 级执行计划。

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  api-profile-plan \
  --protocol <nnrp-conformance 路径>/protocol/nnrp-1-preview3/manifest.json \
  --profile <nnrp-conformance 路径>/profiles/openai-compatible/1/manifest.json \
  --capabilities conformance/openai-compatible-1.api-capabilities.json \
  --output /tmp/api-profile-plan.json
```

适配器命令应消费这份 plan，对自己的 OpenAI-compatible NNRP 表面逐条执行 recipe，并写出 API
profile results。结果里的 id 必须直接复制 plan 中的 id。

### 线路级 endpoint plan 与 results

当 runner 需要绕过 SDK 自己的适配器，直接测试真实端点时，使用线路级一致性测试。Target manifest
会声明端点模式、传输地址、选中的线路级场景以及执行限制。

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  wire-plan \
  --suite <nnrp-conformance 路径>/wire-conformance/nnrp-1-preview4/manifest.json \
  --target conformance/nnrp-1-preview4.wire-target.json \
  --output /tmp/wire-plan.json \
  --results-path /tmp/wire-results.json \
  --evidence-dir /tmp/wire-evidence

cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  wire-run \
  --plan /tmp/wire-plan.json \
  --target conformance/nnrp-1-preview4.wire-target.json \
  --output /tmp/wire-results.json

cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  validate-wire-results \
  --plan /tmp/wire-plan.json \
  --results /tmp/wire-results.json
```

启用 TLS 的 target transport 还必须声明冻结的 `security` 对象。证书和私钥路径相对 target manifest 解析。runner 连接实现侧 endpoint 时使用
受信任证书和 server name；suite 持有 listener 时使用证书和私钥。`suite_as_proxy` 把声明的 endpoint 作为实现侧 server 上游地址，proxy
前端 endpoint 只由 suite 内部持有。

Adapter execution 验证 SDK 易用面和实现仓库自有行为。线路级 execution 验证公共协议边界：帧顺序、终态、传输绑定与证据输出。

---

## 第四步：接入 CI

### 推荐结构

1. 保留语言原生的 `test` / `coverage` job，只做本仓库测试。
2. 额外新增一个独立的 `conformance` job。
3. 在该 job 中检出 suite 仓库，并调用 `run-conformance` action。
4. 通过 `adapter-command` 把你的适配器命令交给 suite action 执行。

### `run-conformance` 的关键输入

| 输入                | 说明                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol-version`  | 目标协议版本线，例如 `nnrp-1-preview3`。                                                                                                                    |
| `capabilities-path` | 你的 capability manifest 路径。                                                                                                                             |
| `working-directory` | 在 SDK 仓库中执行 adapter command 的目录。                                                                                                                  |
| `artifact-name`     | CI 中上传 conformance 报告与向量文件的 artifact 名称。默认建议使用通用名，例如 `<repo>-conformance`；只有在同一工作流并列发布多个版本时才需要附带版本后缀。 |
| `adapter-command`   | 消费 `NNRP_CONFORMANCE_ADAPTER_PLAN` 并写入 `NNRP_CONFORMANCE_ADAPTER_RESULTS` 的命令。                                                                     |

### GitHub Actions 示例

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run tests
        run: <你的语言测试命令>

  conformance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Checkout nnrp-conformance action
        uses: actions/checkout@v4
        with:
          repository: <你的组织>/nnrp-conformance
          path: nnrp-conformance-action

      - name: Setup language runtime
        run: <安装你的 SDK 所需运行时>

      - name: Resolve conformance baseline
        id: conformance-baseline
        shell: bash
        run: |
          capabilities_path="$(find conformance -maxdepth 1 -name '*.capabilities.json' | head -n 1)"
          test -n "$capabilities_path"
          protocol_version="$(basename "$capabilities_path" .capabilities.json)"
          echo "protocol_version=$protocol_version" >> "$GITHUB_OUTPUT"
          echo "capabilities_path=$capabilities_path" >> "$GITHUB_OUTPUT"

      - name: Run suite-owned conformance action
        uses: ./nnrp-conformance-action/.github/actions/run-conformance
        with:
          protocol-version: ${{ steps.conformance-baseline.outputs.protocol_version }}
          capabilities-path: ${{ steps.conformance-baseline.outputs.capabilities_path }}
          working-directory: .
          artifact-name: <repo>-conformance
          adapter-command: <你的 adapter 命令>
```

---

## 常见错误与解决方法

| 错误                                         | 原因                                                                           | 解决方法                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `protocol version mismatch`                  | capability manifest、suite action 输入和 adapter result 使用了不同版本字符串。 | 统一 `protocol-version`、capability manifest 的 `protocol_version` 和 result report。 |
| `adapter-command` 成功退出，但找不到输出文件 | 适配器没有写入预期 result 路径。                                             | 确认命令实际写入 `NNRP_CONFORMANCE_ADAPTER_RESULTS`。                                 |
| JSON 在第 1 列解析失败                       | 输出文件编码包含 BOM 或文件内容不是合法 JSON。                                 | 使用 UTF-8 无 BOM 输出，并确认命令失败时返回非零退出码。                              |
| result id 不匹配                             | 适配器返回了本地私有 id，而不是 plan 中的 case id。                          | 直接使用 execution plan 中的 `id`。                                                   |
| 所有用例均为 `not_claimed`                   | capability manifest 的 `supports` 为空，或声明的 token 与目标版本不匹配。      | 检查 `supports` 和 `protocol_version`。                                               |
