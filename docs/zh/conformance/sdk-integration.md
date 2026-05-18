# SDK 集成指南 — 面向 SDK 开发者

<div class="page-note">
本页面面向拥有 NNRP SDK 实现并希望将 conformance 套件接入的工程师。如果你是在维护 conformance 套件本身（编写 case manifest、protocol manifest、向量 recipe 文件），请参阅 <a href="./manifests">Manifest 参考</a>。
</div>

## 需要做哪些事

将 conformance 集成到 SDK 仓库分四步：

1. **创建 capability manifest**，在你的仓库中声明当前支持哪些协议能力。
2. **运行 conformance runner**，使用你的 capability manifest 生成覆盖报告。
3. **添加 preview2 向量测试**，验证你的线缆编码实现与生成的 golden vector 一致。
4. **接入 CI**，让覆盖报告和向量正确性在每次推送时都有约束。

以下各节分别给出具体操作。

---

## 第一步：创建 capability manifest

在仓库根目录创建 `conformance/nnrp-1-preview2.capabilities.json`（或 `nnrp-1-preview3`，取决于目标版本）。路径是约定俗成的，runner 也接受通过 `--capabilities` 参数指定任意路径。

### Capability Manifest 字段参考

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | URI | JSON Schema 引用。 |
| `implementation_name` | string | **是** | 非空字符串 | 你的实现的规范短名称。会出现在所有报告输出和 CI 日志中。约定使用公开包名或仓库名，例如 `nnrp-py`、`nnrp-cs`。不要加版本后缀，版本由 `protocol_version` 字段承载。 |
| `protocol_version` | string | **是** | 非空字符串 | 你目标对接的协议版本线。必须与 runner `--protocol` 参数指定的 manifest 中的 `protocol_version` 完全一致。任何不一致都会导致 runner 立即报错。例如：`nnrp-1-preview2`。 |
| `supports` | string 数组 | **是** | 唯一的能力 token | 声明你的实现已完成并愿意对外宣称支持哪些协议能力。每个 token 必须是目标协议版本中已定义的能力字符串。未知 token 被接受但不会激活任何用例。 |

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
不要列出尚未完整实现的能力。声明某个能力意味着接受针对该 token 对应所有 `mandatory` 用例的 CI 硬约束。正在开发中的能力应在实现稳定后再行添加。
:::

---

## 第二步：本地运行 conformance runner

Conformance runner 是 `nnrp-conformance` 仓库中的一个 Rust CLI 工具。你需要在本地 clone 该仓库。可以设置 `NNRP_CONFORMANCE_ROOT` 环境变量指向 clone 路径，也可以直接通过命令行参数传入路径。

### `summary` — 执行计划与覆盖报告

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <nnrp-conformance 路径>/protocol/nnrp-1-preview2/manifest.json \
  --capabilities conformance/nnrp-1-preview2.capabilities.json
```

输出为 JSON 格式的执行计划，打印到 stdout。每条用例归入以下三类之一：

| 分类 | 含义 |
|---|---|
| `selected` | 你的实现已声明所有所需能力。该用例在 CI 中做硬约束。 |
| `not_claimed` | 至少有一个所需能力未被声明。不计为失败，尚未纳入范围。 |
| `informational` | `experimental` 或 `deprecated` 用例。仅打印供参考。 |

### `generate-preview2-vectors` — 生成 golden vector 产物

从语义 recipe 文件生成规范化线缆向量 manifest。在运行向量验证测试之前需先执行此命令。

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  generate-preview2-vectors \
  --semantic <nnrp-conformance 路径>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --output /tmp/preview2-golden-vectors.json
```

输出文件（`/tmp/preview2-golden-vectors.json`）就是你的 SDK 测试通过 `NNRP_CONFORMANCE_VECTOR_MANIFEST` 环境变量读取的向量 manifest。

### `verify-preview2-vectors` — 验证确定性

重新从相同 recipe 生成，验证与已有 manifest 完全一致。在提交 bug report 之前用此命令确认本地环境状态正常。

```bash
cargo run \
  --manifest-path <nnrp-conformance 路径>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-preview2-vectors \
  --semantic <nnrp-conformance 路径>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --manifest /tmp/preview2-golden-vectors.json
```

---

## 第三步：实现向量往返测试

你的 SDK 必须包含一个测试，执行以下流程：

1. 从 `NNRP_CONFORMANCE_VECTOR_MANIFEST` 读取已生成的向量 manifest。
2. 用你自己的实现（打包 / 序列化 / 编码，具体取决于 SDK）重新生成每个向量。
3. 断言你生成的 hex 与 manifest 中每个具名向量的 hex 完全一致。

当 `NNRP_CONFORMANCE_VECTOR_MANIFEST` 未设置时，测试必须**优雅跳过**，以确保在未 clone conformance 仓库的情况下本地开发也能正常工作。

### Python 示例

