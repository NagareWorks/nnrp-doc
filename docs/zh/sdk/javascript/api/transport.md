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

| 层级                   | 形式                                                         | 用途                                                                  |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| 应用 endpoint          | `nnrp://`、`nnrps://`                                        | 常规 client/server 配置与 Provider 选择。                             |
| Provider-local locator | TCP/QUIC host-port、`unix://`、`npipe://`、`ws://`、`wss://` | 一致性测试 fixture、诊断或显式 client/server Provider endpoint 覆盖。 |

Role 包在 Provider 选择完成后解析应用 endpoint。仅仅因为换了 transport 包，SDK 不得要求用户把
`nnrp://` 改成 carrier-specific scheme。TCP 与 QUIC 使用应用 endpoint 的 authority，未提供端口时
默认使用 `4433`。Client 与 server 都使用按 transport kind 索引的 provider route set。IPC 必须提供
`unix://` 或 `npipe://`；WebSocket 必须提供 `ws://` 或 `wss://`。显式 locator 与其 carrier 不匹配时
必须拒绝。

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

### 角色 Runtime 接管

provider 选择是角色连接生命周期的一部分，不是只做 capability 检查。`openNativeClient` 和 native
server runtime 会选择 provider，通过该 provider 的 transport-scoped Rust library 打开 carrier，再把
carrier 移交给同一个 library 内的角色 runtime。此后 session handshake、submit/result、control
frame、 object/cache frame、event read 与 shutdown 都实际经过该 carrier。

移交 handle 只在 provider 包与角色包内部使用。应用只拿到 typed client、session、server 与 event；
不会拿到 raw native handle，也不需要实现 packet pump。若某 provider 的 `connect`/`listen` 可用，但其
carrier 无法被角色 runtime 接管，则它不能用于 `openNativeClient` 或 native server，并且必须在
capability validation 阶段失败。

直接调用 `provider.connect()` / `provider.listen()` 仍用于诊断、conformance 与自定义 packet-level
integration。它们不能只给逻辑角色 session 当开关，本地 result echo 也不是生产 fallback。

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

