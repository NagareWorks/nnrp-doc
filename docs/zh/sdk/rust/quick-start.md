# Rust 快速上手

Rust SDK 是 NNRP 的 canonical 实现。Preview4 release 提供 transport-neutral runtime、独立
transport provider crate、运行时控制帧、对象/缓存 metadata、面向原生 SDK 的 FFI artifact，以及浏览器
WASM primitives。

## 安装

原生 TCP client/server：

```bash
cargo add nnrp-core@1.0.0-preview.4.4 nnrp-runtime@1.0.0-preview.4.4 nnrp-transport-tcp@1.0.0-preview.4.4
cargo add tokio --features macros,rt-multi-thread,net,io-util
```

按需增加 transport 包：

```bash
cargo add nnrp-transport-quic@1.0.0-preview.4.4
cargo add nnrp-transport-ipc@1.0.0-preview.4.4
cargo add nnrp-transport-websocket@1.0.0-preview.4.4
```

FFI 和浏览器 primitives 是单独边界：

```bash
cargo add nnrp-ffi@1.0.0-preview.4.4
cargo add nnrp-wasm@1.0.0-preview.4.4
```

## 客户端

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

如果服务端可能返回 progress、partial result、backpressure、object/cache event 或 result-drop reason，
使用 [`await_event`](./api/client#nnrpclientsession-await-event)，不要只用 `await_result`。

## 服务端

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

## Transport 包

每个 transport 包都拥有真实帧承载实现。安装一个包不是只打开配置开关。

| Package | 适用场景 | Runtime 形态 |
|---|---|---|
| `nnrp-transport-tcp` | 原生 TCP 足够 | TCP framed transport 的 connect/bind |
| `nnrp-transport-quic` | 需要 QUIC stream、TLS 或更好的迁移行为 | Quinn/Rustls transport 的 connect/bind |
| `nnrp-transport-ipc` | client 和 server 在同一节点 | Unix domain socket 或 Windows named pipe |
| `nnrp-transport-websocket` | 需要 WebSocket 上传输二进制 NNRP frame | 原生 Rust WebSocket transport |

Provider 选择和 probe 见 [Rust API 概览](./api#transport-provider-boundary)。

## 下一步

1. [客户端 API](./api/client)：session submit、控制帧、object/cache event、关闭语义。
2. [服务端 API](./api/server)：accept loop、result/progress、control receive、runtime feedback。
3. [核心类型](./api/core)：profiles、message types、metadata、registries。
4. [FFI / 原生接口](./api/ffi) 和 [WASM](./api/wasm)：下游 SDK 的打包边界。
