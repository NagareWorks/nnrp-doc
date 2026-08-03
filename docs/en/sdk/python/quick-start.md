# Python Quick Start

This page covers the public package installation path of the Python SDK. API walkthroughs stay in the dedicated API pages; the quick-start should only keep the shortest stable bring-up path.

## Requirements

1. Python 3.11 or newer.
2. A normal Python environment that can install packages from PyPI.

## Install From PyPI

The published distribution name is `nnrp-py`.

NNRP is documented against the intended stable `1.0.0` API line. During preview
development, install snippets should use the current verified preview package. The current
public Python preview package is `1.0.0rc4`.

Using `uv`:

```bash
uv add --prerelease allow nnrp-py
```

Using `pip`:

```bash
pip install --pre nnrp-py
```

If you want to lock to one verified public release explicitly, pin the version:

```bash
uv add --prerelease allow "nnrp-py==1.0.0rc4"
pip install --pre "nnrp-py==1.0.0rc4"
```

## Verify The Installation

The distribution name is `nnrp-py`, but the import package name is `nnrp`.

```bash
python -c "import nnrp; print(nnrp.__name__)"
```

If the installation is correct, the command prints `nnrp` and exits successfully.

## Native Runtime Check

The Python SDK uses packaged Rust native artifacts for runtime hot paths when the installed wheel includes one for the current platform. The default binding mode is `auto`.

```bash
python -c "from nnrp import probe_native_artifact; print(probe_native_artifact())"
```

Preview4 wheels carry transport-scoped native artifacts. Production host code should open sessions through the native client connection instead of starting from the older packet transport helpers:

The example assumes `trusted_certificate_der` contains the DER certificate loaded from deployment trust configuration.

```python
import asyncio

from nnrp import NativeTransportClientSecurity, TransportPolicy
from nnrp.client import (
    NativeClientOptions,
    NativeClientProviderRoute,
    NativeClientSessionOptions,
    SubmitIdentity,
    SubmitPolicy,
    SubmitRequest,
    TokenChunk,
    TokenSubmitInput,
    connect_native_client_connection,
)


async def main() -> None:
    options = NativeClientOptions(
        endpoint="nnrps://runtime.example/session/default",
        provider_routes={
            "tcp": NativeClientProviderRoute(
                security=NativeTransportClientSecurity(
                    server_name="runtime.example",
                    trusted_certificate_der=trusted_certificate_der,
                )
            )
        },
        transport_policy=TransportPolicy.FORCE_TCP,
    )
    with connect_native_client_connection(options) as connection:
        session = await connection.open_session(NativeClientSessionOptions(requested_session_id=1))
        request = SubmitRequest.token(
            TokenSubmitInput(
                identity=SubmitIdentity(operation_id=1, frame_id=1),
                policy=SubmitPolicy(),
                chunks=(TokenChunk(b"hello"),),
            )
        )
        result = connection.submit_and_poll_result(session, request, timeout_ms=30_000)
        runtime_event = result.event.as_runtime()
        print(runtime_event.tail.body if runtime_event is not None else result.event.as_lifecycle().state)


asyncio.run(main())
```

When the installation contains several transport artifacts, the SDK can discover and select providers:

```python
from nnrp import discover_native_transport_providers, select_native_transport_provider

print([provider.name for provider in discover_native_transport_providers()])
print(select_native_transport_provider("auto").selected_transport_name)
```

The production runtime uses the packaged ABI 4 `ctypes` binding. The retired compiled CFFI side
runtime is not a selectable fallback.

## Conformance and Benchmark Entrypoints

The SDK exposes suite-owned integration commands:

```bash
python -m nnrp.tools.adapter_conformance
python -m nnrp.tools.wire_conformance manifest --help
python -m nnrp.tools.benchmark --plan benchmark-plan.json --output artifacts/benchmark-results.json
```

Installed environments can also use the console scripts:

```bash
nnrp-wire-conformance manifest --help
nnrp-wire-target-manifest --help
nnrp-run-benchmark --help
```

## Local Editable Override For Unpublished Changes

PyPI should be treated as the default installation path for normal consumption and deployment. Only switch to a local editable checkout when you are validating unpublished SDK changes together with another local repository.

```bash
pip install -e ../nnrp-py
```

That editable override is for local integration work only; it is not the default public deployment path.
