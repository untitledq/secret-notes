## Branching

Every commit to "main" triggers hole pipeline.

To prevent over-use of shared runner, small modifications will be done in branch "develop" of feature/*.

## Project Status

| Area                  | Backend |
|-----------------------|---|
| **API-Implementation** | ✅|
| **Crypto**            | ✅|
| **DB/Prisma**         | ✅|
| **Tests local (13 passing)** | ✅|
| **Frontend (basic)**  | ✅|
| **Code improvements** | ⏳ |
| **PostHog Integration** | ⏳ |
| **Documentation (FHTW template)** | ❌ |

---

### Cloud-hosted Pipeline (GitLab CI SaaS)

| Stage                             | Backend SaaS | Frontend Jenkins/AWS      |
|-----------------------------------|--|---------------------------|
| **Lint**                          | ✅| ❌ |
| **Test**                          | ✅| ❌ |
| - SonarQube                       | ⭕ | ❌ |
| - Snyk                            | ⭕ | ❌ |
| **Build** (GitLab Regestry)       | ✅| ❌ |
| **Deliver** (DockerHub)           | ⭕ | ❌ |
| **Deploy** Blue/Green (AWS)       | ❌ | ❌ |
| - k6 (performance testing)        | ❌ | ❌ |
| - Playwright (End-to-End testing) | ❌ | ❌ |