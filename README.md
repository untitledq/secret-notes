## Project Status

| Area                            | Backend |
|---------------------------------|---|
| **API-Implementation**          | ✅|
| **Crypto**                      | ✅|
| **DB/Prisma**                   | ✅|
| **Tests local (13 passing)**    | ✅|
| **Frontend**                    | ⏳ |
| **PostHog Integration**         | ❌ |

---

### Cloud-hosted Pipeline (GitLab CI SaaS)

| Stage | Backend | Frontend |
|--|------|----|
| Lint | ✅ | ⭕ |
| | | |
| Test | ✅ | ⭕ |
| SonarQube | ⭕ | ❌ |
| Snyk | ⭕ | ❌ |
| | | |
| Build | ✅ | ⭕ |
| | | |
| Deliver (DockerHub) | ⏳ | ❌ |
| | | |
| Blue/Green Deployment (AWS) | ❌ | ❌ |

---

### Self-hosted Pipeline (Jenkins AWS)

| Stage | Backend | Frontend |
|-------|---------|----------|
| Lint | ❌ | ❌ |
| Test | ❌ | ❌ |
| Build | ❌ | ❌ |
| Deliver | ❌ | ❌ |
| Deploy | ❌ | ❌ |