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
        - "https://juice-shop.herokuapp.com"
      includePaths:
        - "https://juice-shop.herokuapp.com/.*"
      authentication:
        verification:
          loggedInIndicator: ".*Logout.*"
          loggedOutIndicator: ".*Login.*"
      users:
        - name: "test-user"
          credentials:
            username: "admin@juice-sh.op"
            password: "admin123"
      authentication:
        method: "form"
        parameters:
          loginUrl: "https://juice-shop.herokuapp.com/#/login"
          loginRequestData: "email={%username%}&password={%password%}"
jobs:
  - type: "spider"
    parameters:
      context: "JuiceShop-Heroku"
      user: "test-user"
      maxDuration: 30

  - type: "activeScan"
    parameters:
      context: "JuiceShop-Heroku"
      scanPolicyName: "Default Policy"
      maxRuleDurationInMins: 10
      maxScanDurationInMins: 60
      delayInMs: 2000
      target: "https://juice-shop.herokuapp.com"

  - type: "report"
    parameters:
      template: "traditional-html"
      reportFile: "/zap/wrk/reports/juiceshop-heroku-report.html"
      reportDir: "/zap/wrk/reports"
      title: "OWASP ZAP Juice Shop Heroku Scan"
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
                    // Save and display the last 100 lines of logs for debugging
                    sh 'docker logs --tail 100 zap-scan > ${WORKSPACE}/zap_tail.log'
                    sh 'cat ${WORKSPACE}/zap_tail.log'
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