```python
import json
import os
from pathlib import Path
import pytest

def test_preview2_conformance_vectors_match_generated_manifest() -> None:
    manifest_path_value = os.environ.get("NNRP_CONFORMANCE_VECTOR_MANIFEST")
    if not manifest_path_value:
        pytest.skip("NNRP_CONFORMANCE_VECTOR_MANIFEST is not configured")

    manifest_path = Path(manifest_path_value)
    assert manifest_path.is_file(), f"manifest not found: {manifest_path}"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["protocol_version"] == "nnrp-1-preview2"

    expected = {
        e["name"]: {"kind": e["kind"], "hex": e["hex"], "bytes": e["bytes"]}
        for e in manifest["vectors"]
    }
    actual = {
        v.name: {"kind": v.kind, "hex": v.hex_payload, "bytes": v.byte_length}
        for v in your_sdk.export_golden_vectors()
    }

    assert set(actual) == set(expected)
    for name, exp in expected.items():
        assert actual[name] == exp, f"vector mismatch: {name}"
```

### C# 示例

```csharp
[Fact]
public void Preview2ConformanceVectorsRoundTrip()
{
    var manifestPath = Environment.GetEnvironmentVariable("NNRP_CONFORMANCE_VECTOR_MANIFEST");
    if (string.IsNullOrEmpty(manifestPath)) return; // 跳过

    var manifest = JsonSerializer.Deserialize<VectorManifest>(File.ReadAllText(manifestPath));
    Assert.Equal("nnrp-1-preview2", manifest.ProtocolVersion);

    var expected = manifest.Vectors.ToDictionary(v => v.Name);
    var actual = YourSdk.ExportGoldenVectors().ToDictionary(v => v.Name);

    Assert.Equal(expected.Keys.Order(), actual.Keys.Order());
    foreach (var (name, exp) in expected)
    {
        Assert.Equal(exp.Hex, actual[name].Hex);
        Assert.Equal(exp.Bytes, actual[name].Bytes);
    }
}
```

---

## 第四步：接入 CI

### 环境变量

你的 CI job 必须设置：

| 变量 | 取值示例 | 用途 |
|---|---|---|
| `NNRP_CONFORMANCE_VECTOR_MANIFEST` | `${{ runner.temp }}/preview2-golden-vectors.json` | 指向已生成的向量 manifest 产物路径。向量测试从此处读取文件。 |

### 必要步骤（按顺序）

1. **检出你的实现仓库**
2. **检出 `nnrp-conformance`**，作为并列子目录（例如 `path: nnrp-conformance`）
3. **安装 Rust 工具链**（`cargo run` 所需）
4. **生成向量**（从语义 recipe 生成）
5. **运行 conformance summary**，生成覆盖报告
6. **运行测试套件**（含向量往返测试）

### GitHub Actions 示例

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NNRP_CONFORMANCE_VECTOR_MANIFEST: ${{ runner.temp }}/preview2-golden-vectors.json

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Checkout nnrp-conformance
        uses: actions/checkout@v4
        with:
          repository: NagareWorks/nnrp-conformance
          path: nnrp-conformance

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      # 第四步：生成向量
      - name: Generate preview2 conformance vectors
        run: >-
          cargo run
          --manifest-path nnrp-conformance/Cargo.toml
          -p nnrp-conformance-runner
          --
          generate-preview2-vectors
          --semantic nnrp-conformance/protocol/nnrp-1-preview2/vectors/semantic-vectors.json
          --output ${{ runner.temp }}/preview2-golden-vectors.json

      # 第五步：覆盖报告
      - name: Preview2 conformance summary
        run: >-
          cargo run
          --manifest-path nnrp-conformance/Cargo.toml
          -p nnrp-conformance-runner
          --
          summary
          --protocol nnrp-conformance/protocol/nnrp-1-preview2/manifest.json
          --capabilities conformance/nnrp-1-preview2.capabilities.json

      # 第六步：测试套件（向量测试读取 NNRP_CONFORMANCE_VECTOR_MANIFEST）
      - name: Run tests
        run: <你的语言对应的测试命令>
```

::: tip 步骤顺序很重要
`generate-preview2-vectors` 必须在读取 `NNRP_CONFORMANCE_VECTOR_MANIFEST` 的测试之前完成。如果该文件在测试运行时尚不存在，测试将以文件未找到错误失败或跳过，取决于你的实现。
:::

---

## 常见错误与解决方法

| 错误 | 原因 | 解决方法 |
|---|---|---|
| `protocol version mismatch: expected nnrp-1-preview2, got nnrp-1-preview3` | capability manifest 的 `protocol_version` 与 `--protocol` 参数指定的版本不一致。 | 将两者对齐到相同的版本字符串。 |
| 测试静默跳过 | `NNRP_CONFORMANCE_VECTOR_MANIFEST` 未设置或为空。 | 确认该环境变量已导出到测试进程。在 GitHub Actions 中，确认它在 `job` 或 `step` 层级设置，而不是在兄弟 job 中。 |
| 向量名称不匹配 | SDK 的导出函数返回的名称与 manifest 中的不一致。 | 确保导出函数使用 recipe 的 `name` 字段中的稳定匹配名称。 |
| `manifest not found: /tmp/preview2-golden-vectors.json` | 向量生成步骤未运行或静默失败。 | 检查 `generate-preview2-vectors` 步骤的退出码和输出。 |
| 所有用例均为 `not_claimed` | capability manifest 的 `supports` 数组为空，或 `protocol_version` 不匹配。 | 检查 capability manifest 文件中的这两个字段。 |
