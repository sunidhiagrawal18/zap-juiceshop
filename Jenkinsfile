pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        // Define variables here
        TARGET_URL = 'https://juice-shop.herokuapp.com'
        AUTH_USER = 'admin@juice-sh.op'
        AUTH_PASS = 'admin123'
    }
    stages {
        stage('Prepare Auth Config') {
            steps {
                // Create the YAML file with actual values instead of variables
                writeFile file: "${WORKSPACE}/auth_scan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop-Auth"
      urls:
        - "https://juice-shop.herokuapp.com"  # Hardcoded URL
      includePaths:
        - "https://juice-shop.herokuapp.com/.*"
      authentication:
        method: "form"
        parameters:
          loginUrl: "https://juice-shop.herokuapp.com/#/login"
          loginRequestData: "email={%username%}&password={%password%}&submit="
      verification:
        loggedInIndicator: ".*Logout.*"
        loggedOutIndicator: ".*Login.*"
      users:
        - name: "admin-user"
          credentials:
            username: "admin@juice-sh.op"
            password: "admin123"

jobs:
  - type: "spider"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin-user"

  - type: "ajaxSpider"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin-user"
      maxDuration: 5

  - type: "activeScan"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin-user"
      scanPolicyName: "Default Policy"
      maxScanDurationInMins: 30

  - type: "report"
    parameters:
      template: "traditional-html-plus"
      reportFile: "/zap/wrk/zap-auth-report.html"
"""
            }
        }

        stage('Run Authenticated Scan') {
            steps {
                script {
                    sh """
                    docker run --rm --name zap-auth-scan \\
                    -v ${WORKSPACE}:/zap/wrk:rw \\
                    -t ${ZAP_IMAGE} zap.sh -cmd \\
                    -config scanner.threadPerHost=8 \\
                    -config spider.maxDuration=10 \\
                    -config scan.maxDuration=30 \\
                    -autorun /zap/wrk/auth_scan.yaml
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
