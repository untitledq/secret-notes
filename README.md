## Project Status

| Area                            | Backend |
|---------------------------------|---|
| **API-Implementation**          | ✅|
| **Crypto**                      | ✅|
| **DB/Prisma**                   | ✅|
| **Tests local (10+)**           | ✅|
| **Frontend**                    | ⭕ |
| **PostHog Integration**         | ❌ |
| **Blue/Green Deployment (AWS)** | ❌ |

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
| Deploy (AWS) | ❌ | ❌ |

---

### Self-hosted Pipeline (Jenkins AWS)

| Stage | Backend | Frontend |
|-------|---------|----------|
| Lint | ❌ | ❌ |
| Test | ❌ | ❌ |
| Build | ❌ | ❌ |
| Deliver | ❌ | ❌ |
| Deploy | ❌ | ❌ |