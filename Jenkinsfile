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
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')*/
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
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')*/
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
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')*/
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
                        npm run test:coverage
                    '''
                }
                archiveArtifacts artifacts: 'frontend/coverage/**', allowEmptyArchive: true
            }
        }

        // 4. SONARQUBE
        stage('SonarQube Analysis') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')*/
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
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')*/
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
                            docker build -f Dockerfile -t local-frontend:$COMMIT_SHA -t local-frontend:latest ..
                        '''
                    }
                }
            }
        }

        // 5. DELIVER STAGE
        stage('Deliver to Docker Hub') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
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
                echo 'Frontend erfolgreich via Token auf Docker Hub bereitgestellt!'
            }
        }

        // 7. CHECK ARTEFACTS (Sicherstellen, dass das neue Frontend-Image existiert)
        stage('Check Artefacts') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
            }
            agent any
            steps {
                echo 'Prüfe, ob das lokal gebaute Frontend-Image die korrekte Versionsnummer hat...'
                dir('frontend') {
                    script {
                        def commitSha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        def myUser = sh(script: "echo \$RAW_USER | tr '[:upper:]' '[:lower:]'", returnStdout: true).trim()
                        
                        echo "Prüfe auf Docker Hub nach Version: ${commitSha}"
                        
                        // Sendet eine Anfrage an Docker Hub. HTTP 200 bedeutet das Image ist online da.
                        def statusCode = sh(
                            script: "curl -s -o /dev/null -w '%{http_code}' https://hub.docker.com/v2/repositories/${myUser}/secret-notes-frontend/tags/${commitSha}/",
                            returnStdout: true
                        ).trim()
                        
                        if (statusCode == "200") {
                            echo "✅ Erfolg: Das Frontend-Image wurde erfolgreich auf Docker Hub verifiziert!"
                        } else {
                            error "❌ ABBRUCH: Version ${commitSha} wurde nicht auf Docker Hub gefunden (Status: ${statusCode})."
                        }
                    }
                }
            }
        }
        
        // 8. DEPLOY
        stage('Deploy to Passive (Blue/Green-AWS)') {
           when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
            }
            agent any
            steps {
                echo 'Deploye Frontend'
                
                withCredentials([
                    file(credentialsId: 'FRONTEND_SSH_KEY', variable: 'KEY_PATH'),
                    string(credentialsId: 'GREEN_EC2_IP', variable: 'PASSIVE_IP'),
                    string(credentialsId: 'DOCKERHUB_USER', variable: 'RAW_USER'),
                    string(credentialsId: 'DOCKERHUB_TOKEN', variable: 'RAW_TOKEN')
                ]) {
                    sh '''
                        COMMIT_SHA=$(git rev-parse --short HEAD)
                        MY_USER=$(echo "$RAW_USER" | tr '[:upper:]' '[:lower:]')
                        PASSIVE_FE_PORT=8081
                        
                        chmod 400 "$KEY_PATH"
                        
                        echo "Verbinde via SSH-Key-File mit passiver Umgebung unter IP: $PASSIVE_IP..."
                        
                        # Wir nutzen das extrahierte Secret $PASSIVE_IP für die Verbindung
                        ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@${PASSIVE_IP} "

                            # 1. Auf der EC2-Instanz bei Docker Hub anmelden
                            echo '$RAW_TOKEN' | docker login -u '$RAW_USER' --password-stdin
                            
                            # 2. Alten passiven Frontend-Container entfernen
                            docker stop frontend-passive || true
                            docker rm frontend-passive || true
                            
                            # 3. Das frisch gepushte Image ziehen
                            docker pull ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}
                            
                            # 4. Den neuen passiven Frontend-Container starten
                            docker run -d \
                              --name frontend-passive \
                              -p ${PASSIVE_FE_PORT}:80 \
                              ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}
                              
                            docker logout
                        "
                        echo "Passive Umgebung läuft jetzt mit dem neuen Frontend (Version $COMMIT_SHA) auf Port $PASSIVE_FE_PORT!"
                    '''
                }
            }
        }

        // 9. PERFORMANCE TESTING (k6)
        stage('k6 Performance Testing') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
            }
            steps {
                echo 'Führe k6 Performance-Tests aus...'
            }
        }

        // 10. E2E TESTING (Playwright)
        stage('Playwright E2E Testing') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
            }
            steps {
                echo 'Führe Playwright E2E-Tests aus...'
            }
        }

        // 11. SWITCH (Blue/Green)
        stage('Switch Blue/Green') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'feature/jenkins' || 
                        env.GIT_BRANCH?.contains('feature/jenkins')
                    /*return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')*/
                }
            }
            steps {
                echo 'Schalte Umgebung live...'
            }
        }
    }
}
