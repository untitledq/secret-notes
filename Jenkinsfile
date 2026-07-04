pipeline {
    agent any 

    stages {
        stage('Säubern & Vorbereiten') {
            steps {
                cleanWs()
                checkout scm
            }
        }

        stage('Lint') {
            agent {
                docker { 
                    image 'node:20-alpine'
                }
            }
            steps {
                echo 'Führe Linter aus...'
                dir('frontend') {
                    sh 'rm -rf node_modules .npm-cache'
                    sh 'export npm_config_cache=./.npm-cache && npm ci --no-audit'
                    sh 'npm run lint'
                }
            }
        }

        // 2. SNYK (Security Scan)
        stage('Snyk Security Scan') {
            agent {
                docker { 
                    image 'snyk/snyk:node'
                }
            }
            environment {
                SNYK_TOKEN = credentials('SNYK_TOKEN')
            }
            steps {
                echo "Snyk test frontend"
                dir('frontend') {
                    sh 'export XDG_CONFIG_HOME=\$(pwd)/.config && snyk test --severity-threshold=high'
                }
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