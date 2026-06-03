# JavaScript/TypeScript Server API

Server API 位于 `@nnrp/native-server`。Browser package 不暴露 server entrypoint。

## `openBackendRuntime`

创建 native backend runtime，但不立即启动 listener。

| 参数      | 类型                                                      | 必填 | 说明                                                                                |
| --------- | --------------------------------------------------------- | ---: | ----------------------------------------------------------------------------------- |
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) |   否 | Transport policy、已安装 transport provider、环境/platform 覆盖与可选 FFI binding。 |

| 返回                          |
| ----------------------------- |
| `Promise<NnrpBackendRuntime>` |

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "tcp-only",
  transports: [createTcpTransportProvider()],
});
```

## `NnrpBackendRuntime.listen`

创建 backend server listener。

| 参数      | 类型                                      | 必填 | 说明                                                             |
| --------- | ----------------------------------------- | ---: | ---------------------------------------------------------------- |
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) |   是 | 本地 endpoint、可选 transport policy 与可选 transport provider。 |

| 返回         |
| ------------ |
| `NnrpServer` |

```ts
const server = runtime.listen({ endpoint: "0.0.0.0:4433" });
```

## `NnrpBackendRuntime.connect`

从已有 backend runtime 创建 native client。适用于同一个 backend 进程同时管理 server 与 client
生命周期的场景。

| 参数      | 类型                                        | 必填 | 说明                                                                               |
| --------- | ------------------------------------------- | ---: | ---------------------------------------------------------------------------------- |
| `options` | [`NnrpConnectOptions`](#nnrpconnectoptions) |   是 | Endpoint、可选 transport policy、可选 transport provider 与可选 session defaults。 |

| 返回         |
| ------------ |
| `NnrpClient` |

## `NnrpBackendRuntime.selectTransport`

根据 peer manifest 选择 transport。

| 参数      | 类型                                                              | 必填 | 说明                              |
| --------- | ----------------------------------------------------------------- | ---: | --------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |   是 | Peer manifest 与可选 score 覆盖。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## 边界规则

| 包                                             | 拥有                                                          | 不能拥有                                                          |
| ---------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@nnrp/native-server`                          | Server runtime、listen lifecycle、backend runtime lifecycle。 | TCP/QUIC artifact、browser code 或 client-only top-level helper。 |
| `@nnrp/native-client`                          | Client runtime 与 session lifecycle。                         | Server listener API。                                             |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` | Transport 行为与打包 artifact。                               | Server 或 client role lifecycle。                                 |

## 选项类型

### `NnrpBackendRuntimeOptions`

| 字段              | 类型                                                    | 必填 | 说明                                                                     |
| ----------------- | ------------------------------------------------------- | ---: | ------------------------------------------------------------------------ |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | 默认选择策略。                                                           |
| `transports`      | `readonly NnrpTransportProvider[]`                      |   否 | 已安装 native transport provider。见 [Transport Provider](./transport)。 |
| `environment`     | `Record<string, string>`                                |   否 | Artifact 查找或诊断用环境变量覆盖。                                      |
| `platform`        | `string`                                                |   否 | 测试和受控打包校验用 platform 覆盖。                                     |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控部署和测试用显式 native binding。                                    |

### `NnrpListenOptions`

| 字段              | 类型                                     | 必填 | 说明                                    |
| ----------------- | ---------------------------------------- | ---: | --------------------------------------- |
| `endpoint`        | `string`                                 |   是 | 本地监听 endpoint。                     |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型) |   否 | Listener 选择策略。                     |
| `transports`      | `readonly NnrpTransportProvider[]`       |   否 | 本 listener 允许的 transport provider。 |

### `NnrpConnectOptions`

| 字段              | 类型                                                | 必填 | 说明                               |
| ----------------- | --------------------------------------------------- | ---: | ---------------------------------- |
| `endpoint`        | `string`                                            |   是 | 远端 endpoint。                    |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)            |   否 | Connection 选择策略。              |
| `transports`      | `readonly NnrpTransportProvider[]`                  |   否 | 本连接允许的 transport provider。  |
| `sessionDefaults` | [`NnrpSessionOptions`](./client#nnrpsessionoptions) |   否 | session 未设置字段时使用的默认值。 |

### `NnrpTransportSelectionOptions`

| 字段           | 类型                                        | 必填 | 说明                       |
| -------------- | ------------------------------------------- | ---: | -------------------------- |
| `peerManifest` | [`NnrpCapabilityManifest`](./core#数据类型) |   是 | Peer capability manifest。 |
| `providers`    | `readonly NnrpTransportProvider[]`          |   否 | 需要评分的本地 provider。  |
| `policy`       | [`NnrpTransportPolicy`](./core#数据类型)    |   否 | Selection policy 覆盖。    |
