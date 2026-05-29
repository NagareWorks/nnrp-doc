# Python 快速使用

这一页只保留 Python SDK 的公开安装入口。API 细节放到专门的 API 文档里，快速使用页只维护最短、最稳定的接入路径。

## 环境要求

1. Python 3.11 及以上版本。
2. 可正常从 PyPI 安装包的 Python 环境。

## 从 PyPI 安装

发布到包仓库的 distribution 名称是 `nnrp-py`。

NNRP 文档按最终稳定线 `1.0.0` 组织。预览开发阶段，安装命令应使用当前已经验证过的预览包；当前公开 Python 预览包是 `1.0.0rc3`。

使用 `uv`：

```bash
uv add nnrp-py
```

使用 `pip`：

```bash
pip install nnrp-py
```

如果要显式锁定到一个已经验证过的公开版本，可以直接带版本号安装：

```bash
uv add "nnrp-py==1.0.0rc3"
pip install "nnrp-py==1.0.0rc3"
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

如果本地开发设备无法构建或加载 cffi API 快路径，可以强制使用免编译 fallback：

```bash
NNRP_NATIVE_BINDING_MODE=ctypes python -m pytest
```

只有在希望强制使用 cffi API 快路径，并在不可用时直接失败时，才设置 `NNRP_NATIVE_BINDING_MODE=cffi_api`。

## Conformance 与 Benchmark 入口

SDK 暴露了 suite-owned 集成命令：

```bash
python -m nnrp.tools.adapter_conformance
python -m nnrp.tools.benchmark --plan benchmark-plan.json --output artifacts/benchmark-results.json
```

## 本地未发布改动的 editable 覆盖安装

正常接入和部署默认都应走 PyPI。只有在你需要联调未发布的本地 SDK 改动时，才应切到本地 editable 安装：

```bash
pip install -e ../nnrp-py
```

这个 editable 路径只用于本地联调，不应当作公开部署默认流程。
