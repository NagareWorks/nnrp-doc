# Rust Quick Start

The Rust SDK is the canonical NNRP implementation. The Preview4 release exposes a transport-neutral
runtime, independent transport provider crates, runtime-control frames, object/cache metadata, FFI
artifacts for native SDKs, and browser WASM primitives.

## Install

For a native TCP client/server:

```bash
cargo add nnrp-core@1.0.0-preview.4.0 nnrp-runtime@1.0.0-preview.4.0 nnrp-transport-tcp@1.0.0-preview.4.0
cargo add tokio --features macros,rt-multi-thread,net,io-util
```

Add only the transport packages your application uses:

```bash
cargo add nnrp-transport-quic@1.0.0-preview.4.0
cargo add nnrp-transport-ipc@1.0.0-preview.4.0
cargo add nnrp-transport-websocket@1.0.0-preview.4.0
```

FFI and browser primitives are separate boundaries:

```bash
cargo add nnrp-ffi@1.0.0-preview.4.0
cargo add nnrp-wasm@1.0.0-preview.4.0
```

## Client

```rust
use nnrp_core::FrameSubmitMetadata;
use nnrp_runtime::{NnrpClient, NnrpClientConfig, RuntimeTransportKind};

let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
let mut session = client.open_session().await?;

let frame_id = session
    .submit(FrameSubmitMetadata::default(), b"hello".to_vec())
    .await?;

let result = session.await_result().await?;
assert_eq!(result.frame_id, frame_id);
session.close().await?;
```

Use [`await_event`](./api/client#nnrpclientsession-await-event) instead of `await_result` when the server can send progress,
partial results, backpressure, object/cache events, or result-drop reasons.

## Server

```rust
use nnrp_core::ResultPushMetadata;
use nnrp_runtime::{NnrpServer, NnrpServerConfig, RuntimeTransportKind};

let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Tcp);
let server = NnrpServer::bind_tcp("127.0.0.1:4433", config).await?;

let mut session = server.accept().await?;
let submit = session.receive_submit().await?;

session
    .send_result(
        submit.frame_id,
        ResultPushMetadata::default(),
        submit.body,
    )
    .await?;
session.close().await?;
```

## Transport Packages

Each transport package owns real transport behavior. Installing a package is not just a feature flag.

| Package | Use when | Runtime shape |
|---|---|---|
| `nnrp-transport-tcp` | Plain native TCP is enough | Connects/binds TCP framed transports |
| `nnrp-transport-quic` | You need QUIC streams, TLS, or better migration behavior | Connects/binds Quinn/Rustls transports |
| `nnrp-transport-ipc` | Client and server live on the same node | Uses Unix domain sockets or Windows named pipes |
| `nnrp-transport-websocket` | You need binary NNRP frames over WebSocket | Provides native Rust WebSocket transport |

Provider selection and probing are described in [Rust API Overview](./api#transport-provider-boundary).

## Next Pages

1. [Client API](./api/client) for session submission, control, object/cache events, and close semantics.
2. [Server API](./api/server) for accept loops, result/progress sending, control receive, and runtime feedback.
3. [Core Types](./api/core) for profiles, message types, metadata, and registries.
4. [FFI / Native](./api/ffi) and [WASM](./api/wasm) for downstream SDK packaging boundaries.
