# Rust Quick Start

The Preview3 Rust runtime can complete a minimal client/server session over TCP: the client connects, opens a session, submits a frame, and awaits a result; the server listens, accepts, receives submit, and sends result.

## Dependencies

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3"
nnrp-runtime = "1.0.0-preview.3"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## Minimal Client

```rust
use nnrp_core::FrameSubmitMetadata;
use nnrp_runtime::{NnrpClient, NnrpClientConfig, RuntimeTransportKind};

let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
let mut session = client.open_session().await?;

let frame_id = session
    .submit(FrameSubmitMetadata::default(), b"input".to_vec())
    .await?;
let result = session.await_result().await?;
assert_eq!(result.frame_id, frame_id);

session.close().await?;
```

## Minimal Server

```rust
use nnrp_core::ResultPushMetadata;
use nnrp_runtime::{NnrpServer, NnrpServerConfig, RuntimeTransportKind};

let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Tcp);
let server = NnrpServer::bind_tcp("127.0.0.1:4433", config).await?;

let mut session = server.accept().await?;
let submit = session.receive_submit().await?;
session
    .send_result(submit.frame_id, ResultPushMetadata::default(), b"output".to_vec())
    .await?;

let close = session.receive_close().await?;
session.ack_close(&close).await?;
session.close().await?;
```

## Current Limits

1. The Preview3 Rust runtime ships TCP built in; QUIC plugs in through external `FramedTransport` / `FramedListener` providers.
2. `submit` and `submit_nowait` both send `FRAME_SUBMIT` and return the assigned `frame_id`; call `await_result` or `await_event` to consume server output.
3. The FFI layer provides a handle/event ABI for bindings. Rust application code should prefer `nnrp-runtime` directly.
