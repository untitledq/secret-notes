## Branching

Every commit to "main" triggers hole pipeline.

To prevent over-use of shared runner, small modifications will be done in branch "develop" of feature/*.

## Project Status

| Area                              | Backend |
|-----------------------------------|---|
| **API-Implementation**            | ✅|
| **Crypto**                        | ✅|
| **DB/Prisma**                     | ✅|
| **Tests local (13 passing)**      | ✅|
| **Frontend (basic)**              | ✅|
| **Code improvements**             | ⏳ |
| **Handle secrets**                | ⏳ |
| **PostHog Integration**           | ❌ |
| **Documentation (FHTW template)** | ❌ |

---

### Cloud-hosted Pipeline (GitLab CI SaaS)

| Stage                       | Backend | Frontend         |
|-----------------------------|------|------------------|
| Lint                        | ✅ | ⏳ (non-blocking) |
|                             | |                  |
| Test                        | ✅ | ⏳ (exists and is non-empty) |
| SonarQube                   | ⭕ |                  |
| Snyk                        | ⭕ |                  |
|                             | |                  |
| Build (GitLab Regestry)     | ✅ | ✅                |
|                             | |                  |
| Deliver (DockerHub)         | ⭕ | ⭕                |
|                             | |                  |
| Blue/Green Deployment (AWS) | ❌ | ❌                |

---

### Self-hosted Pipeline (Jenkins AWS)

| Stage | Backend | Frontend |
|-------|---------|----------|
| Lint | ❌ | ❌ |
| Test | ❌ | ❌ |
| Build | ❌ | ❌ |
| Deliver | ❌ | ❌ |
| Deploy | ❌ | ❌ |