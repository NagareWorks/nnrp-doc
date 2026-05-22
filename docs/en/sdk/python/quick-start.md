# Python Quick Start

This page covers the public package installation path of the Python SDK. API walkthroughs stay in the dedicated API pages; the quick-start should only keep the shortest stable bring-up path.

## Requirements

1. Python 3.11 or newer.
2. A normal Python environment that can install packages from PyPI.

## Install From PyPI

The published distribution name is `nnrp-py`.

NNRP is documented against the intended stable `1.0.0` API line. During preview
development, install snippets should use the current verified preview package. The current
public Python preview package is `1.0.0rc2`.

Using `uv`:

```bash
uv add nnrp-py
```

Using `pip`:

```bash
pip install nnrp-py
```

If you want to lock to one verified public release explicitly, pin the version:

```bash
uv add "nnrp-py==1.0.0rc2"
pip install "nnrp-py==1.0.0rc2"
```

## Verify The Installation

The distribution name is `nnrp-py`, but the import package name is `nnrp`.

```bash
python -c "import nnrp; print(nnrp.__name__)"
```

If the installation is correct, the command prints `nnrp` and exits successfully.

## Local Editable Override For Unpublished Changes

PyPI should be treated as the default installation path for normal consumption and deployment. Only switch to a local editable checkout when you are validating unpublished SDK changes together with another local repository.

```bash
pip install -e ../nnrp-py
```

That editable override is for local integration work only; it is not the default public deployment path.
