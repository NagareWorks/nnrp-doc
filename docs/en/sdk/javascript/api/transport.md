# JavaScript/TypeScript Transport Provider API

Transport packages are real provider boundaries. Install the transport packages that the application
is allowed to use; runtime probing and policy selection choose the active path.

| Package                     | Host support                                                                | Artifact ownership                                           |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@nnrp/transport-tcp`       | Node.js/Deno native hosts                                                   | Native TCP provider behavior and packaged artifacts.         |
| `@nnrp/transport-quic`      | Node.js/Deno native hosts                                                   | Native QUIC provider behavior and packaged artifacts.        |
| `@nnrp/transport-websocket` | Browser/edge clients with a WebSocket implementation; client-side only path | WebSocket provider; no Rust native or browser WASM artifact. |

## `createTcpTransportProvider`

Creates a TCP transport provider.

| Parameter | Type                                                                  | Required | Description                                                            |
| --------- | --------------------------------------------------------------------- | -------: | ---------------------------------------------------------------------- |
| `options` | [`NnrpTcpTransportProviderOptions`](#nnrptcptransportprovideroptions) |       No | Availability, score, diagnostic override, and optional native binding. |

| Returns                    |
| -------------------------- |
| `NnrpTcpTransportProvider` |

```ts
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const tcp = createTcpTransportProvider({ score: 70 });
```

## `createQuicTransportProvider`

Creates a QUIC transport provider.

| Parameter | Type                                                                    | Required | Description                                                            |
| --------- | ----------------------------------------------------------------------- | -------: | ---------------------------------------------------------------------- |
| `options` | [`NnrpQuicTransportProviderOptions`](#nnrpquictransportprovideroptions) |       No | Availability, score, diagnostic override, and optional native binding. |

| Returns                     |
| --------------------------- |
| `NnrpQuicTransportProvider` |

```ts
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const quic = createQuicTransportProvider({ score: 90 });
```

## `createWebSocketTransportProvider`

Creates a WebSocket transport provider. It uses the host's WebSocket implementation instead of a
Rust transport artifact.

| Parameter | Type                                                                              | Required | Description                                                                     |
| --------- | --------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------- |
| `options` | [`NnrpWebSocketTransportProviderOptions`](#nnrpwebsockettransportprovideroptions) |       No | Availability, score, diagnostic override, and optional `WebSocket` constructor. |

| Returns                          |
| -------------------------------- |
| `NnrpWebSocketTransportProvider` |

```ts
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const websocket = createWebSocketTransportProvider();
```

## Provider Selection

Role packages receive providers explicitly:

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

If several providers are installed and passed in, the runtime probes them and applies the transport
policy. A provider package is not just a configuration switch; it owns the behavior and artifacts
for its transport.

Browsers do not expose raw operating-system TCP or QUIC sockets. The current browser client accepts
the WebSocket provider. TCP and QUIC providers are native host providers; WebSocket is a client-side
provider and does not expose a server listener in this SDK.

## Artifact Boundary

| Package                     | Includes native `.dll` / `.so` / `.dylib` | Includes browser WASM primitives | Notes                                                                        |
| --------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| `@nnrp/native-client`       | No                                        | No                               | Client role only.                                                            |
| `@nnrp/native-server`       | No                                        | No                               | Server role only.                                                            |
| `@nnrp/browser-client`      | No                                        | Browser runtime primitives       | Browser role only.                                                           |
| `@nnrp/transport-tcp`       | Yes                                       | No                               | TCP owns TCP artifacts for native hosts.                                     |
| `@nnrp/transport-quic`      | Yes                                       | No                               | QUIC owns QUIC artifacts for native hosts.                                   |
| `@nnrp/transport-websocket` | No                                        | No                               | Host WebSocket provider; Rust does not expose WebSocket transport artifacts. |

## Option Types

### `NnrpTcpTransportProviderOptions`

| Field        | Type                                                    | Required | Description                                        |
| ------------ | ------------------------------------------------------- | -------: | -------------------------------------------------- |
| `available`  | `boolean`                                               |       No | Local availability override.                       |
| `score`      | `number`                                                |       No | Local transport score override.                    |
| `diagnostic` | [`NnrpDiagnostic`](./core#data-types)                   |       No | Reason for unavailable or degraded provider state. |
| `binding`    | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding override.                  |

### `NnrpQuicTransportProviderOptions`

Same shape as [`NnrpTcpTransportProviderOptions`](#nnrptcptransportprovideroptions), scoped to QUIC.

### `NnrpWebSocketTransportProviderOptions`

| Field        | Type                                  | Required | Description                                                   |
| ------------ | ------------------------------------- | -------: | ------------------------------------------------------------- |
| `available`  | `boolean`                             |       No | Local availability override.                                  |
| `score`      | `number`                              |       No | Local transport score override.                               |
| `diagnostic` | [`NnrpDiagnostic`](./core#data-types) |       No | Reason for unavailable or degraded provider state.            |
| `WebSocket`  | `typeof WebSocket`                    |       No | Constructor override for tests or non-standard browser hosts. |
