# JavaScript/TypeScript 载体 Provider API

NNRP 把这层称为**载体 Provider**。即使底层载体本身是 WebSocket 这样的应用层协议，它在 NNRP
帧和会话模型中仍位于下层。Transport 包是真正的 Provider 边界：应用只安装允许使用的载体，role
包只在这些已安装 Provider 中选择。

## 包与产物边界

| 包                          | 宿主                       | 自有实现与产物                                                                                                     |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@nnrp/transport-tcp`       | Node.js/Deno               | TCP Provider 与当前平台的 Rust TCP 动态库。                                                                        |
| `@nnrp/transport-quic`      | Node.js/Deno               | QUIC Provider 与当前平台的 Rust QUIC 动态库。                                                                      |
| `@nnrp/transport-ipc`       | Node.js/Deno               | IPC Provider 与当前平台的 Rust IPC 动态库。                                                                        |
| `@nnrp/transport-websocket` | Node.js/Deno、browser/edge | Native 宿主使用 Rust WebSocket 动态库；浏览器使用宿主 `WebSocket` I/O 和 `@nnrp/browser-client` 提供的运行时原语。 |
| `@nnrp/browser-client`      | Browser/edge               | `nnrp-wasm-browser` 运行时产物，包含浏览器安全的 NNRP framing、控制/对象 codec 与 WebSocket carrier slot。         |

`@nnrp/native-client` 和 `@nnrp/native-server` 不打包 transport 动态库。TCP、QUIC、IPC 不打包
browser WASM。`@nnrp/transport-websocket` 不复制 `@nnrp/browser-client` 所拥有的 browser WASM。

## 两层端点

不管最终选择哪个载体，应用配置始终使用统一的 NNRP endpoint：

```ts
const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  transportPolicy: "auto",
  transports: [websocket, quic, tcp],
});
```

| 层级                   | 形式                                                         | 用途                                                     |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 应用 endpoint          | `nnrp://`、`nnrps://`                                        | 常规 client/server 配置与 Provider 选择。                |
| Provider-local locator | TCP/QUIC host-port、`unix://`、`npipe://`、`ws://`、`wss://` | 一致性测试 fixture、诊断或显式 `providerEndpoint` 覆盖。 |

Role 包在 Provider 选择完成后解析应用 endpoint。仅仅因为换了 transport 包，SDK 不得要求用户把
`nnrp://` 改成 carrier-specific scheme。 TCP 与 QUIC 使用应用 endpoint 的
authority，未提供端口时默认使用 `4433`。IPC 必须通过 `providerEndpoint` 提供 `unix://` 或
`npipe://`；WebSocket 必须提供 `ws://` 或 `wss://`。当显式 locator 与最终选择的 carrier
不匹配时必须拒绝连接。

## Provider Factory

| Factory                                      | 包                          | 返回值                           |
| -------------------------------------------- | --------------------------- | -------------------------------- |
| `createTcpTransportProvider(options?)`       | `@nnrp/transport-tcp`       | `NnrpTcpTransportProvider`       |
| `createQuicTransportProvider(options?)`      | `@nnrp/transport-quic`      | `NnrpQuicTransportProvider`      |
| `createIpcTransportProvider(options?)`       | `@nnrp/transport-ipc`       | `NnrpIpcTransportProvider`       |
| `createWebSocketTransportProvider(options?)` | `@nnrp/transport-websocket` | `NnrpWebSocketTransportProvider` |

所有 native Provider 都实现 `probe`、`connect` 和 `listen`。Browser WebSocket Provider 实现 `probe`
和 `connect`；浏览器包不暴露 server listener。

```ts
import { createIpcTransportProvider } from "@nnrp/transport-ipc";
import { createQuicTransportProvider } from "@nnrp/transport-quic";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const ipc = createIpcTransportProvider();
const quic = createQuicTransportProvider();
const tcp = createTcpTransportProvider();
const websocket = createWebSocketTransportProvider();
```

## Provider 选择

`NnrpTransportKind` 精确固定为 `"tcp" | "quic" | "ipc" | "websocket"`。 `NnrpTransportPolicy`
精确固定为：

```ts
type NnrpTransportPolicy =
  | "auto"
  | "prefer-quic"
  | "prefer-tcp"
  | "prefer-ipc"
  | "prefer-websocket"
  | "force-quic"
  | "force-tcp"
  | "force-ipc"
  | "force-websocket";
```

只有一个 Provider 时直接选择。存在两个或更多 Provider 时，按照策略、实测路径质量、成本、偏好和限制
进行 probe 与排序。强制策略对应的 Provider 未安装或不可用时必须失败，不能暗中回退到未安装的包。

## 公共 Provider 选项

TCP、QUIC、IPC 与 native WebSocket Provider 共享以下字段：

| 字段         | 类型                                                    | 必填 | 说明                                  |
| ------------ | ------------------------------------------------------- | ---: | ------------------------------------- |
| `available`  | `boolean`                                               |   否 | 测试与部署策略使用的受控可用性覆盖。  |
| `score`      | `number`                                                |   否 | 能力过滤后的本地分数调整。            |
| `diagnostic` | [`NnrpDiagnostic`](./core#数据类型)                     |   否 | 不可用或降级诊断。                    |
| `binding`    | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控部署与测试使用的 native binding。 |

`NnrpWebSocketTransportProviderOptions` 额外接受 `WebSocket?: typeof WebSocket`，用于覆盖
browser/edge 构造器。`NnrpIpcTransportProviderOptions` 只为受控测试接受
`platform?: "unix" | "windows"`；正常选择使用宿主平台。

## Connect 与 Listen 选项

Role 包的 connect/listen 选项固定以下 endpoint 字段：

| 字段               | 类型                               | 必填 | 说明                              |
| ------------------ | ---------------------------------- | ---: | --------------------------------- |
| `endpoint`         | `string                            | URL` | 是                                |
| `providerEndpoint` | `string                            | URL` | 否                                |
| `transportPolicy`  | `NnrpTransportPolicy`              |   否 | 默认为 `auto`。                   |
| `transports`       | `readonly NnrpTransportProvider[]` |   否 | 当前 role 实例已安装的 Provider。 |

WebSocket text message 是协议错误。NNRP 数据帧与控制帧只使用 WebSocket binary message。
