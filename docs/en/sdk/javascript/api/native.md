# JavaScript/TypeScript Native Runtime Notes

Native backend hosts use role packages:

| Role   | Package               | Main API               |
| ------ | --------------------- | ---------------------- |
| Client | `@nnrp/native-client` | [Client API](./client) |
| Server | `@nnrp/native-server` | [Server API](./server) |

TCP, QUIC, IPC, and WebSocket are not hidden inside the role packages. Install the corresponding
`@nnrp/transport-*` packages for the carriers allowed to participate in selection.

Each role manifest advertises only its own session capability: `@nnrp/native-client` advertises
`client.session`, while `@nnrp/native-server` advertises `server.session`. Its transport list is derived from the
installed providers; role packages do not claim `native.loader` or infer carriers from a generic runtime library.

## Native FFI Binding

Role packages accept explicit FFI bindings for controlled integration and tests. Packaged transport
artifacts are owned by the transport packages.

Role bindings and transport bindings are separate contracts. `NnrpNativeFfiBinding` owns client or
server runtime operations after a carrier has been selected. Carrier packages use
[`NnrpNativeTransportBinding`](./transport#nnrpnativetransportbinding) for endpoint probing and
framed connection/listener lifecycle. A role binding must not impersonate a transport binding, and
a transport package must not fall back to a JavaScript socket implementation when its Rust artifact
is missing.

### Client `NnrpNativeFfiBinding`

| Property              | Type                                                                | Required | Description                                      |
| --------------------- | ------------------------------------------------------------------- | -------: | ------------------------------------------------ |
| `mode`                | `"native-addon" \| "node-ffi" \| "deno-ffi" \| "nano-ffi" \| "test"` |       No | Binding implementation label.                    |
| `runtimeCapabilities` | function                                                            |       No | Returns native runtime capability probe data.    |
| `validateSubmit`      | function                                                            |       No | Validates and normalizes a submit at the ABI edge. |
| `submitResultCompact` | function                                                            |       No | Coarse submit/result hot path.                   |
| `submitNoWait`        | function                                                            |       No | Coarse no-wait submit path.                      |
| `sendRuntimeFrame`    | function                                                            |       No | Coarse Preview4 control/object/cache frame path. |
| `patchSession`        | function                                                            |       No | Coarse session patch path.                       |
| `awaitEvents`         | function                                                            |       No | Coarse batch event polling path.                 |
| `close`               | function                                                            |       No | Binding cleanup hook.                            |

Cancellation and abort are protocol frames sent through `sendRuntimeFrame`; they are not standalone
FFI methods. Published role packages do not expose a package-owned direct Deno loader or a self-echo
benchmark binding. Production calls run through the selected transport package's client/server role
carrier; an explicit `NnrpNativeFfiBinding` is a controlled integration and test seam only.

### Server `NnrpNativeFfiBinding`

| Property              | Type                                                                | Required | Description                                      |
| --------------------- | ------------------------------------------------------------------- | -------: | ------------------------------------------------ |
| `mode`                | `"native-addon" \| "node-ffi" \| "deno-ffi" \| "nano-ffi" \| "test"` |       No | Binding implementation label.                    |
| `runtimeCapabilities` | function                                                            |       No | Returns native runtime capability probe data.    |
| `sendRuntimeFrame`    | function                                                            |       No | Coarse Preview4 control/object/cache frame path. |
| `accept`              | function                                                            |       No | Accepts a server session.                        |
| `receive`             | function                                                            |       No | Receives the next typed server event.            |
| `close`               | function                                                            |       No | Binding cleanup hook.                            |

## Artifact Boundary

| Package                     | Native artifact ownership             |
| --------------------------- | ------------------------------------- |
| `@nnrp/native-client`       | None; client role only.               |
| `@nnrp/native-server`       | None; server role only.               |
| `@nnrp/transport-tcp`       | TCP native transport artifacts.       |
| `@nnrp/transport-quic`      | QUIC native transport artifacts.      |
| `@nnrp/transport-ipc`       | IPC native transport artifacts.       |
| `@nnrp/transport-websocket` | WebSocket native transport artifacts. |
