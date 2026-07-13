# JavaScript/TypeScript 核心 API

`@nnrp/core` 包含 JavaScript role package 与 transport package 共享的运行时无关类型和 helper。

## 常量

| 名称                           | 类型           | 值                                                    |
| ------------------------------ | -------------- | ----------------------------------------------------- |
| `NNRP_PROTOCOL_NAME`           | `"NNRP"`       | 协议名。                                              |
| `NNRP_PROTOCOL_VERSION`        | `"1.0.0"`      | 协议版本。                                            |
| `NNRP_STANDARD_INPUT_PROFILES` | readonly tuple | `tensor`、`token`、`structured_event`、`tool_delta`。 |

## `createCapabilityManifest`

创建按 build mode 区分的 capability manifest。

| 参数      | 类型                            | 必填 | 说明                                        |
| --------- | ------------------------------- | ---: | ------------------------------------------- |
| `options` | `NnrpCapabilityManifestOptions` |   是 | Build mode、transport 和 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `createBackendNativeManifest`

创建默认 backend native capability manifest。

| 参数           | 类型                        | 必填 | 说明                    |
| -------------- | --------------------------- | ---: | ----------------------- |
| `capabilities` | `readonly NnrpCapability[]` |   否 | 额外 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `createBrowserWasmManifest`

创建默认 browser WASM capability manifest。

| 参数           | 类型                        | 必填 | 说明                    |
| -------------- | --------------------------- | ---: | ----------------------- |
| `capabilities` | `readonly NnrpCapability[]` |   否 | 额外 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `selectTransport`

按策略选择评分最高的可用 transport candidate。

| 参数         | 类型                                | 必填 | 说明                                                |
| ------------ | ----------------------------------- | ---: | --------------------------------------------------- |
| `candidates` | `readonly NnrpTransportCandidate[]` |   是 | 候选 transport。                                    |
| `policy`     | `NnrpTransportPolicy`               |   否 | `auto`、一种 `prefer-*` 策略或一种 `force-*` 策略。 |

| 返回                     |
| ------------------------ |
| `NnrpTransportSelection` |

## `createTransportCandidates`

根据本地和 peer manifest 创建 transport candidates。

| 参数      | 类型                            | 必填 | 说明                                        |
| --------- | ------------------------------- | ---: | ------------------------------------------- |
| `options` | `NnrpTransportCandidateOptions` |   是 | 本地 manifest、peer manifest 和可选 score。 |

| 返回                                |
| ----------------------------------- |
| `readonly NnrpTransportCandidate[]` |

## `createTransportSelectionSummary`

创建供诊断、conformance 和 benchmark 使用的精简 selection summary。

| 参数        | 类型                     | 必填 | 说明                  |
| ----------- | ------------------------ | ---: | --------------------- |
| `selection` | `NnrpTransportSelection` |   是 | 完整 selection 对象。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `normalizeSubmitRequest`

校验并规范化 submit payload。

| 参数      | 类型                            | 必填 | 说明                                  |
| --------- | ------------------------------- | ---: | ------------------------------------- |
| `request` | `NnrpSubmitRequest`             |   是 | Submit request。                      |
| `options` | `NormalizeSubmitRequestOptions` |   否 | Payload copy 和 strict profile 选项。 |

| 返回                          | 可能抛出              |
| ----------------------------- | --------------------- |
| `NnrpNormalizedSubmitRequest` | `NnrpProtocolError`。 |

## `normalizeOperationRef`

规范化 operation id。

| 参数        | 类型               | 必填 | 说明           |
| ----------- | ------------------ | ---: | -------------- |
| `operation` | `bigint \| number` |   是 | Operation id。 |

| 返回     | 可能抛出                                      |
| -------- | --------------------------------------------- |
| `bigint` | 负数或 unsafe id 会抛出 `NnrpProtocolError`。 |

## `validateEventPollOptions`

校验事件轮询选项。

| 参数      | 类型                   | 必填 | 说明           |
| --------- | ---------------------- | ---: | -------------- |
| `options` | `NnrpEventPollOptions` |   否 | Timeout 选项。 |

| 返回   | 可能抛出                                 |
| ------ | ---------------------------------------- |
| `void` | timeout 非法时抛出 `NnrpProtocolError`。 |

## 数据类型

### Capability 与 Transport

| 类型                            | 说明                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `NnrpBuildMode`                 | `"backend-native" \| "browser-wasm"`。                                                                         |
| `NnrpTransportKind`             | `"tcp" \| "quic" \| "ipc" \| "websocket"`。                                                                    |
| `NnrpTransportPolicy`           | `"auto"`、`"prefer-quic"`、`"prefer-tcp"`、`"prefer-ipc"`、`"prefer-websocket"` 以及四种对应的 `force-*` 值。  |
| `NnrpCapability`                | `client.session`、`server.session`、`native.loader`、`wasm.loader`、`cache`、`schema`、`recovery` 等能力声明。 |
| `NnrpCapabilityManifest`        | 协议名/版本、build mode、transports 和 capabilities。                                                          |
| `NnrpTransportCandidate`        | 候选 transport、可用性、score、拒绝原因和诊断。                                                                |
| `NnrpTransportSelectionSummary` | 被选中的 transport 和 rejected candidates。                                                                    |

### Submit、Result 与 Event

| 类型                   | 说明                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `NnrpInputProfile`     | 标准 profile：`tensor`、`token`、`structured_event`、`tool_delta`。                        |
| `NnrpSubmitMode`       | `"inline" \| "object-reference"`。                                                         |
| `NnrpSubmitRequest`    | Frame id、payload/tensors、input profile、submit mode、cache key、descriptor 和 metadata。 |
| `NnrpResult`           | Frame id、可选 payload、可选 diagnostic 和 metadata。                                      |
| `NnrpRuntimeEvent`     | Result、flow update、result hint、drop、close 或 diagnostic event。                        |
| `NnrpEventPollOptions` | 可选 `timeoutMillis`。                                                                     |

### 错误

| Class                 | 说明                                               |
| --------------------- | -------------------------------------------------- |
| `NnrpError`           | 带结构化 `diagnostic` 的基础错误。                 |
| `NnrpCapabilityError` | Capability、manifest 或 unsupported runtime 错误。 |
| `NnrpTransportError`  | Transport 错误。                                   |
| `NnrpTimeoutError`    | Timeout 错误。                                     |
| `NnrpProtocolError`   | 请求形态或协议校验错误。                           |
