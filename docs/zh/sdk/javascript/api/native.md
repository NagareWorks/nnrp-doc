# JavaScript/TypeScript Native Runtime 说明

Native backend host 使用 role package：

| 角色   | 包                    | 主 API                 |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP、QUIC、IPC 与 WebSocket 不隐藏在 role package 里。请为允许参与选择的载体安装对应的
`@nnrp/transport-*` package。

## Native FFI Binding

Role package 接受显式 FFI binding 以支持受控部署和测试。打包的 transport artifact 由对应的 transport
package 拥有。

Role binding 与 transport binding 是两个独立契约。`NnrpNativeFfiBinding` 在 carrier 完成选择后持有
client 或 server runtime 操作。Carrier 包使用
[`NnrpNativeTransportBinding`](./transport#nnrpnativetransportbinding) 完成 endpoint probe 以及 framed
connection/listener 生命周期。Role binding 不得冒充 transport binding；transport 包缺失 Rust artifact 时，
不得暗中回退到 JavaScript socket 实现。

### `NnrpNativeFfiBinding`

| 属性                             | 类型                                                   | 必填 | 说明                                        |
| -------------------------------- | ------------------------------------------------------ | ---: | ------------------------------------------- |
| `mode`                           | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |   否 | Binding 实现标签。                          |
| `runtimeCapabilities`            | function                                               |   否 | 返回 native runtime capability probe。      |
| `submitResultCompact`            | function                                               |   否 | 粗粒度 submit/result hot path。             |
| `submitNoWait`                   | function                                               |   否 | 粗粒度 no-wait submit path。                |
| `cancel`                         | function                                               |   否 | 粗粒度 cancel path。                        |
| `sendRuntimeFrame`               | function                                               |   否 | 角色中立的粗粒度 Preview4 frame 发送路径。   |
| `submitRuntimeObjectLoopCompact` | function                                               |   否 | 只用于 benchmark 的组合 object loop helper。 |
| `awaitEvents`                    | function                                               |   否 | 粗粒度 batch event polling path。           |
| `close`                          | function                                               |   否 | Binding cleanup hook。                      |

## Artifact 边界

| 包                          | Native artifact 归属                  |
| --------------------------- | ------------------------------------- |
| `@nnrp/native-client`       | 无，只负责 client role。              |
| `@nnrp/native-server`       | 无，只负责 server role。              |
| `@nnrp/transport-tcp`       | TCP native transport artifact。       |
| `@nnrp/transport-quic`      | QUIC native transport artifact。      |
| `@nnrp/transport-ipc`       | IPC native transport artifact。       |
| `@nnrp/transport-websocket` | WebSocket native transport artifact。 |
