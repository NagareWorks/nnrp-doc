# JavaScript/TypeScript Transport Provider API

NNRP calls this boundary a **carrier provider**. It is below the NNRP frame/session model, even when
the carrier itself is an application protocol such as WebSocket. Transport packages are real
provider boundaries: install only the carriers the application is allowed to use, and let the role
package select among those providers.

## Package And Artifact Boundary

| Package                     | Host support                  | Owned implementation and artifacts                                                                                                                       |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nnrp/transport-tcp`       | Node.js/Deno                  | TCP provider plus the platform-specific Rust TCP library.                                                                                                |
| `@nnrp/transport-quic`      | Node.js/Deno                  | QUIC provider plus the platform-specific Rust QUIC library.                                                                                              |
| `@nnrp/transport-ipc`       | Node.js/Deno                  | IPC provider plus the platform-specific Rust IPC library.                                                                                                |
| `@nnrp/transport-websocket` | Node.js/Deno and browser/edge | Native hosts use the Rust WebSocket library. Browsers use the host `WebSocket` I/O object and the runtime primitives supplied by `@nnrp/browser-client`. |
| `@nnrp/browser-client`      | Browser/edge                  | The `nnrp-wasm-browser` runtime artifact. It contains browser-safe NNRP framing, control/object codecs, and the WebSocket carrier slot.                  |

`@nnrp/native-client` and `@nnrp/native-server` never package transport libraries. TCP, QUIC, and
IPC never package browser WASM. `@nnrp/transport-websocket` never duplicates the browser WASM owned
by `@nnrp/browser-client`.

## Endpoint Layers

Application configuration uses one NNRP endpoint regardless of the selected carrier:

```ts
const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  transportPolicy: "auto",
  transports: [websocket, quic, tcp],
});
```

| Endpoint layer         | Accepted forms                                               | Purpose                                                                        |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Application endpoint   | `nnrp://`, `nnrps://`                                        | Normal client/server configuration and provider selection.                     |
| Provider-local locator | TCP/QUIC host-port, `unix://`, `npipe://`, `ws://`, `wss://` | Conformance fixtures, diagnostics, or an explicit `providerEndpoint` override. |

Role packages resolve an application endpoint after provider selection. They must not require users
to replace `nnrp://` with a carrier-specific scheme merely because a different package was selected.
TCP and QUIC use the application authority and default to port `4433` when no port is present. IPC
requires `unix://` or `npipe://`; WebSocket requires `ws://` or `wss://` through `providerEndpoint`.
An explicit locator for one carrier is rejected when another carrier is selected.

## Provider Factories

| Factory                                      | Package                     | Returns                          |
| -------------------------------------------- | --------------------------- | -------------------------------- |
| `createTcpTransportProvider(options?)`       | `@nnrp/transport-tcp`       | `NnrpTcpTransportProvider`       |
| `createQuicTransportProvider(options?)`      | `@nnrp/transport-quic`      | `NnrpQuicTransportProvider`      |
| `createIpcTransportProvider(options?)`       | `@nnrp/transport-ipc`       | `NnrpIpcTransportProvider`       |
| `createWebSocketTransportProvider(options?)` | `@nnrp/transport-websocket` | `NnrpWebSocketTransportProvider` |

Every native provider implements `probe`, `connect`, and `listen`. The browser WebSocket provider
implements `probe` and `connect`; browser packages do not expose a server listener.

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

## Provider Selection

`NnrpTransportKind` is exactly `"tcp" | "quic" | "ipc" | "websocket"`. `NnrpTransportPolicy` is
exactly:

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

One provider is selected directly. Two or more providers are probed and ranked by policy, measured
path quality, provider cost, preference, and limits. A forced policy fails when that provider is not
installed or unavailable; it never falls back to an uninstalled package.

## Shared Provider Options

TCP, QUIC, IPC, and native WebSocket provider options share these fields:

| Field        | Type                                                    | Required | Description                                                       |
| ------------ | ------------------------------------------------------- | -------: | ----------------------------------------------------------------- |
| `available`  | `boolean`                                               |       No | Controlled availability override for tests and deployment policy. |
| `cost`       | `NnrpTransportProviderCost`                             |       No | Deployment cost override retained beside artifact metadata.       |
| `preferenceRank` | `number`                                            |       No | Deployment preference override; lower values are preferred.       |
| `maxFrameBytes` | `bigint`                                             |       No | May lower, but never increase, the artifact frame limit.           |
| `diagnostic` | [`NnrpDiagnostic`](./core#data-types)                   |       No | Typed unavailable/degraded diagnostic.                            |
| `binding`    | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled deployments and tests.     |

Every provider exposes its validated `NnrpTransportProviderMetadata`. Multi-provider selection returns ordered
`NnrpTransportCandidate` diagnostics and uses the common comparator; provider packages must not inject a private score.

`NnrpWebSocketTransportProviderOptions` additionally accepts `WebSocket?: typeof WebSocket` for a
browser/edge constructor override. `NnrpIpcTransportProviderOptions` accepts
`platform?: "unix" | "windows"` only as a controlled test override; normal selection uses the host
platform.

## Connection And Listen Options

Role-package connect/listen options freeze these endpoint fields:

| Field              | Type                               | Required | Description                                 |
| ------------------ | ---------------------------------- | -------: | ------------------------------------------- |
| `endpoint`         | `string                            |     URL` | Yes                                         |
| `providerEndpoint` | `string                            |     URL` | No                                          |
| `transportPolicy`  | `NnrpTransportPolicy`              |       No | Defaults to `auto`.                         |
| `transports`       | `readonly NnrpTransportProvider[]` |       No | Providers installed for this role instance. |

Text WebSocket messages are protocol errors. NNRP data and control frames use WebSocket binary
messages only.
