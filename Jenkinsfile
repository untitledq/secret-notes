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

        // 5. BUILD 
        stage('Build Docker Image') {
            agent any
            environment {
                COMMIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
            }
            steps {
                echo 'Baue das Docker-Image lokal auf dem Server...'
                dir('frontend') {
                    withCredentials([string(credentialsId: 'DOCKERHUB_USER', variable: 'DOCKER_USER')]) {
                        sh """
                            docker build -t \$DOCKER_USER/secret-notes-frontend:${COMMIT_SHA} -t \$DOCKER_USER/secret-notes-frontend:latest .
                        """
                    }
                }
            }
        }

        // 6. DELIVER 
        stage('Deliver to Docker Hub') {
            agent any 
            environment {
                COMMIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
            }
            steps {
                echo 'Logge bei Docker Hub ein und pushe die Images...'
                dir('frontend') {
                    withCredentials([
                        string(credentialsId: 'DOCKERHUB_USER', variable: 'DOCKER_USER'),
                        string(credentialsId: 'DOCKERHUB_PASSWORD', variable: 'DOCKER_PASS')
                    ]) {
                        sh """
                            echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                            
                            docker push \$DOCKER_USER/secret-notes-frontend:${COMMIT_SHA}
                            docker push \$DOCKER_USER/secret-notes-frontend:latest
                            
                            docker rmi \$DOCKER_USER/secret-notes-frontend:${COMMIT_SHA}
                            docker rmi \$DOCKER_USER/secret-notes-frontend:latest
                            
                            docker logout
                        """
                    }
                }
                echo 'Frontend erfolgreich auf Docker Hub bereitgestellt!'
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