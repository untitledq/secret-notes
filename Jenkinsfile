pipeline {
    agent any 

    options {
        disableConcurrentBuilds()
    }

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
                        env.GIT_BRANCH?.contains('deploy/production')
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
                        env.GIT_BRANCH?.contains('deploy/production')
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
                        env.GIT_BRANCH?.contains('deploy/production')
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
                        env.GIT_BRANCH?.contains('deploy/production')
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
                        -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js,**/*.config.js \
                        -Dsonar.tests=. \
                        -Dsonar.test.inclusions=**/*.test.js \
                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.token=${SONAR_TOKEN} \
                        -Dsonar.qualitygate.wait=true \
                        -Dsonar.userHome=\$(pwd)/.sonar
                    '''
                }
            }
        }

        // BACKEND: same stages as in GitLab; deliver/deploy is done by GitLab only
        stage('Backend Lint') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')
                }
            }
            agent {
                docker { 
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('backend') {
                    sh '''
                        rm -rf node_modules .npm-cache
                        export npm_config_cache=\$(pwd)/.npm-cache
                        npm ci --no-audit
                        npm run lint
                    '''
                }
            }
        }

        stage('Backend Snyk Scan') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')
                }
            }
            agent {
                docker { 
                    image 'snyk/snyk:node'
                }
            }
            environment {
                SNYK_TOKEN = credentials('SNYK_TOKEN')
                HOME = "${WORKSPACE}/backend"
            }
            steps {
                dir('backend') {
                    sh 'snyk test --severity-threshold=high'
                }
            }
        }

        stage('Backend Unit Tests & Coverage') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')
                }
            }
            agent any
            steps {
                sh '''
                    NET=sn-test-${BUILD_NUMBER}
                    DB=sn-test-db-${BUILD_NUMBER}

                    docker network create $NET || true
                    docker run -d --rm --name $DB --network $NET \
                      -e POSTGRES_DB=secret_notes -e POSTGRES_USER=secret -e POSTGRES_PASSWORD=secret \
                      postgres:17.4-alpine3.21

                    sleep 8

                    # -u + HOME=/tmp: Dateien gehoeren dem Jenkins-User, sonst bricht cleanWs() im naechsten Lauf
                    docker run --rm --network $NET -v "$PWD/backend":/app -w /app \
                      -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
                      -e DATABASE_URL=postgresql://secret:secret@$DB:5432/secret_notes \
                      node:20 sh -c "npm ci --no-audit && npx prisma generate && npx prisma migrate deploy && npm run test:coverage" \
                      || { docker stop $DB || true; docker network rm $NET || true; exit 1; }

                    docker stop $DB || true
                    docker network rm $NET || true
                '''
                archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            }
        }

        stage('Backend SonarQube Analysis') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')
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
                dir('backend') {
                    sh '''
                        sonar-scanner \
                        -Dsonar.projectKey=secret-notes-backend \
                        -Dsonar.projectName="Secret Notes Backend" \
                        -Dsonar.sources=. \
                        -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js \
                        -Dsonar.tests=. \
                        -Dsonar.test.inclusions=**/*.test.js \
                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.token=${SONAR_TOKEN} \
                        -Dsonar.qualitygate.wait=true \
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
                        env.BRANCH_NAME == 'develop' ||
                    env.GIT_BRANCH?.contains('develop') 
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
                            COMMIT_SHA=$(git rev-parse --short=8 HEAD)
                            
                            export DOCKER_BUILDKIT=0
                            
                            # Wir bauen das Image lokal direkt mit dem richtigen Namen
                            docker build -f Dockerfile -t local-frontend:$COMMIT_SHA -t local-frontend:latest ..
                        '''
                    }
                }
            }
        }


        stage('Build Backend Docker Image') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'main' || 
                        env.BRANCH_NAME == 'deploy/production' || 
                        env.GIT_BRANCH?.contains('main') || 
                        env.GIT_BRANCH?.contains('deploy/production')
                }
            }
            agent any
            steps {
                sh '''
                    COMMIT_SHA=$(git rev-parse --short=8 HEAD)
                    export DOCKER_BUILDKIT=0
                    docker build -t local-backend:$COMMIT_SHA ./backend
                    docker rmi local-backend:$COMMIT_SHA
                '''
            }
        }

        // 6. DELIVER STAGE
        stage('Deliver to Docker Hub') {
            when {
                beforeAgent true
                expression { 
                    return env.BRANCH_NAME == 'deploy/production' ||
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.BRANCH_NAME == 'develop' ||
                    env.GIT_BRANCH?.contains('develop') 
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
                            COMMIT_SHA=$(git rev-parse --short=8 HEAD)
                            
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
                        env.BRANCH_NAME == 'develop' ||
                    env.GIT_BRANCH?.contains('develop') 
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
                            def commitSha = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
                            def myUser = sh(script: "echo \$RAW_USER | tr '[:upper:]' '[:lower:]'", returnStdout: true).trim()

                            ['secret-notes-frontend', 'secret-notes-backend'].each { repo ->
                                echo "Suche auf Docker Hub nach: ${myUser}/${repo}:${commitSha}"

                                def found = false
                                for (int i = 0; i < 6; i++) {
                                    def statusCode = sh(
                                        script: "curl -s -u \"\$RAW_USER:\$RAW_TOKEN\" -o /dev/null -w '%{http_code}' https://hub.docker.com/v2/repositories/${myUser}/${repo}/tags/${commitSha}/",
                                        returnStdout: true
                                    ).trim()

                                    if (statusCode == "200") {
                                        found = true
                                        break
                                    }
                                    echo "Noch nicht da (Status ${statusCode}), warte 30s..."
                                    sleep 30
                                }

                                if (found) {
                                    echo "Erfolg: ${repo}:${commitSha} wurde auf Docker Hub gefunden!"
                                } else {
                                    error "ABBRUCH: ${repo}:${commitSha} wurde auf Docker Hub nicht gefunden."
                                }
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
                        env.BRANCH_NAME == 'develop' ||
                    env.GIT_BRANCH?.contains('develop') 
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
                        COMMIT_SHA=$(git rev-parse --short=8 HEAD)
                        MY_USER=$(echo "$RAW_USER" | tr '[:upper:]' '[:lower:]')

                        chmod 400 "$KEY_PATH"

                        # blue/green: read the active color, deploy into the passive one
                        ACTIVE=$(ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@${PASSIVE_IP} "cat /home/ubuntu/active_color 2>/dev/null || echo blue")
                        if [ "$ACTIVE" = "blue" ]; then PASSIVE=green; PASSIVE_FE_PORT=8082; else PASSIVE=blue; PASSIVE_FE_PORT=8081; fi
                        echo "Active is $ACTIVE - deploying to $PASSIVE (port $PASSIVE_FE_PORT)"

                        # remember color/port for the Playwright and switch stages
                        echo "$PASSIVE" > .passive_color
                        echo "$PASSIVE_FE_PORT" > .passive_fe_port

                        # config.js points at the backend PROXY (:3000), so the
                        # frontend survives backend switches without a redeploy
                        echo "window.APP_CONFIG = { \\"API_BASE_URL\\": \\"http://${BACKEND_IP}:3000\\" };" > local-config.js

                        echo "Verbinde via SSH-Key-File mit passiver Umgebung unter IP: $PASSIVE_IP..."

                        scp -i "$KEY_PATH" -o StrictHostKeyChecking=no local-config.js ubuntu@${PASSIVE_IP}:/home/ubuntu/config.js

                        ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@${PASSIVE_IP} "
                            set -e

                            echo '$RAW_TOKEN' | docker login -u '$RAW_USER' --password-stdin

                            docker stop frontend-${PASSIVE} || true
                            docker rm frontend-${PASSIVE} || true

                            docker pull ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}

                            docker run -d \\
                              --name frontend-${PASSIVE} \\
                              -p ${PASSIVE_FE_PORT}:80 \\
                              --restart unless-stopped \\
                              ${MY_USER}/secret-notes-frontend:${COMMIT_SHA}

                            echo 'Warte kurz auf den Container-Start...'
                            sleep 2

                            docker cp /home/ubuntu/config.js frontend-${PASSIVE}:/usr/share/nginx/html/config.js

                            rm /home/ubuntu/config.js

                            docker restart frontend-${PASSIVE}

                            docker logout
                        "
                        echo "Passive environment ($PASSIVE) now runs frontend $COMMIT_SHA on port $PASSIVE_FE_PORT, backend proxy: $BACKEND_IP:3000"
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
                        env.GIT_BRANCH?.contains('deploy/production') ||
                        env.BRANCH_NAME == 'develop' ||
                    env.GIT_BRANCH?.contains('develop') 
                }
            }
            steps {
                echo 'Führe k6 Performance-Tests aus...'
                withCredentials([string(credentialsId: 'GREEN_EC2_IP_BACKEND', variable: 'BACKEND_IP')]) {
                    sh '''
                        docker run --rm -v "$PWD/performance":/perf \
                          -e K6_BASE_URL="http://${BACKEND_IP}:3000" \
                          -e K6_VUS=3 \
                          -e K6_DURATION=30s \
                          grafana/k6:0.54.0 run /perf/k6/notes-performance.js
                    '''
                }
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
                withCredentials([string(credentialsId: 'GREEN_EC2_IP', variable: 'FRONTEND_IP')]) {
                    sh '''
                        PASSIVE_FE_PORT=$(cat .passive_fe_port)

                        # -u + HOME=/tmp: node_modules gehoeren dem Jenkins-User, sonst bricht cleanWs()
                        docker run --rm -v "$PWD":/work -w /work \
                          -u "$(id -u):$(id -g)" \
                          -e HOME=/tmp \
                          -e FRONTEND_URL="http://${FRONTEND_IP}:${PASSIVE_FE_PORT}" \
                          mcr.microsoft.com/playwright:v1.61.1-jammy \
                          sh -c "npm ci --no-audit && npx playwright test e2e/playwright"
                    '''
                }
                archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
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
                withCredentials([
                    file(credentialsId: 'FRONTEND_SSH_KEY', variable: 'KEY_PATH'),
                    string(credentialsId: 'GREEN_EC2_IP', variable: 'FRONTEND_IP')
                ]) {
                    sh '''
                        chmod 400 "$KEY_PATH"
                        PASSIVE=$(cat .passive_color)

                        ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@${FRONTEND_IP} "sudo /usr/local/bin/switch-frontend.sh ${PASSIVE}"

                        echo "Frontend traffic now on ${PASSIVE}"
                    '''
                }
            }
        }
    }

    post {
        failure {
            withCredentials([string(credentialsId: 'SLACK_WEBHOOK_URL', variable: 'WEBHOOK')]) {
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                      --data "{\\"text\\":\\"Jenkins-Pipeline fehlgeschlagen: ${JOB_NAME} #${BUILD_NUMBER} (${GIT_BRANCH})\\n${BUILD_URL}\\"}" \
                      "$WEBHOOK"
                '''
            }
        }
    }
}
