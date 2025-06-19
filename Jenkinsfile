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
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    sh """
                        docker run --rm --network="host" \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -cmd -port 9090 -config api.disablekey=true \
                          -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                }
            }
        }

        stage('Archive Results') {
    steps {
        // Archive both reports if needed
        archiveArtifacts artifacts: 'report.html, juiceShopXmlReport.xml', allowEmptyArchive: false

        publishHTML target: [
            reportDir: '.',
            reportFiles: 'report.html',
            reportName: 'ZAP Report',
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true
        ]
    }
}
    
}

    post {
        always {
            // Stop containers (in case they’re still running)
            sh 'docker stop zap-scan || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
