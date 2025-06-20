pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
        ZAP_PORT = '9090'
    }
    
    stages {     
        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh 'while ! curl -s http://localhost:${JUICESHOP_PORT} >/dev/null; do sleep 1; echo "Waiting for JuiceShop to start..."; done'
                    echo "JuiceShop is now running and ready for testing"
                }
            }
        }

        stage('Start ZAP Daemon') {
            steps {
                script {
                    sh """
                        docker rm -f zap-daemon || true
                        docker run -d --name zap-daemon --network="host" \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -daemon -port ${ZAP_PORT} -config api.disablekey=true -host 0.0.0.0
                    """
                    // Wait for ZAP to be ready
                    sh 'while ! curl -s http://localhost:${ZAP_PORT} >/dev/null; do sleep 1; echo "Waiting for ZAP to start..."; done'
                }
            }
        }

        stage('Debug Workspace Permissions') {
            steps {
                sh '''
                    chmod -R 777 ${WORKSPACE} || true
                '''
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    sh """
                        docker run --rm --network="host" \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -cmd -port ${ZAP_PORT} -config api.disablekey=true \
                          -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                }
            }
        }
    }

    post {
        always {
            // Stop containers (in case they're still running)
            sh 'sudo -n chown -R jenkins:jenkins ${WORKSPACE}'
            sh 'docker stop zap-daemon || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
