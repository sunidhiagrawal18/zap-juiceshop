pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        TARGET_URL = 'https://juice-shop.herokuapp.com'
        // Juice Shop default admin credentials
        AUTH_USER = 'admin@juice-sh.op'
        AUTH_PASS = 'admin123'
    }
    stages {
        stage('Authenticated Scan') {
            steps {
                script {
                    sh """
                    docker run --rm --name zap-auth-scan \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    -t ${ZAP_IMAGE} zap.sh -cmd \
                    -config scanner.threadPerHost=8 \
                    -config spider.maxDuration=10 \
                    -config scan.maxDuration=30 \
                    -autorun /zap/wrk/plans/auth_scan.yaml
                    """
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'zap-auth-report.html'
        }
    }
}
