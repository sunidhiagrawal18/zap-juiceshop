pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        TARGET_URL = 'https://juice-shop.herokuapp.com'
    }
    
    stages {
        stage('Prepare Workspace') {
            steps {
                sh '''
                    mkdir -p ${WORKSPACE}/plans ${WORKSPACE}/reports
                    chmod -R 777 ${WORKSPACE}
                '''
                // Copy your plan file or create it here
                writeFile file: "${WORKSPACE}/plans/juiceshop_heroku_plan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop-Heroku"
      urls:
        - "${TARGET_URL}"
      includePaths:
        - "${TARGET_URL}/.*"
      authentication:
        type: "form"
        parameters:
          loginUrl: "${TARGET_URL}/#/login"
          loginRequestData: "email={%username%}&password={%password%}&submit="
      users:
        - name: "test-user"
          credentials:
            username: "admin@juice-sh.op"
            password: "admin123"

jobs:
  - name: "spider"
    type: "spider"
    parameters:
      maxDuration: 30

  - name: "active-scan"
    type: "activeScan"
    parameters:
      url: "https://juice-shop.herokuapp.com"
      // context: "JuiceShop-Heroku"
      policy: "Default Policy"
      maxRuleDurationInMins: 10
      maxScanDurationInMins: 60

  - name: "report"
    type: "report"
    parameters:
      template: "traditional-html"
      reportFile: "/zap/wrk/reports/juiceshop-heroku-report.html"
      reportDir: "/zap/wrk/reports"
      reportTitle: "OWASP ZAP Juice Shop Heroku Scan"
"""
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
                          zap.sh -cmd -port 9090 -config api.disablekey=true \
                          -autorun /zap/wrk/plans/juiceshop_heroku_plan.yaml
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'sudo -n chown -R jenkins:jenkins ${WORKSPACE}'
            sh 'docker stop zap-scan || true'
            archiveArtifacts artifacts: 'reports/*.html', allowEmptyArchive: true
        }
    }
}
