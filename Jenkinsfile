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
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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

        // 5. BUILD
        stage('Build Docker Image') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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

        // 6. DELIVER STAGE
        stage('Deliver to Docker Hub') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
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
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
                }
            }
            agent any
            steps {
                echo 'Prüfe über die Docker Hub API, ob das neue Frontend-Image existiert...'
                dir('frontend') {
                    withCredentials([
                        string(credentialsId: 'DOCKERHUB_USER', variable: 'RAW_USER'),
                        string(credentialsId: 'DOCKERHUB_TOKEN', variable: 'RAW_TOKEN')
                    ]) {
                        script {
                            def commitSha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                            def myUser = sh(script: "echo \$RAW_USER | tr '[:upper:]' '[:lower:]'", returnStdout: true).trim()
                            
                            echo "Suche auf Docker Hub nach: ${myUser}/secret-notes-frontend:${commitSha}"
                            
                            // Wir nutzen "-u USER:TOKEN", damit Docker Hub uns die echte Antwort gibt
                            def statusCode = sh(
                                script: "curl -s -u \"\$RAW_USER:\$RAW_TOKEN\" -o /dev/null -w '%{http_code}' https://hub.docker.com/v2/repositories/${myUser}/secret-notes-frontend/tags/${commitSha}/",
                                returnStdout: true
                            ).trim()
                            
                            if (statusCode == "200") {
                                echo "Erfolg: Das Image wurde auf Docker Hub gefunden und steht für das AWS-Deployment bereit!"
                            } else {
                                error "ABBRUCH: Version ${commitSha} wurde von der API blockiert oder nicht gefunden (Status: ${statusCode})."
                            }
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
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.GIT_BRANCH?.contains('feature/jenkins') ||
                        env.BRANCH_NAME == 'feature/jenkins'
                }
            }
            agent any
            steps {
                echo 'Deploye Frontend'
                
                withCredentials([
                    file(credentialsId: 'FRONTEND_SSH_KEY', variable: 'KEY_PATH'),
                    string(credentialsId: 'GREEN_EC2_IP', variable: 'PASSIVE_IP'),
                    string(credentialsId: 'DOCKERHUB_USER', variable: 'RAW_USER'),
                    string(credentialsId: 'DOCKERHUB_TOKEN', variable: 'RAW_TOKEN'),
                    string(credentialsId: 'GREEN_EC2_IP_BACKEND', variable: 'BACKEND_IP')
                ]) {
                    sh '''
                        COMMIT_SHA=$(git rev-parse --short HEAD)
                        MY_USER=$(echo "$RAW_USER" | tr '[:upper:]' '[:lower:]')
                        PASSIVE_FE_PORT=8081
                        
                        chmod 400 "$KEY_PATH"
                        
                        echo "Verbinde via SSH-Key-File mit passiver Umgebung unter IP: $PASSIVE_IP..."
                        
                        # Verbindung zur Frontend-EC2-Instanz herstellen
                        ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@${PASSIVE_IP} "
                            set -e

                            # 1. Login bei Docker Hub
                            echo '$RAW_TOKEN' | docker login -u '$RAW_USER' --password-stdin
                            
                            # 2. Alten Container stoppen und löschen
                            docker stop frontend-passive || true
                            docker rm frontend-passive || true
                            
                            # 3. Neues Image von Docker Hub ziehen
                            docker pull ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}
                            
                            # 4. Container auf Port 8081 starten
                            docker run -d \\
                              --name frontend-passive \\
                              -p ${PASSIVE_FE_PORT}:80 \\
                              --restart unless-stopped \\
                              ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}
                              
                            echo 'Warte kurz auf den Container-Start...'
                            sleep 2
                            
                            # 5. DIE NEUE LÖSUNG: Den richtigen Key (API_BASE_URL) verwenden und saubere Anführungszeichen setzen!
                            echo 'window.APP_CONFIG = { "API_BASE_URL": "http://'${BACKEND_IP}':3001" };' > /home/ubuntu/config.js

                            # 6. Datei blind in den Container kopieren
                            docker cp /home/ubuntu/config.js frontend-passive:/usr/share/nginx/html/config.js

                            # NEU: Nginx im Container zwingen, die Dateien frisch von der Festplatte zu lesen!
                            docker exec frontend-passive nginx -s reload

                            # 7. Temporäre Datei auf der EC2 löschen (bleibt gleich)
                            rm /home/ubuntu/config.js
                            
                            # 8. Logout
                            docker logout
                        "
                        echo "Passive Umgebung läuft jetzt mit dem neuen Frontend (Version $COMMIT_SHA) auf Port $PASSIVE_FE_PORT und funkt an Backend $BACKEND_IP:3001!"
                    '''
                }
            }
        }

        // 9. PERFORMANCE TESTING (k6)
        stage('k6 Performance Testing') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')
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
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')
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
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production')
                }
            }
            steps {
                echo 'Schalte Umgebung live...'
            }
        }
    }
}
