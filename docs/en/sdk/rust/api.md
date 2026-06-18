# Rust API Overview

This page is the map. The detailed method tables live on the client, server, core, FFI, and WASM
pages so users can start from the workflow they are implementing instead of reading a flat list of
all Rust symbols.

## Release

| Item | Value |
|---|---|
| NNRP protocol line | NNRP/1 Preview4 |
| Rust package version | `1.0.0-preview.4.0` |
| Minimum Rust version | `1.82` |
| GitHub release asset tag | `v1.0.0-preview.4.0` |

## API Areas

| Area | Package | What it owns | Page |
|---|---|---|---|
| Core protocol model | `nnrp-core` | Wire codecs, metadata, profiles, runtime-control, object/cache, validation | [Core Types](./api/core) |
| Client runtime | `nnrp-runtime` | Connect, open session, submit, receive events, control requests, close | [Client API](./api/client) |
| Server runtime | `nnrp-runtime` | Bind, accept, receive submit/control, send result/progress/object/cache events | [Server API](./api/server) |
| Transport providers | `nnrp-transport-provider`, `nnrp-transport-*` | Registry, probe policy, and concrete TCP/QUIC/IPC/WebSocket transports | [Transport Provider Boundary](#transport-provider-boundary) |
| Native ABI | `nnrp-ffi` | C ABI, handle/event model, native artifact manifests | [FFI / Native](./api/ffi) |
| Browser primitives | `nnrp-wasm` | WASM protocol helpers, browser binary-frame helpers, `.d.ts` output | [WASM](./api/wasm) |

## Cargo

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.0"
nnrp-runtime = "1.0.0-preview.4.0"
nnrp-transport-provider = "1.0.0-preview.4.0"
nnrp-transport-tcp = "1.0.0-preview.4.0"
nnrp-transport-quic = "1.0.0-preview.4.0"
nnrp-transport-ipc = "1.0.0-preview.4.0"
nnrp-transport-websocket = "1.0.0-preview.4.0"

# Optional downstream surfaces
nnrp-ffi = "1.0.0-preview.4.0"
nnrp-wasm = "1.0.0-preview.4.0"
nnrp-conformance = "1.0.0-preview.4.0"
```

## Transport Provider Boundary

The runtime sees transports through framed transport traits. In the Rust SDK, "transport" follows the NNRP
definition: a frame-carrier boundary below the NNRP wire protocol, not an OSI-layer claim. Concrete carrier behavior
belongs to provider packages.

| Package | Owns | Native / WASM artifact boundary |
|---|---|---|
| `nnrp-transport-tcp` | TCP connect/bind and TCP probe identity | Native FFI transport artifacts are published as TCP-scoped release zips |
| `nnrp-transport-quic` | Quinn/Rustls QUIC connect/bind and QUIC probe identity | Native FFI transport artifacts are published as QUIC-scoped release zips |
| `nnrp-transport-ipc` | Local IPC endpoints: Unix domain sockets and Windows named pipes | Native FFI transport artifacts are published as IPC-scoped release zips |
| `nnrp-transport-websocket` | Native Rust WebSocket binary-frame carrier | Native FFI transport artifacts are published as WebSocket-scoped release zips |
| `nnrp-wasm` | Browser WASM primitives and browser binary-frame helpers | Browser artifact is `nnrp-wasm-browser-1.0.0-preview.4.0.zip` |

Role packages such as client/server runtimes do not hide carrier implementations. Install the transport package that
owns the behavior you need, then let provider policy select among registered providers when multiple carriers are
available.

## Runtime Control And Object/Cache Frames

Preview4 adds compact control-plane events used by scheduling, cancellation, progress, partial
results, backpressure, capability negotiation, route hints, cache references, and trace context. The
wire definitions are documented under [Runtime Control Profiles](/en/profiles/runtime-control/).
Rust exposes them through client events, server send/receive helpers, and core metadata types.

## Artifact Naming

| Artifact family | Example |
|---|---|
| Native transport FFI | `nnrp-ffi-transport-tcp-native-linux-x86_64-1.0.0-preview.4.0.zip` |
| Native QUIC FFI | `nnrp-ffi-transport-quic-native-windows-x86_64-1.0.0-preview.4.0.zip` |
| Browser WASM | `nnrp-wasm-browser-1.0.0-preview.4.0.zip` |
| Checksums | `SHA256SUMS` |

Downstream SDKs should validate the artifact manifest before loading native libraries or WASM files.
