# Python 快速使用

这一页只保留 Python SDK 的公开安装入口。API 细节放到专门的 API 文档里，快速使用页只维护最短、最稳定的接入路径。

## 环境要求

1. Python 3.11 及以上版本。
2. 可正常从 PyPI 安装包的 Python 环境。

## 从 PyPI 安装

发布到包仓库的 distribution 名称是 `nnrp-py`。

NNRP 文档按最终稳定线 `1.0.0` 组织。预览开发阶段，安装命令应使用当前已经验证过的预览包；当前公开 Python 预览包是 `1.0.0rc4`。

使用 `uv`：

```bash
uv add --prerelease allow nnrp-py
```

使用 `pip`：

```bash
pip install --pre nnrp-py
```

如果要显式锁定到一个已经验证过的公开版本，可以直接带版本号安装：

```bash
uv add --prerelease allow "nnrp-py==1.0.0rc4"
pip install --pre "nnrp-py==1.0.0rc4"
```

## 安装校验

包的 distribution 名称是 `nnrp-py`，但代码导入名是 `nnrp`。

```bash
python -c "import nnrp; print(nnrp.__name__)"
```

如果安装正常，这条命令会输出 `nnrp` 并成功退出。

## Native Runtime 校验

Python SDK 会在当前 wheel 含有对应平台 artifact 时，将运行时热路径交给打包的 Rust native artifact。默认 binding 模式是 `auto`。

```bash
python -c "from nnrp import probe_native_artifact; print(probe_native_artifact())"
```

Preview4 wheel 携带 transport-scoped native artifacts。生产 host API 应通过 native client connection 打开 session，而不是从旧 packet transport helper 开始：

下面假设 `trusted_certificate_der` 是从部署信任配置加载的 DER certificate bytes。

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

SDK 可以发现 provider，并根据冻结的 transport evidence 执行显式选择：

```python
from nnrp import (
    NativeTransportCandidateReadiness,
    NativeTransportSelectionOptions,
    TransportId,
    TransportPolicy,
    discover_native_transport_providers,
    select_native_transport_provider,
)

providers = discover_native_transport_providers()
selection = select_native_transport_provider(
    NativeTransportSelectionOptions(
        peer_supported_transports=(TransportId.TCP,),
        policy=TransportPolicy.AUTO,
        requested_max_frame_bytes=None,
        candidate_readiness=tuple(
            NativeTransportCandidateReadiness.ready(provider) for provider in providers
        ),
        # 剩余多个 eligible provider 时，必须为每个 provider 提供 succeeded/failed observation。
        probe_observations=(),
    )
)
print(selection.selected_transport_name)
```

生产 runtime 统一使用已打包的 ABI 4 `ctypes` binding；已退役的 compiled CFFI side runtime
不再是可选 fallback。

## 一致性测试与 Benchmark 入口

SDK 暴露了 suite-owned 集成命令：

```bash
python -m nnrp.tools.adapter_conformance
python -m nnrp.tools.wire_conformance manifest --help
python -m nnrp.tools.benchmark --plan benchmark-plan.json --output artifacts/benchmark-results.json
```

已安装 console script 的环境也可以使用：

```bash
nnrp-wire-conformance manifest --help
nnrp-wire-target-manifest --help
nnrp-run-benchmark --help
```

## 本地未发布改动的 editable 覆盖安装

正常接入和部署默认都应走 PyPI。只有在你需要联调未发布的本地 SDK 改动时，才应切到本地 editable 安装：

```bash
pip install -e ../nnrp-py
```

这个 editable 路径只用于本地联调，不应当作公开部署默认流程。
