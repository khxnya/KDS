# Archived website snapshot

This folder contains a superseded version of the Khanya Digital website and portals. The
active site and current project guidance are in the repository root; use the root
[README](../README.md) as the source of truth.

This snapshot retains older layouts, copy, and prototype features. Do not deploy it or
present its sample content as current client work.

## Local preview

From the repository root, run:

```bash
python -m http.server 8000 --directory "version one"
```

Then open `http://localhost:8000`.

The local owner-console test login is `owner@test.com` / `Testing1234!`. It is only a
browser-side test gate, not secure authentication. The client portal uses its own
configured authentication and is not given a shared demo account here. Never use test
credentials for real accounts or a public deployment.
