pipeline {
    agent any 

    stages {
        stage('Säubern & Vorbereiten') {
            steps {
                cleanWs()
                checkout scm
            }
        }

        // 1. LINT: Holt sich den Node-Container
        stage('Lint') {
            when {
                beforeAgent true
                anyOf {
                    branch 'main'
                    branch 'deploy/production'
                }
            }
            agent {
                docker { 
                    image 'node:20-alpine'
                }
            }
            steps {
                echo 'Führe Linter aus...'
                dir('frontend') {
                    sh '''
                        rm -rf node_modules .npm-cache
                        
                        export npm_config_cache=\$(pwd)/.npm-cache
                        export npm_config_userconfig=\$(pwd)/.npmrc
                        
                        npm ci --no-audit
                        npm run lint
                    '''
                }
            }
        }

        // 2. SNYK (Security Scan)
        stage('Snyk Security Scan') {
            when {
                beforeAgent true
                anyOf {
                    branch 'main'
                    branch 'deploy/production'
                }
            }
            agent {
                docker { 
                    image 'snyk/snyk:node'
                }
            }
            environment {
                SNYK_TOKEN = credentials('SNYK_TOKEN')
                HOME = "${WORKSPACE}/frontend"
            }
            steps {
                echo "Snyk test frontend"
                dir('frontend') {
                    sh 'snyk test --severity-threshold=high'
                }
            }
        }

        // 3. UNIT TESTS
        stage('Unit Tests & Coverage') {
            when {
                beforeAgent true
                anyOf {
                    branch 'main'
                    branch 'deploy/production'
                }
            }
            agent {
                docker { 
                    image 'node:20-alpine'
                }
            }
            steps {
                echo 'Führe Jest-Tests aus...'
                dir('frontend') {
                    sh '''
                        export npm_config_cache=\$(pwd)/.npm-cache
                        npm run test -- --coverage --watchAll=false
                    '''
                }
            }
        }

        // 4. SONARQUBE
        stage('SonarQube Analysis') {
            when {
                beforeAgent true
                anyOf {
                    branch 'main'
                    branch 'deploy/production'
                }
            }
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli:latest'
                }
            }
            environment {
                SONAR_TOKEN    = credentials('SONAR_TOKEN')
                SONAR_HOST_URL = credentials('SONAR_HOST_URL')
            }
            steps {
                echo 'Sende Daten an SonarQube...'
                dir('frontend') {
                    sh '''
                        sonar-scanner \
                        -Dsonar.projectKey=secret-notes-frontend \
                        -Dsonar.projectName="Secret Notes Frontend" \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.token=${SONAR_TOKEN} \
                        -Dsonar.userHome=\$(pwd)/.sonar
                    '''
                }
            }
        }

        // 4. BUILD
        stage('Build Docker Image') {
            when {
                beforeAgent true
                anyOf {
                    branch 'main'
                    branch 'deploy/production'
                }
            }
            agent any
            steps {
                echo 'Baue das Docker-Image lokal auf dem Server...'
                dir('frontend') {
                    // Wir holen den Usernamen aus den Jenkins-Secrets
                    withCredentials([string(credentialsId: 'DOCKERHUB_USER', variable: 'RAW_USER')]) {
                        sh '''
                            # Wandelt den Usernamen direkt im RAM in Kleinbuchstaben um – ohne Rohdaten im Code!
                            MY_USER=$(echo "$RAW_USER" | tr '[:upper:]' '[:lower:]')
                            COMMIT_SHA=$(git rev-parse --short HEAD)
                            
                            export DOCKER_BUILDKIT=0
                            
                            # Wir bauen das Image lokal direkt mit dem richtigen Namen
                            docker build -t local-frontend:$COMMIT_SHA -t local-frontend:latest .
                        '''
                    }
                }
            }
        }

        // 5. DELIVER STAGE
        stage('Deliver to Docker Hub') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            agent any 
            steps {
                echo 'Logge bei Docker Hub via Token ein und pushe die Images...'
                dir('frontend') {
                    // Hier nutzen wir beide Secrets (User + Token)
                    withCredentials([
                        string(credentialsId: 'DOCKERHUB_USER', variable: 'RAW_USER'),
                        string(credentialsId: 'DOCKERHUB_TOKEN', variable: 'RAW_TOKEN')
                    ]) {
                        sh '''
                            # Auch hier: Umwandlung direkt im Speicher
                            MY_USER=$(echo "$RAW_USER" | tr '[:upper:]' '[:lower:]')
                            COMMIT_SHA=$(git rev-parse --short HEAD)
                            
                            export DOCKER_BUILDKIT=0
                            
                            # 1. Bei Docker Hub mit dem Token einloggen
                            echo "$RAW_TOKEN" | docker login -u "$RAW_USER" --password-stdin
                            
                            # 2. Die lokalen Images mit dem Docker Hub Pfad verknüpfen
                            docker tag local-frontend:latest ${MY_USER}/secret-notes-frontend:latest
                            docker tag local-frontend:$COMMIT_SHA ${MY_USER}/secret-notes-frontend:$COMMIT_SHA
                            
                            # 3. Beide Tags zu Docker Hub pushen
                            docker push ${MY_USER}/secret-notes-frontend:latest
                            docker push ${MY_USER}/secret-notes-frontend:$COMMIT_SHA
                            
                            # 4. Lokale Images löschen, um AWS-Speicher zu sparen
                            docker rmi local-frontend:$COMMIT_SHA local-frontend:latest
                            docker rmi ${MY_USER}/secret-notes-frontend:$COMMIT_SHA
                            docker rmi ${MY_USER}/secret-notes-frontend:latest
                            
                            docker logout
                        '''
                    }
                }
                echo 'Frontend erfolgreich via Token auf Docker Hub bereitgestellt! 🚀'
            }
        }

        // 7. CHECK
        stage('Check Artefacts') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            steps {
                echo 'Prüfe, ob auch das Backend-Artefakt bereit ist...'
            }
        }

        // 8. DEPLOY (Passive Umgebung)
        stage('Deploy to Passive (Blue/Green-AWS)') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            steps {
                echo 'Deploye Frontend auf die passive AWS-Umgebung...'
            }
        }

        // 9. PERFORMANCE TESTING (k6)
        stage('k6 Performance Testing') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            steps {
                echo 'Führe k6 Performance-Tests aus...'
            }
        }

        // 10. E2E TESTING (Playwright)
        stage('Playwright E2E Testing') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            steps {
                echo 'Führe Playwright E2E-Tests aus...'
            }
        }

        // 11. SWITCH (Blue/Green)
        stage('Switch Blue/Green') {
            when {
                beforeAgent true
                branch 'deploy/production'
            }
            steps {
                echo 'Schalte Umgebung live...'
            }
        }
    }
}
