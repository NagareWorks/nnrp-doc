# Python 快速使用

这一页只保留 Python SDK 的公开安装入口。API 细节放到专门的 API 文档里，快速使用页只维护最短、最稳定的接入路径。

## 环境要求

1. Python 3.11 及以上版本。
2. 可正常从 PyPI 安装包的 Python 环境。

## 从 PyPI 安装

发布到包仓库的 distribution 名称是 `nnrp-py`。

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
uv add "nnrp-py==1.0.0rc2"
pip install "nnrp-py==1.0.0rc2"
```

## 安装校验

包的 distribution 名称是 `nnrp-py`，但代码导入名是 `nnrp`。

```bash
python -c "import nnrp; print(nnrp.__name__)"
```

如果安装正常，这条命令会输出 `nnrp` 并成功退出。

## 本地未发布改动的 editable 覆盖安装

正常接入和部署默认都应走 PyPI。只有在你需要联调未发布的本地 SDK 改动时，才应切到本地 editable 安装：

```bash
pip install -e ../nnrp-py
```

这个 editable 路径只用于本地联调，不应当作公开部署默认流程。