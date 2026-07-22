# JavaScript/TypeScript Native Runtime 说明

Native backend host 使用 role package：

| 角色   | 包                    | 主 API                 |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP、QUIC、IPC 与 WebSocket 不隐藏在 role package 里。请为允许参与选择的载体安装对应的
`@nnrp/transport-*` package。

每个 role manifest 只声明自己的 session 能力：`@nnrp/native-client` 声明 `client.session`，
`@nnrp/native-server` 声明 `server.session`。Transport 列表来自已安装 provider；role package 不声明
`native.loader`，也不会从通用 runtime library 推断可用载体。

## Native FFI Binding

Role package 接受显式 FFI binding 以支持受控集成和测试。打包的 transport artifact 由对应的 transport
package 拥有。

Role binding 与 transport binding 是两个独立契约。`NnrpNativeFfiBinding` 在 carrier 完成选择后持有
client 或 server runtime 操作。Carrier 包使用
[`NnrpNativeTransportBinding`](./transport#nnrpnativetransportbinding) 完成 endpoint probe 以及 framed
connection/listener 生命周期。Role binding 不得冒充 transport binding；transport 包缺失 Rust artifact 时，
不得暗中回退到 JavaScript socket 实现。

### Client `NnrpNativeFfiBinding`

| 属性                  | 类型                                                                | 必填 | 说明                                           |
| --------------------- | ------------------------------------------------------------------- | ---: | ---------------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "deno-ffi" \| "nano-ffi" \| "test"` |   否 | Binding 实现标签。                             |
| `runtimeCapabilities` | function                                                            |   否 | 返回 native runtime capability probe。         |
| `validateSubmit`      | function                                                            |   否 | 在 ABI 边界校验并规范化 submit。                |
| `submitResultCompact` | function                                                            |   否 | 粗粒度 submit/result hot path。                |
| `submitNoWait`        | function                                                            |   否 | 粗粒度 no-wait submit path。                   |
| `sendRuntimeFrame`    | function                                                            |   否 | 粗粒度 Preview4 控制/对象/缓存 frame 路径。     |
| `patchSession`        | function                                                            |   否 | 粗粒度 session patch 路径。                    |
| `awaitEvents`         | function                                                            |   否 | 粗粒度 batch event polling 路径。              |
| `close`               | function                                                            |   否 | Binding cleanup hook。                         |

Cancel 与 abort 是通过 `sendRuntimeFrame` 发送的协议帧，不是独立 FFI 方法。发布的 role package 不暴露
package-owned 的 Deno 直连 loader 或 self-echo benchmark binding。生产调用必须经过已选择 transport
package 的 client/server role carrier；显式 `NnrpNativeFfiBinding` 只用于受控集成与测试。

### Server `NnrpNativeFfiBinding`

| 属性                  | 类型                                                                | 必填 | 说明                                           |
| --------------------- | ------------------------------------------------------------------- | ---: | ---------------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "deno-ffi" \| "nano-ffi" \| "test"` |   否 | Binding 实现标签。                             |
| `runtimeCapabilities` | function                                                            |   否 | 返回 native runtime capability probe。         |
| `sendRuntimeFrame`    | function                                                            |   否 | 粗粒度 Preview4 控制/对象/缓存 frame 路径。     |
| `accept`              | function                                                            |   否 | 接受 server session。                          |
| `receive`             | function                                                            |   否 | 接收下一个 typed server event。                |
| `close`               | function                                                            |   否 | Binding cleanup hook。                         |

## Artifact 边界

| 包                          | Native artifact 归属                  |
| --------------------------- | ------------------------------------- |
| `@nnrp/native-client`       | 无，只负责 client role。              |
| `@nnrp/native-server`       | 无，只负责 server role。              |
| `@nnrp/transport-tcp`       | TCP native transport artifact。       |
| `@nnrp/transport-quic`      | QUIC native transport artifact。      |
| `@nnrp/transport-ipc`       | IPC native transport artifact。       |
| `@nnrp/transport-websocket` | WebSocket native transport artifact。 |
