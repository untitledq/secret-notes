pipeline {
    agent {
        docker { image 'node:20-alpine' }
    }

    stages {
        // 1. LINT
        stage('Lint') {
            steps {
                echo 'Führe Linter aus...'
                dir('frontend') {
                    sh 'rm -rf node_modules .npm-cache'
                    sh 'npm ci --cache .npm-cache'
                    sh 'npm run lint'
                }
            }
        }

        // 2. SNYK (Security Scan)
        stage('Snyk Security Scan') {
            steps {
                echo 'Scanne Abhängigkeiten mit Snyk...'
            }
        }

        // 3. SONARQUBE
        stage('SonarQube Analysis') {
            steps {
                echo 'Sende Daten an SonarQube...'
            }
        }

        // 4. TEST
        stage('Unit Tests') {
            steps {
                echo 'Führe Frontend Unit-Tests aus...'
            }
        }

        // 5. BUILD (GitLab Registry)
        stage('Build Docker Image') {
            steps {
                echo 'Baue Docker-Image für das Frontend...'
            }
        }

        // 6. DELIVER (DockerHub / Registry)
        stage('Deliver') {
            steps {
                echo 'Pushe Image in die Registry...'
            }
        }

        // 7. CHECK
        stage('Check Artefacts') {
            steps {
                echo 'Prüfe, ob auch das Backend-Artefakt bereit ist...'
            }
        }

        // 8. DEPLOY (Passive Umgebung)
        stage('Deploy to Passive (Blue/Green-AWS)') {
            steps {
                echo 'Deploye Frontend auf die passive AWS-Umgebung...'
            }
        }

        // 9. PERFORMANCE TESTING (k6)
        stage('k6 Performance Testing') {
            steps {
                echo 'Führe k6 Performance-Tests aus...'
            }
        }

        // 10. E2E TESTING (Playwright)
        stage('Playwright E2E Testing') {
            steps {
                echo 'Führe Playwright E2E-Tests aus...'
            }
        }

        // 11. SWITCH (Blue/Green)
        stage('Switch Blue/Green') {
            steps {
                echo 'Schalte Umgebung live...'
            }
        }
    }
}