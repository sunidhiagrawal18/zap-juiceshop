pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
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
                    sh '''
                        docker rm -f zap-scan || true
                        docker run --name zap-scan --network="host" \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -daemon -host 0.0.0.0 -port 9090 -config api.disablekey=true \
                          -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml &
        
                        # Wait for ZAP to write logs (avoid race condition)
                        sleep 10
        
                        # Poll logs until automation plan completes
                        while ! docker logs zap-scan 2>&1 | grep -q "Automation plan succeeded!"; do
                          echo "Waiting for ZAP scan to finish..."
                          sleep 5
                        done
        
                        echo "ZAP scan completed!"
        
                        # Stop and remove the container
                        docker stop zap-scan
                        docker rm zap-scan
                    '''
                }
            }
        }    
}

    post {
        always {
            // Stop containers (in case they’re still running)
            sh 'sudo -n chown -R jenkins:jenkins ${WORKSPACE}'
            sh 'docker stop zap-scan || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
