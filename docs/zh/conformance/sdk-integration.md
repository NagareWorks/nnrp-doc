# SDK 集成指南 — 面向 SDK 开发者

<div class="page-note">
本页面只描述当前正式接入模型：conformance 由套件仓库统一拥有，SDK 仓库只提供 capability manifest 和向量导出命令。如果你在维护 conformance 套件本身，请参阅 <a href="./manifests">Manifest 参考</a>。
</div>

## 集成原则

SDK 仓库接入 conformance 时，必须遵守以下边界：

1. conformance 必须是**独立 CI job**，不能再嵌入单元测试、覆盖率或语言自带测试框架的主 job。
2. conformance 的执行编排由 `nnrp-conformance` 提供的 `run-conformance` action 统一负责。
3. SDK 仓库只负责两件事：声明 capability manifest，以及提供一个能导出本实现向量 manifest 的命令。
4. SDK 的 pytest、xUnit 或其他单测框架不再读取 suite 生成的临时向量文件，也不再以“跳过式 conformance 测试”充当正式接入方案。

---

## 第一步：创建 capability manifest

在仓库根目录创建 `conformance/nnrp-1-preview2.capabilities.json`（或目标版本对应文件）。路径是约定俗成的，suite action 通过 `capabilities-path` 读取它。

### Capability Manifest 字段参考

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | URI | JSON Schema 引用。 |
| `implementation_name` | string | **是** | 非空字符串 | 你的实现的规范短名称。会出现在报告输出和 CI 日志中，例如 `nnrp-py`、`nnrp-cs`。 |
| `protocol_version` | string | **是** | 非空字符串 | 目标协议版本线，必须与 suite action 传入的 `protocol-version` 完全一致。 |
| `supports` | string 数组 | **是** | 唯一的能力 token | 你已完成并愿意对外宣称支持的能力。未声明能力不会被伪装成通过，而是归类为 `not_claimed`。 |

### `nnrp-1-preview2` 的合法能力 token

以下 token 在 preview2 case manifest 中已定义。只有你声明的 token 对应的用例才会在 CI 中成为硬约束。

<table class="protocol-table">
  <thead>
    <tr>
      <th>Token</th>
      <th>层级</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>body_region.prelude</code></td><td>L0</td><td>编码和解码 body-region prelude 布局，覆盖 inline、reference 和 typed payload 三种区域。</td></tr>
    <tr><td><code>cache.lifecycle</code></td><td>L1</td><td>完整缓存条目生命周期：分配、pin、释放及命名空间管理。</td></tr>
    <tr><td><code>control.client_hello</code></td><td>L0 / L1</td><td>打包和解析 CLIENT_HELLO 固定元数据块。</td></tr>
    <tr><td><code>control.session_patch_ack</code></td><td>L0 / L1</td><td>打包和解析 SESSION_PATCH_ACK 固定元数据块。</td></tr>
    <tr><td><code>flow_update</code></td><td>L0 / L1</td><td>FLOW_UPDATE 包的往返编解码，含 credit delta 编码。</td></tr>
    <tr><td><code>frame_submit.mixed</code></td><td>L0 / L1</td><td>混合提交模式（inline + reference 区域）下的 FRAME_SUBMIT 编解码。</td></tr>
    <tr><td><code>object_reference.cache</code></td><td>L0</td><td>打包和解析缓存后端 body 区域所使用的对象引用块。</td></tr>
    <tr><td><code>payload.tensor</code></td><td>L0 / L1</td><td>Tensor profile 载荷的编解码，含 descriptor、schema 和 body 布局。</td></tr>
    <tr><td><code>payload.typed</code></td><td>L0 / L1</td><td>类型化载荷描述符的编解码（非 tensor profile）。</td></tr>
    <tr><td><code>result_hint</code></td><td>L0 / L1</td><td>RESULT_HINT 包的往返编解码，含 hint 元数据。</td></tr>
    <tr><td><code>result_push.degraded</code></td><td>L1</td><td>降级（fallback）模式下的 RESULT_PUSH 编解码。</td></tr>
    <tr><td><code>result_push.partial</code></td><td>L1</td><td>部分交付模式下的 RESULT_PUSH 编解码。</td></tr>
    <tr><td><code>result_push.stale_reuse</code></td><td>L1</td><td>带旧帧复用语义的 RESULT_PUSH 编解码。</td></tr>
    <tr><td><code>transport.probe</code></td><td>L3</td><td>实现传输探测握手及探测结果处理。</td></tr>
    <tr><td><code>transport.quic</code></td><td>L3</td><td>QUIC 传输适配器，含流多路复用和 0-RTT 路径。</td></tr>
    <tr><td><code>transport.tcp</code></td><td>L3</td><td>TCP 传输适配器，含帧边界处理和重连逻辑。</td></tr>
  </tbody>
</table>

### Capability manifest 示例

```json
{
  "$schema": "../../schemas/capability-manifest.schema.json",
  "implementation_name": "nnrp-py",
  "protocol_version": "nnrp-1-preview2",
  "supports": [
    "body_region.prelude",
    "cache.lifecycle",
    "control.client_hello",
    "control.session_patch_ack",
    "flow_update",
    "frame_submit.mixed",
    "object_reference.cache",
    "payload.tensor",
    "payload.typed",
    "result_hint",
    "result_push.degraded",
    "result_push.partial",
    "result_push.stale_reuse",
    "transport.probe",
    "transport.quic",
    "transport.tcp"
  ]
}
```

