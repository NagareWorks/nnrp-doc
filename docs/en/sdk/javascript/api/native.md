# JavaScript/TypeScript Native Runtime Notes

Native backend hosts use role packages:

| Role   | Package               | Main API               |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP and QUIC are not hidden inside the role packages. Install
[`@nnrp/transport-tcp`](./transport#createtcptransportprovider) and
[`@nnrp/transport-quic`](./transport#createquictransportprovider) when those transports should be
available for probing.

## Native FFI Binding

Role packages accept explicit FFI bindings for controlled deployments and tests. Packaged TCP/QUIC
artifacts are owned by the transport packages.

### `NnrpNativeFfiBinding`

| Property              | Type                                                   | Required | Description                                   |
| --------------------- | ------------------------------------------------------ | -------: | --------------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |       No | Binding implementation label.                 |
| `runtimeCapabilities` | function                                               |       No | Returns native runtime capability probe data. |
| `submitResultCompact` | function                                               |       No | Coarse submit/result hot path.                |
| `submitNoWait`        | function                                               |       No | Coarse no-wait submit path.                   |
| `cancel`              | function                                               |       No | Coarse cancel path.                           |
| `awaitEvents`         | function                                               |       No | Coarse batch event polling path.              |
| `close`               | function                                               |       No | Binding cleanup hook.                         |

## Artifact Boundary

| Package                | Native artifact ownership        |
| ---------------------- | -------------------------------- |
| `@nnrp/native-client`  | None; client role only.          |
| `@nnrp/native-server`  | None; server role only.          |
| `@nnrp/transport-tcp`  | TCP native transport artifacts.  |
| `@nnrp/transport-quic` | QUIC native transport artifacts. |
