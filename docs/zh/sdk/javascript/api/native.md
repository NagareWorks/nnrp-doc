# JavaScript/TypeScript Native 后端 API

`@nnrp/native` 面向 Node.js 与 Deno 后端宿主。它校验 `nnrp-rs` native artifact manifest， 检查必需
ABI symbol，探测 runtime capabilities，并暴露 client/server runtime 对象。

## `openNativeClient`

打开 backend runtime 并连接 client endpoint。

| 参数      | 类型                      | 必填 | 说明                                                                                           |
| --------- | ------------------------- | ---: | ---------------------------------------------------------------------------------------------- |
| `options` | `NnrpNativeClientOptions` |   是 | Endpoint、native artifact 选项、transport policy、session defaults、可选 test/loader binding。 |

| 返回                  | 可能抛出                                                       |
| --------------------- | -------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` 或 `NnrpNativeBindingUnavailableError`。 |

```ts
import { openNativeClient } from "@nnrp/native";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  nativeLibrary: { artifactDir: "./native" },
});
```

## `openBackendRuntime`

创建 backend runtime，但不立即连接 client。

| 参数      | 类型                        | 必填 | 说明                                                                           |
| --------- | --------------------------- | ---: | ------------------------------------------------------------------------------ |
| `options` | `NnrpBackendRuntimeOptions` |   否 | Native artifact 选项、transport policy、环境/platform 覆盖、可选 FFI binding。 |

| 返回                          |
| ----------------------------- |
| `Promise<NnrpBackendRuntime>` |

## `NnrpBackendRuntime.connect`

从已有 runtime 创建 client。

| 参数      | 类型                 | 必填 | 说明                                                     |
| --------- | -------------------- | ---: | -------------------------------------------------------- |
| `options` | `NnrpConnectOptions` |   是 | Endpoint、可选 transport policy、可选 session defaults。 |

| 返回         |
| ------------ |
| `NnrpClient` |

## `NnrpBackendRuntime.listen`

创建 backend server listener。

| 参数      | 类型                | 必填 | 说明                                    |
| --------- | ------------------- | ---: | --------------------------------------- |
| `options` | `NnrpListenOptions` |   是 | 本地 endpoint 和可选 transport policy。 |

| 返回         |
| ------------ |
| `NnrpServer` |

## `NnrpBackendRuntime.selectTransport`

针对 peer manifest 选择 transport。

| 参数      | 类型                            | 必填 | 说明                              |
| --------- | ------------------------------- | ---: | --------------------------------- |
| `options` | `NnrpTransportSelectionOptions` |   是 | Peer manifest 和可选 score 覆盖。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `NnrpClient.openSession`

打开 client session。

| 参数      | 类型                 | 必填 | 说明                                               |
| --------- | -------------------- | ---: | -------------------------------------------------- |
| `options` | `NnrpSessionOptions` |   否 | Input profile、cadence、quality tier 和 metadata。 |

| 返回                |
| ------------------- |
| `NnrpClientSession` |

## `NnrpClientSession.submit`

通过粗粒度 native submit/result binding 提交请求并等待 result。

| 参数      | 类型                                   | 必填 | 说明                                                        |
| --------- | -------------------------------------- | ---: | ----------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | Frame id、payload/tensors、profile、cache/schema metadata。 |

| 返回                  |
| --------------------- |
| `Promise<NnrpResult>` |

## `NnrpClientSession.submitNoWait`

提交请求并返回 native operation id。

| 参数      | 类型                                   | 必填 | 说明             |
| --------- | -------------------------------------- | ---: | ---------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | Submit request。 |

| 返回              |
| ----------------- |
| `Promise<bigint>` |

## `NnrpClientSession.cancel`

取消 operation。

| 参数        | 类型                | 必填 | 说明                 |
| ----------- | ------------------- | ---: | -------------------- |
| `operation` | `bigint \| number`  |   是 | Operation id。       |
| `options`   | `NnrpCancelOptions` |   否 | Reason 和 metadata。 |

| 返回            |
| --------------- |
| `Promise<void>` |

## `NnrpClientSession.nextEvent`

通过粗粒度 native batch event binding 读取下一条 runtime event。

| 参数      | 类型                   | 必填 | 说明                 |
| --------- | ---------------------- | ---: | -------------------- |
| `options` | `NnrpEventPollOptions` |   否 | Event polling 选项。 |

| 返回                        |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## Native Artifact Helper

| API                                                  | 说明                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `resolveNativeLibraryPath(options?)`                 | 解析显式路径、环境变量路径、manifest-backed artifact 路径或平台默认路径。                            |
| `resolveNativeArtifact(options)`                     | 读取并校验 packaged native artifact manifest 和 library path。                                       |
| `readNativeArtifactManifest(path)`                   | 读取 `manifest.json`。                                                                               |
| `validateNativeArtifactManifest(manifest, options?)` | 校验 package、OS、架构、dynamic library kind 和必需 exports。                                        |
| `validateNativeRuntimeCapabilities(capabilities)`    | 校验 ABI version、protocol version、必需 feature bits 和 TCP transport support。                     |
| `createNativeRuntimeBinding(options?)`               | 创建 manifest、library path、required symbol list、artifact metadata 和可选 FFI binding descriptor。 |

## 选项类型

### `NnrpNativeLibraryOptions`

| 属性              | 类型                | 必填 | 说明                                           |
| ----------------- | ------------------- | ---: | ---------------------------------------------- |
| `path`            | `string`            |   否 | 显式 native library 路径。                     |
| `artifactDir`     | `string`            |   否 | 包含平台 artifact 文件夹的目录。               |
| `manifestPath`    | `string`            |   否 | 显式 artifact manifest 路径。                  |
| `packageName`     | `string`            |   否 | 平台 package 文件夹覆盖，例如 `linux-x86_64`。 |
| `requiredSymbols` | `readonly string[]` |   否 | SDK 默认值之外的额外必需 symbols。             |

### `NnrpNativeFfiBinding`

| 属性                  | 类型                                                   | 必填 | 说明                                   |
| --------------------- | ------------------------------------------------------ | ---: | -------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |   否 | Binding 实现标签。                     |
| `runtimeCapabilities` | function                                               |   否 | 返回 native runtime capability probe。 |
| `submitResultCompact` | function                                               |   否 | 粗粒度 submit/result hot path。        |
| `submitNoWait`        | function                                               |   否 | 粗粒度 no-wait submit path。           |
| `cancel`              | function                                               |   否 | 粗粒度 cancel path。                   |
| `awaitEvents`         | function                                               |   否 | 粗粒度 batch event polling path。      |
| `close`               | function                                               |   否 | Binding cleanup hook。                 |

### `NnrpNativeRuntimeCapabilities`

| 属性                                                            | 类型     | 说明                              |
| --------------------------------------------------------------- | -------- | --------------------------------- |
| `abiMajor`, `abiMinor`, `abiPatch`                              | `number` | Native ABI version。              |
| `protocolMajor`, `protocolWireFormat`                           | `number` | Protocol compatibility probe。    |
| `sdkMajor`, `sdkMinor`, `sdkPatch`, `sdkChannel`, `sdkRevision` | `number` | Native SDK version metadata。     |
| `transportSlots`                                                | `number` | Native transport support bitset。 |
| `featureFlags`                                                  | `bigint` | Runtime feature bitset。          |