::: warning 只声明已完成的能力
声明某个能力意味着接受针对该 token 对应所有 `mandatory` 用例的 CI 硬约束。未完成能力不要提前写入 manifest。
:::

---

## 第二步：实现 SDK 向量导出命令

suite action 不直接调用你的测试框架，而是调用你提供的导出命令。这个命令必须使用你自己的 SDK 编码实现，输出与 canonical manifest 同 schema 的 JSON 文件。

### 命令契约

你的命令至少要支持以下参数：

| 参数 | 是否必填 | 说明 |
|---|---|---|
| `--protocol-version` | **是** | 当前导出的协议版本线。未知版本必须直接失败。 |
| `--output` | **是** | 输出文件路径。suite action 会把 `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT` 传给你，你的命令必须把结果写到这里。 |

输出文件必须满足以下要求：

1. UTF-8 JSON，建议无 BOM。
2. 顶层至少包含 `protocol_version`、`generator`、`vectors`。
3. 每个向量条目至少包含 `name`、`kind`、`hex`、`bytes`；`description` 可选。
4. 向量名称必须与 canonical recipe 的稳定名称一一对应。

### 推荐的命令形态

Python：

```bash
python -m nnrp.tools.conformance --protocol-version nnrp-1-preview2 --output "$NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT"
```

C#：

```powershell
dotnet run --project tools/Nnrp.ConformanceExporter/Nnrp.ConformanceExporter.csproj -- --protocol-version nnrp-1-preview2 --output $env:NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT
```

::: tip 这里不要再写嵌入式 conformance 测试
正式接入边界是“导出命令 + suite action”，而不是“pytest/xUnit 读取临时 manifest 再断言一遍”。语言内测试仍可保留本仓库自己的单元/集成回归，但它们不再承担公共 conformance 职责。
:::

---

## 第三步：本地调试 suite runner

CI 正式路径应优先使用 suite action；以下命令只用于本地排障和人工核对。

### `summary` — 查看 execution plan

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <nnrp-conformance 路径>/protocol/nnrp-1-preview2/manifest.json \
  --capabilities conformance/nnrp-1-preview2.capabilities.json
```

### `generate-vectors` — 生成 canonical 向量 manifest

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  generate-vectors \
  --recipe <nnrp-conformance 路径>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --output /tmp/canonical-vectors.json
```

### `verify-vectors` — 验证 canonical 产物确定性

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-vectors \
  --recipe <nnrp-conformance 路径>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --manifest /tmp/canonical-vectors.json
```

### `compare-vector-manifests` — 对比 SDK 导出结果与 canonical 结果

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  compare-vector-manifests \
  --expected /tmp/canonical-vectors.json \
  --actual /tmp/sdk-vectors.json
```

---

## 第四步：接入 CI

### 推荐结构

1. 保留语言原生的 `test` / `coverage` job，只做本仓库测试。
2. 额外新增一个独立的 `conformance` job。
3. 在该 job 中检出 suite 仓库，并调用 `run-conformance` action。
4. 通过 `sdk-vector-command` 把你的导出命令交给 suite action 执行。

### `run-conformance` 的关键输入

| 输入 | 说明 |
|---|---|
| `protocol-version` | 目标协议版本线，例如 `nnrp-1-preview2`。 |
| `capabilities-path` | 你的 capability manifest 路径。 |
| `working-directory` | 在 SDK 仓库中执行导出命令的目录。 |
| `artifact-name` | CI 中上传 conformance 报告与向量文件的 artifact 名称。 |
| `sdk-vector-command` | 你的 SDK 向量导出命令。suite action 会提供 `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT`。 |

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

      - name: Run suite-owned conformance action
        uses: ./nnrp-conformance-action/.github/actions/run-conformance
        with:
          protocol-version: nnrp-1-preview2
          capabilities-path: conformance/nnrp-1-preview2.capabilities.json
          working-directory: .
          artifact-name: <repo>-conformance-preview2
          sdk-vector-command: <你的导出命令>
```

---

## 常见错误与解决方法

| 错误 | 原因 | 解决方法 |
|---|---|---|
| `protocol version mismatch` | capability manifest、suite action 输入和导出命令使用了不同版本字符串。 | 统一 `protocol-version`、capability manifest 的 `protocol_version`，以及导出命令的入参。 |
| `sdk-vector-command` 成功退出，但找不到输出文件 | 你的导出命令没有写入 `--output` 指定路径。 | 确认命令实际消费了 `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT` 对应的路径。 |
| JSON 在第 1 列解析失败 | 输出文件编码包含 BOM 或文件内容不是合法 JSON。 | 使用 UTF-8 无 BOM 输出，并确认命令失败时返回非零退出码。 |
| 向量名称不匹配 | SDK 导出函数使用了本地私有命名，而不是 canonical recipe 名称。 | 让导出结果的 `name` 与 canonical recipe 中的稳定名称完全一致。 |
| 所有用例均为 `not_claimed` | capability manifest 的 `supports` 为空，或声明的 token 与目标版本不匹配。 | 检查 `supports` 和 `protocol_version`。 |
