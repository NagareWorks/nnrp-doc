# JavaScript/TypeScript Transport Provider API

Transport package 是真实 provider 边界。应用安装允许使用的 transport package；runtime probe 和
policy selection 决定实际路径。

| 包                          | 宿主支持                                                             | Artifact 归属                                                   |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `@nnrp/transport-tcp`       | Node.js/Deno native host                                             | Native TCP provider 行为与打包产物。                            |
| `@nnrp/transport-quic`      | Node.js/Deno native host                                             | Native QUIC provider 行为与打包产物。                           |
| `@nnrp/transport-websocket` | 提供 WebSocket implementation 的 browser/edge client；仅 client-side | WebSocket provider；没有 Rust native 或 browser WASM artifact。 |

## `createTcpTransportProvider`

创建 TCP transport provider。

| 参数      | 类型                                                                  | 必填 | 说明                                                  |
| --------- | --------------------------------------------------------------------- | ---: | ----------------------------------------------------- |
| `options` | [`NnrpTcpTransportProviderOptions`](#nnrptcptransportprovideroptions) |   否 | 可用性、score、diagnostic 覆盖与可选 native binding。 |

| 返回                       |
| -------------------------- |
| `NnrpTcpTransportProvider` |

```ts
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const tcp = createTcpTransportProvider({ score: 70 });
```

## `createQuicTransportProvider`

创建 QUIC transport provider。

| 参数      | 类型                                                                    | 必填 | 说明                                                  |
| --------- | ----------------------------------------------------------------------- | ---: | ----------------------------------------------------- |
| `options` | [`NnrpQuicTransportProviderOptions`](#nnrpquictransportprovideroptions) |   否 | 可用性、score、diagnostic 覆盖与可选 native binding。 |

| 返回                        |
| --------------------------- |
| `NnrpQuicTransportProvider` |

```ts
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const quic = createQuicTransportProvider({ score: 90 });
```

## `createWebSocketTransportProvider`

创建 WebSocket transport provider。它使用宿主的 WebSocket implementation，而不是 Rust transport
artifact。

| 参数      | 类型                                                                              | 必填 | 说明                                                      |
| --------- | --------------------------------------------------------------------------------- | ---: | --------------------------------------------------------- |
| `options` | [`NnrpWebSocketTransportProviderOptions`](#nnrpwebsockettransportprovideroptions) |   否 | 可用性、score、diagnostic 覆盖与可选 `WebSocket` 构造器。 |

| 返回                             |
| -------------------------------- |
| `NnrpWebSocketTransportProvider` |

```ts
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const websocket = createWebSocketTransportProvider();
```

## Provider Selection

Role package 显式接收 provider：

```ts
const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
  transports: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
  ],
});
```

如果同时安装并传入多个 provider，runtime 会 probe 并应用 transport policy。Provider package
不是配置开关；它拥有对应 transport 的行为和 artifact。

浏览器默认不暴露操作系统级 raw TCP 或 QUIC socket。当前 browser client 接受 WebSocket provider。 TCP
与 QUIC provider 面向 native host；WebSocket 是 client-side provider，本 SDK 当前不通过它暴露 server
listener。

## Artifact 边界

| 包                          | 包含 native `.dll` / `.so` / `.dylib` | 包含 browser WASM primitives | 说明                                                                  |
| --------------------------- | ------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `@nnrp/native-client`       | 否                                    | 否                           | 只负责 client role。                                                  |
| `@nnrp/native-server`       | 否                                    | 否                           | 只负责 server role。                                                  |
| `@nnrp/browser-client`      | 否                                    | Browser runtime primitives   | 只负责 browser role。                                                 |
| `@nnrp/transport-tcp`       | 是                                    | 否                           | TCP 拥有 native host 的 TCP artifact。                                |
| `@nnrp/transport-quic`      | 是                                    | 否                           | QUIC 拥有 native host 的 QUIC artifact。                              |
| `@nnrp/transport-websocket` | 否                                    | 否                           | 宿主 WebSocket provider；Rust 没有暴露 WebSocket transport artifact。 |

## 选项类型

### `NnrpTcpTransportProviderOptions`

| 字段         | 类型                                                    | 必填 | 说明                          |
| ------------ | ------------------------------------------------------- | ---: | ----------------------------- |
| `available`  | `boolean`                                               |   否 | 本地可用性覆盖。              |
| `score`      | `number`                                                |   否 | 本地 transport score 覆盖。   |
| `diagnostic` | [`NnrpDiagnostic`](./core#数据类型)                     |   否 | Provider 不可用或降级的原因。 |
| `binding`    | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 显式 native binding 覆盖。    |

### `NnrpQuicTransportProviderOptions`

与 [`NnrpTcpTransportProviderOptions`](#nnrptcptransportprovideroptions) 相同，但作用域是 QUIC。

### `NnrpWebSocketTransportProviderOptions`

| 字段         | 类型                                | 必填 | 说明                                     |
| ------------ | ----------------------------------- | ---: | ---------------------------------------- |
| `available`  | `boolean`                           |   否 | 本地可用性覆盖。                         |
| `score`      | `number`                            |   否 | 本地 transport score 覆盖。              |
| `diagnostic` | [`NnrpDiagnostic`](./core#数据类型) |   否 | Provider 不可用或降级的原因。            |
| `WebSocket`  | `typeof WebSocket`                  |   否 | 测试或非标准 browser host 的构造器覆盖。 |
