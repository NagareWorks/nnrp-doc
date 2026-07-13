# JavaScript/TypeScript Native Runtime Notes

Native backend hosts use role packages:

| Role   | Package               | Main API               |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP, QUIC, IPC, and WebSocket are not hidden inside the role packages. Install the corresponding
`@nnrp/transport-*` packages for the carriers allowed to participate in selection.

## Native FFI Binding

Role packages accept explicit FFI bindings for controlled deployments and tests. Packaged transport
artifacts are owned by the transport packages.

### `NnrpNativeFfiBinding`

| Property                         | Type                                                   | Required | Description                                   |
| -------------------------------- | ------------------------------------------------------ | -------: | --------------------------------------------- |
| `mode`                           | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |       No | Binding implementation label.                 |
| `runtimeCapabilities`            | function                                               |       No | Returns native runtime capability probe data. |
| `submitResultCompact`            | function                                               |       No | Coarse submit/result hot path.                |
| `submitNoWait`                   | function                                               |       No | Coarse no-wait submit path.                   |
| `cancel`                         | function                                               |       No | Coarse cancel path.                           |
| `sendRuntimeFrame`               | function                                               |       No | Role-neutral coarse Preview4 frame send path. |
| `submitRuntimeObjectLoopCompact` | function                                               |       No | Benchmark-only combined object loop helper.   |
| `awaitEvents`                    | function                                               |       No | Coarse batch event polling path.              |
| `close`                          | function                                               |       No | Binding cleanup hook.                         |

## Artifact Boundary

| Package                     | Native artifact ownership             |
| --------------------------- | ------------------------------------- |
| `@nnrp/native-client`       | None; client role only.               |
| `@nnrp/native-server`       | None; server role only.               |
| `@nnrp/transport-tcp`       | TCP native transport artifacts.       |
| `@nnrp/transport-quic`      | QUIC native transport artifacts.      |
| `@nnrp/transport-ipc`       | IPC native transport artifacts.       |
| `@nnrp/transport-websocket` | WebSocket native transport artifacts. |
