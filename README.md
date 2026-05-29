# gestao-negocios

Sistema de gestão para negócios de doces — PDV mobile + BI completo.

Deployado em `floresedoces.renashstudios.com` no servidor DonaOdete (Raspberry Pi 5 / aarch64).

## Stack

| Camada     | Tecnologia                              |
|------------|-----------------------------------------|
| Backend    | FastAPI + SQLAlchemy 2.0 + Alembic      |
| Frontend   | React + Vite + PWA (Dexie offline)      |
| Banco      | PostgreSQL 16                           |
| Proxy      | Traefik v3 (rede `n8n_default`)         |
| CI/CD      | GitHub Actions → GHCR → SSH deploy      |

## Estrutura

```
gestao-negocios/
├── backend/          # FastAPI
├── frontend/         # React PWA
├── infra/            # Compose + env
└── .github/workflows/ci.yml
```

## Setup no servidor

1. Crie a pasta da stack:
```bash
mkdir -p /srv/.../compose/gestao-flores-doces/data/postgres
```

2. Copie os arquivos de infra:
```bash
cp infra/gestao-flores-doces.yml   .../compose/gestao-flores-doces/
cp infra/gestao-flores-doces.env.example .../compose/gestao-flores-doces/gestao-flores-doces.env
```

3. Edite o `.env` com senhas reais e `SECRET_KEY`.

4. Suba:
```bash
docker compose -f gestao-flores-doces.yml --env-file gestao-flores-doces.env up -d
```

## Deploy

- **Push na `main`**: testa + builda imagem ARM64 + publica no GHCR automaticamente.
- **Deploy no servidor**: acionado manualmente via `workflow_dispatch` no GitHub Actions, ou:
  ```bash
  docker compose -f gestao-flores-doces.yml pull && docker compose up -d
  ```

## Novo cliente

1. Fork ou clone do repo.
2. Crie novo `.env` com `DOMAIN`, `BUSINESS_NAME`, novas senhas.
3. Suba nova stack com nome diferente no compose.
