# JavaScript/TypeScript Native Runtime 说明

Native backend host 使用 role package：

| 角色   | 包                    | 主 API                 |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP 与 QUIC 不隐藏在 role package 里。如果应用允许这些 transport 参与 probe，请安装
[`@nnrp/transport-tcp`](./transport#createtcptransportprovider) 和
[`@nnrp/transport-quic`](./transport#createquictransportprovider)。

## Native FFI Binding

Role package 接受显式 FFI binding 以支持受控部署和测试。打包的 TCP/QUIC artifact 由 transport
package 拥有。

### `NnrpNativeFfiBinding`

| 属性                  | 类型                                                   | 必填 | 说明                                   |
| --------------------- | ------------------------------------------------------ | ---: | -------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |   否 | Binding 实现标签。                     |
| `runtimeCapabilities` | function                                               |   否 | 返回 native runtime capability probe。 |
| `submitResultCompact` | function                                               |   否 | 粗粒度 submit/result hot path。        |
| `submitNoWait`        | function                                               |   否 | 粗粒度 no-wait submit path。           |
| `cancel`              | function                                               |   否 | 粗粒度 cancel path。                   |
| `awaitEvents`         | function                                               |   否 | 粗粒度 batch event polling path。      |
| `close`               | function                                               |   否 | Binding cleanup hook。                 |

## Artifact 边界

| 包                     | Native artifact 归属             |
| ---------------------- | -------------------------------- |
| `@nnrp/native-client`  | 无，只负责 client role。         |
| `@nnrp/native-server`  | 无，只负责 server role。         |
| `@nnrp/transport-tcp`  | TCP native transport artifact。  |
| `@nnrp/transport-quic` | QUIC native transport artifact。 |
