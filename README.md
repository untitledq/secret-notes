## Branching

Every commit to "main" triggers hole pipeline.
To prevent over-use of shared runner, small modifications will be done in branch "develop" of feature/*.

### TODO's: 

- create Jenkins pipeline for frontend
- Host Jenkins on AWS
- Host SonarQube on AWS
- Run SonarQube 
- - uncomment in GitLab for backend pipeline and set variables
- - - SONAR_HOST_URL
- - - SONAR_TOKEN
- - Make Frontend nice and test-worthy
- Add tests and fix findings


- Deploy application (blue/green) on AWS
- Add K6Playwright 
- Add Playwright


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

| Stage                                  | Backend SaaS  | Frontend Jenkins/AWS      |
|----------------------------------------|---------------|---------------------------|
| **Lint**                               | ✅             | ❌ |
| **Snyk**                               | ✅             | ❌ |
| **SonarQube**                          | ⏳ (reqires AWS)| ❌ |
| **Test**                               | ✅             | ❌ |
| **Build** (GitLab Regestry)            | ✅             | ❌ |
| **Deliver** (DockerHub)                | ✅             | ❌ |
| **Check** if both artefacts are ready  | ❌             | ❌ |
| **Deploy** to passive (Blue/Green-AWS) | ❌             | ❌ |
| - k6 (performance testing)             | ❌             | ❌ |
| - Playwright (End-to-End testing)      | ❌             | ❌ |
| **Switch** Blue/Green if passed        | ❌             | ❌ |