# JavaScript/TypeScript Transport Provider API

Transport packages are real provider boundaries. Install the transport packages that the application
is allowed to use; runtime probing and policy selection choose the active path.

| Package                     | Host support                                                                                | Artifact ownership                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `@nnrp/transport-tcp`       | Node.js/Deno native hosts, plus browser/edge hosts with TCP-capable WASM transport bridges  | Full-platform native libraries, manifests, and WASM transport primitives. |
| `@nnrp/transport-quic`      | Node.js/Deno native hosts, plus browser/edge hosts with QUIC-capable WASM transport bridges | Full-platform native libraries, manifests, and WASM transport primitives. |
| `@nnrp/transport-websocket` | Browser/edge clients and backend hosts with a WebSocket implementation                      | WebSocket provider; no Rust native/WASM transport artifact.               |

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

Browsers do not expose raw operating-system TCP or QUIC sockets by default. The TCP and QUIC
packages still carry WASM transport primitives so browser/edge runtimes that provide the required
network bridge can use the same provider model instead of falling back to a JavaScript-only shim.
WebSocket is useful wherever a host WebSocket implementation is available, including browsers and
backend runtimes, but it is not the Rust-backed fast path.

## Artifact Boundary

| Package                     | Includes native `.dll` / `.so` / `.dylib` | Includes WASM transport primitives | Notes                                                                        |
| --------------------------- | ----------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `@nnrp/native-client`       | No                                        | No                                 | Client role only.                                                            |
| `@nnrp/native-server`       | No                                        | No                                 | Server role only.                                                            |
| `@nnrp/browser-client`      | No                                        | Browser runtime primitives         | Browser role only.                                                           |
| `@nnrp/transport-tcp`       | Yes                                       | Yes                                | TCP owns TCP artifacts for native and WASM-capable hosts.                    |
| `@nnrp/transport-quic`      | Yes                                       | Yes                                | QUIC owns QUIC artifacts for native and WASM-capable hosts.                  |
| `@nnrp/transport-websocket` | No                                        | No                                 | Host WebSocket provider; Rust does not expose WebSocket transport artifacts. |

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