| 字段             | 类型                                | 必填 | 说明                                      |
| ---------------- | ----------------------------------- | ---: | ----------------------------------------- |
| `available`      | `boolean`                           |   否 | 测试与部署策略使用的受控可用性覆盖。      |
| `cost`           | `NnrpTransportProviderCost`         |   否 | 与 artifact 原始值并存的部署成本覆盖。    |
| `preferenceRank` | `number`                            |   否 | 部署偏好覆盖；值越小越优先。              |
| `maxFrameBytes`  | `bigint`                            |   否 | 只能降低、不能提高 artifact frame limit。 |
| `diagnostic`     | [`NnrpDiagnostic`](./core#数据类型) |   否 | 不可用或降级诊断。                        |
| `binding`        | `NnrpNativeTransportBinding`        |   否 | 受控部署与测试使用的 transport binding。  |

每个 provider 都公开已校验的 `NnrpTransportProviderMetadata`。多 provider 选择返回有序
`NnrpTransportCandidate` 诊断并使用公共 comparator；provider 包不得注入私有 score。

`NnrpWebSocketTransportProviderOptions` 额外接受 `WebSocket?: typeof WebSocket`，用于覆盖
browser/edge 构造器。`NnrpIpcTransportProviderOptions` 只为受控测试接受
`platform?: "unix" | "windows"`；正常选择使用宿主平台。

### `NnrpNativeTransportBinding`

未提供 `binding` 时，transport 包加载自己持有的 transport-scoped Rust artifact。该 override 由
`@nnrp/core` 导出，使测试和托管 native loader 无需依赖 role 包也能提供相同语义。

| 属性      | 类型                                                                         | 必填 | 说明                                                                       |
| --------- | ---------------------------------------------------------------------------- | ---: | -------------------------------------------------------------------------- |
| `mode`    | `"deno-ffi" \| "node-addon" \| "managed-ffi" \| "test"`                      |   是 | Binding 实现标签。                                                         |
| `probe`   | `(options: NnrpTransportProbeOptions) => Promise<NnrpTransportProbeMetrics>` |   是 | 通过所选 carrier 执行协议 `TRANSPORT_PROBE` / `TRANSPORT_PROBE_ACK` 样本。 |
| `connect` | `(options: NnrpTransportEndpoint) => Promise<NnrpTransportConnection>`       |   是 | 建立由 Rust 持有的 framed connection。                                     |
| `listen`  | `(options: NnrpTransportEndpoint) => Promise<NnrpTransportServer>`           |   是 | 建立由 Rust 持有的 framed listener。                                       |

`NnrpTransportEndpoint` 冻结一条 carrier-local `endpoint: string | URL`、可选 `maxPacketBytes: bigint`、可选
`timeoutMillis: number` 和可选 `security: NnrpTransportSecurity`。零值或省略时分别使用 64 MiB 与 30
秒。`NnrpTransportSecurity` 只能是以下两种之一：

```ts
interface NnrpTransportClientSecurity {
  readonly mode: "client";
  readonly serverName: string;
  readonly trustedCertificateDer: Uint8Array;
}

interface NnrpTransportServerSecurity {
  readonly mode: "server";
  readonly certificateDer: Uint8Array;
  readonly privateKeyPkcs8Der: Uint8Array;
}

type NnrpTransportSecurity = NnrpTransportClientSecurity | NnrpTransportServerSecurity;
```

为 TCP 提供匹配的 security variant 会启用 TLS。明文 TCP、IPC 与 `ws://` 拒绝 security；QUIC 与 native
`wss://` 必须使用对应的 client/server variant，并且不得暗中关闭证书校验。

高层 native role API 把 security 放进对应 provider route：client route 只接受
`NnrpTransportClientSecurity`，server route 只接受 `NnrpTransportServerSecurity`。Preview4 不提供
role-wide `security`。

浏览器 route 是凭据所有权的唯一例外：浏览器 `wss://` 使用平台 TLS 校验并拒绝 native DER 凭据字段；应用
endpoint 为 `nnrps://` 时仍必须使用 WSS。

`NnrpTransportProbeOptions` 扩展 `NnrpTransportEndpoint`，增加可选的 `sampleCount`、 `payloadBytes`
和 `timeoutMillis`。默认值分别为 3 次、32 KiB 和 30 秒。部署策略可以降低这些值， 但 Provider
不得在没有 peer acknowledgement 的情况下伪造成功指标。

`NnrpTransportConnection.send(packets)` 接受 `Uint8Array | readonly Uint8Array[]` 并保持 batch
顺序。 `receive(options?)` 返回 `readonly Uint8Array[]`；`options` 可设置 `maxPackets`、`maxBytes`
与 `timeoutMillis`，默认值分别为 16、64 MiB 与 30 秒。`NnrpTransportServer.accept(options?)`
返回一条 connection，并接受相同的 timeout 字段。Connection 暴露 `kind`、规范化 `endpoint` 和
`connected`； server 暴露 `kind`、规范化 `endpoint` 和 `listening`。

Connection 只发送和接收完整 NNRP packet。Socket chunk、残缺 header 和 native transport library
handle 都不是公开 JavaScript API。Connection 与 listener 的关闭操作幂等；关闭后继续使用必须以 typed
transport diagnostic 拒绝。

## Provider Routes

```ts
interface NnrpClientProviderRoute {
  readonly endpoint?: string | URL;
  readonly security?: NnrpTransportClientSecurity;
}

interface NnrpServerProviderRoute {
  readonly endpoint?: string | URL;
  readonly security?: NnrpTransportServerSecurity;
}

type NnrpClientProviderRoutes = Readonly<
  Partial<Record<NnrpTransportKind, NnrpClientProviderRoute>>
>;

type NnrpServerProviderRoutes = Readonly<
  Partial<Record<NnrpTransportKind, NnrpServerProviderRoute>>
>;
```

已安装 provider 即使无法解析 route 也必须出现在诊断中。Client Auto/Prefer 报告无法解析的 candidate，
并继续选择可用 route；server Auto/Prefer 要求每个允许的已安装 provider 都有可解析 route，并原子打开
完整 listener set。Force 绝不回退。

未知 route key 属于无效配置。为已知但未安装的 transport 提供 route 时，必须产生
`local-unavailable` candidate。多个条件同时失败时使用协议定义的精确 registry 顺序，因此
`route-unresolved` 优先于 `security-unsatisfied`。

## Connect 与 Listen 选项

Client connect 选项冻结以下 endpoint 字段：

| 字段               | 类型                               | 必填 | 说明                                               |
| ------------------ | ---------------------------------- | ---: | -------------------------------------------------- |
| `endpoint`         | `string \| URL`                    |   是 | 用户侧 `nnrp://` 或 `nnrps://` endpoint。          |
| `providerRoutes`   | `NnrpClientProviderRoutes`         |   否 | 按 carrier 隔离的 locator 与对端安全配置。          |
| `transportPolicy`  | `NnrpTransportPolicy`              |   否 | 默认为 `auto`。                                    |
| `transports`       | `readonly NnrpTransportProvider[]` |   否 | 当前 role 实例已安装的 Provider。                  |

Server listen 选项使用 `providerRoutes: NnrpServerProviderRoutes`。因此一个逻辑 server listener 可以为
每个 eligible carrier 持有独立 bind locator 和 security，同时不把 carrier-specific scheme 暴露为应用
endpoint。

WebSocket text message 是协议错误。NNRP 数据帧与控制帧只使用 WebSocket binary message。
