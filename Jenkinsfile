pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
        TARGET_URL = 'http://localhost:3000/'
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
                    sh """
                        docker rm -f zap-scan || true
                        docker run --name zap-scan --network="host" \
                            -v ${WORKSPACE}:/zap/wrk:rw \
                            -t ${ZAP_IMAGE} \
                             zap.sh -cmd -port 9090 \
                            -quickurl ${TARGET_URL} \
                            -quickprogress \
                            -config scanner.threadPerHost=10 \
                            -config spider.maxDuration=5 \
                            -config ajaxSpider.maxDuration=2 \
                            -config scan.maxDuration=15 \
                            -quickout /zap/wrk/zap_quick_report.html
                    """
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
