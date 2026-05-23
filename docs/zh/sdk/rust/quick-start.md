# Rust 快速使用

Rust SDK 的 Preview3 runtime 已经可以在 TCP 和默认 QUIC provider 上完成最小 client/server 会话：客户端连接、打开 session、提交 frame、等待结果；服务端监听、accept、接收 submit、返回 result。

## 依赖

常用 Rust client/server runtime 加 TCP transport：

```bash
cargo add nnrp-core@1.0.0-preview.3.1 nnrp-runtime@1.0.0-preview.3.1 nnrp-transport-tcp@1.0.0-preview.3.1
cargo add tokio --features macros,rt-multi-thread,net,io-util,time
```

需要 QUIC、FFI 或 WASM primitive 时再追加对应包：

```bash
cargo add nnrp-transport-quic@1.0.0-preview.3.1
cargo add nnrp-transport-provider@1.0.0-preview.3.1
cargo add nnrp-ffi@1.0.0-preview.3.1
cargo add nnrp-wasm@1.0.0-preview.3.1
```

等价的 `Cargo.toml` 写法：

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3.1"
nnrp-runtime = "1.0.0-preview.3.1"
nnrp-transport-tcp = "1.0.0-preview.3.1"
nnrp-transport-quic = "1.0.0-preview.3.1"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## 客户端最短路径

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

## 服务端最短路径

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

## 当前限制

1. Preview3 Rust runtime 内置 TCP；默认 QUIC 路径由 `nnrp-transport-quic` 的 Quinn/Rustls provider 提供，同时保留 `FramedTransport` / `FramedListener` 插槽接入外部 provider。
2. `submit` 与 `submit_nowait` 当前都会发送 `FRAME_SUBMIT` 并返回 `frame_id`；如果要消费结果，需要随后调用 `await_result` 或 `await_event`。
3. FFI 层提供 handle/event ABI，适合绑定层接入；Rust 业务代码优先直接使用 `nnrp-runtime`。
