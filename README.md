## Branching

Every commit to "main" triggers hole pipeline.

To prevent over-use of shared runner, small modifications will be done in branch "develop" of feature/*.

## Project Status

| Area                            | Backend |
|---------------------------------|---|
| **API-Implementation**          | ✅|
| **Crypto**                      | ✅|
| **DB/Prisma**                   | ✅|
| **Tests local (13 passing)**    | ✅|
| **Frontend**                    | ⏳ |
| **PostHog Integration**         | ❌ |
| **Documentation (FHTW template)**         | ❌ |

---

### Cloud-hosted Pipeline (GitLab CI SaaS)

| Stage                       | Backend | Frontend |
|-----------------------------|------|---------|
| Lint                        | ✅ | ⏳       |
|                             | |         |
| Test                        | ✅ | ⏳       |
| SonarQube                   | ⭕ |         |
| Snyk                        | ⭕ |         |
|                             | |         |
| Build (GitLab Regestry)     | ✅ | ✅       |
|                             | |         |
| Deliver (DockerHub)         | ⭕ | ⭕       |
|                             | |         |
| Blue/Green Deployment (AWS) | ❌ | ❌       |

---

### Self-hosted Pipeline (Jenkins AWS)

| Stage | Backend | Frontend |
|-------|---------|----------|
| Lint | ❌ | ❌ |
| Test | ❌ | ❌ |
| Build | ❌ | ❌ |
| Deliver | ❌ | ❌ |
| Deploy | ❌ | ❌ |