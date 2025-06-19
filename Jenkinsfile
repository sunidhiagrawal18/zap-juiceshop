pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        JUICESHOP_PORT = '3000'
    }
    
    stages {
        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh 'while ! curl -s http://localhost:${JUICESHOP_PORT} >/dev/null; do sleep 1; done'
                }
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    sh """
                        docker rm -f zap-scan || true
                        docker run -d --name zap-scan --network="host" \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -daemon -port 9090 -config api.disablekey=true \
                          -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                }
            }
        }
        
        stage('Wait for ZAP Completion') {
            steps {
                sh '''
                    # Wait for ZAP to finish scanning
                    while docker logs zap-scan | grep -q "Scan progress"; do
                        sleep 10
                        echo "Scan in progress..."
                    done
                '''
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
