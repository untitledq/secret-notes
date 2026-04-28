# Secret Notes Architecture (Draft)

## Components
- Frontend: static web UI
- Backend: Fastify API
- Encryption: AES-256-GCM in backend
- Storage: PostgreSQL (later AWS RDS)

## CI/CD
- GitHub Actions or GitLab CI
- Lint → Test → Build → Deliver → Deploy