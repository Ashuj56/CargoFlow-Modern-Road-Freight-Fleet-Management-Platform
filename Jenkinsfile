pipeline {
    agent any

    environment {
        ACR_NAME        = 'cargoflowacr'
        ACR_REGISTRY    = 'cargoflowacr.azurecr.io'
        IMAGE_TAG       = "${GIT_COMMIT[0..7]}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out latest code from GitHub...'
                checkout scm
            }
        }

        stage('Install') {
            parallel {
                stage('Backend: npm ci') {
                    steps {
                        dir('backend') {
                            echo 'Installing backend dependencies...'
                            sh 'npm ci'
                        }
                    }
                }
                stage('Customer Portal: npm ci') {
                    steps {
                        dir('customer-portal') {
                            echo 'Installing customer-portal dependencies...'
                            sh 'npm ci'
                        }
                    }
                }
                stage('Owner Portal: npm ci') {
                    steps {
                        dir('owner-portal') {
                            echo 'Installing owner-portal dependencies...'
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Test') {
            steps {
                dir('backend') {
                    echo 'Running Jest + Supertest integration tests...'
                    sh 'npm test -- --runInBand --ci'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/jest-results.xml'
                }
            }
        }

        stage('Docker Build') {
            parallel {
                stage('Build: backend') {
                    steps {
                        echo 'Building cargoflow-backend image...'
                        sh """
                            docker build -t ${ACR_REGISTRY}/cargoflow-backend:${IMAGE_TAG} \
                                         -t ${ACR_REGISTRY}/cargoflow-backend:latest \
                                         ./backend
                        """
                    }
                }
                stage('Build: customer-portal') {
                    steps {
                        echo 'Building cargoflow-customer-portal image...'
                        sh """
                            docker build -t ${ACR_REGISTRY}/cargoflow-customer-portal:${IMAGE_TAG} \
                                         -t ${ACR_REGISTRY}/cargoflow-customer-portal:latest \
                                         ./customer-portal
                        """
                    }
                }
                stage('Build: owner-portal') {
                    steps {
                        echo 'Building cargoflow-owner-portal image...'
                        sh """
                            docker build -t ${ACR_REGISTRY}/cargoflow-owner-portal:${IMAGE_TAG} \
                                         -t ${ACR_REGISTRY}/cargoflow-owner-portal:latest \
                                         ./owner-portal
                        """
                    }
                }
            }
        }

        stage('Push to ACR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'acr-credentials',
                    usernameVariable: 'ACR_USER',
                    passwordVariable: 'ACR_PASS'
                )]) {
                    sh "echo $ACR_PASS | docker login ${ACR_REGISTRY} -u $ACR_USER --password-stdin"
                }
                echo 'Pushing all images to Azure Container Registry...'
                sh """
                    docker push ${ACR_REGISTRY}/cargoflow-backend:${IMAGE_TAG}
                    docker push ${ACR_REGISTRY}/cargoflow-backend:latest

                    docker push ${ACR_REGISTRY}/cargoflow-customer-portal:${IMAGE_TAG}
                    docker push ${ACR_REGISTRY}/cargoflow-customer-portal:latest

                    docker push ${ACR_REGISTRY}/cargoflow-owner-portal:${IMAGE_TAG}
                    docker push ${ACR_REGISTRY}/cargoflow-owner-portal:latest
                """
                echo "All images pushed to ${ACR_REGISTRY} with tag: ${IMAGE_TAG}"
                echo "Azure DevOps CD pipeline will be triggered automatically by ACR push event."
            }
        }
    }

    post {
        success {
            echo 'CargoFlow CI pipeline succeeded - CD pipeline will start shortly.'
        }
        failure {
            echo 'CargoFlow CI pipeline failed. Review logs above.'
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
