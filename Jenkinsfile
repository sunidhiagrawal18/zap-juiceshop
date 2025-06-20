pipeline {
    agent any

    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: "${GITHUB_REPO}",
                    credentialsId: 'github-credentials'
            }
        }

        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh 'while ! curl -s http://localhost:${JUICESHOP_PORT} > /dev/null; do sleep 1; done'
                }
            }
        }

        stage('Start ZAP Daemon') {
            steps {
                script {
                    sh '''
                          mkdir -p ${WORKSPACE}/.zap_home
                          chmod -R 777 ${WORKSPACE}
                        
                          docker run -d --name zap-scan --network=host \
                            --user $(id -u):$(id -g) \
                            -v ${WORKSPACE}:/zap/wrk:rw \
                            -e HOME=/zap/wrk/.zap_home \
                            ${ZAP_IMAGE} zap.sh \
                            -daemon -dir /zap/wrk/.zap_home \
                            -host 0.0.0.0 -port 9090 \
                            -config api.disablekey=true \
                            -config api.addrs.addr.name=.* \
                            -config api.addrs.addr.regex=true
                        '''
                }
            }
        }

        stage('Run ZAP Automation Plan') {
            steps {
                script {
                    sh '''
                        echo "Triggering ZAP scan plan via API..."
                        docker exec zap-scan curl -s -X POST \
                            "http://localhost:9090/JSON/automation/action/runPlan/?fileName=/zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml"
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker stop zap-scan || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
