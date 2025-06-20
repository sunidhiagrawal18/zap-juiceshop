pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'owasp/zap2docker-stable'
        JUICE_SHOP_URL = 'https://preview.owasp-juice.shop'
        ZAP_PORT = '8090'  // Using non-default port
    }
    stages {
        stage('Start ZAP in Daemon Mode') {
            steps {
                script {
                    sh """
                    docker run -d --name zap-daemon \
                    -p ${ZAP_PORT}:${ZAP_PORT} \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    -e ZAP_JVM_OPTIONS="-Xmx2g -Dzap.script.browserId=firefox-headless" \
                    -t ${ZAP_IMAGE} zap.sh -cmd \
                    -port ${ZAP_PORT} \
                    -config api.disablekey=true \
                    -config connection.timeoutInSecs=60
                    """
                    // Wait for ZAP to initialize
                    sh """
                    while ! curl -s http://localhost:${ZAP_PORT} >/dev/null; do
                        sleep 5
                        echo "Waiting for ZAP to start..."
                    done
                    """
                }
            }
        }

        stage('Run Browser Authentication Scan') {
            steps {
                script {
                    writeFile file: "${WORKSPACE}/browser_auth_scan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop"
      urls: ["${JUICE_SHOP_URL}"]
      includePaths: ["${JUICE_SHOP_URL}/.*"]
      authentication:
        method: "browser"
        parameters:
          loginPageUrl: "${JUICE_SHOP_URL}/#/login"
          browserId: "firefox-headless"
          usernameField: "email"
          passwordField: "password"
          submitField: "loginButton"
          loginPageWait: 15
          postWait: 5
      verification:
        method: "response"
        loggedInIndicator: "logout"
      users:
        - name: "test@test.com"
          credentials:
            username: "test@test.com"
            password: "test123"

jobs:
  - type: "spider"
    parameters:
      context: "JuiceShop"
      user: "test@test.com"
      maxDuration: 10

  - type: "passiveScan"
    parameters:
      maxDuration: 5

  - type: "activeScan"
    parameters:
      context: "JuiceShop"
      user: "test@test.com"
      policy: "Default"
      maxScanDurationInMins: 30
      threadPerHost: 2
      delayInMs: 1000
"""
                    // Execute the scan via ZAP API
                    sh """
                    docker exec zap-daemon \
                    curl -X POST "http://localhost:${ZAP_PORT}/JSON/automation/action/runPlan/" \
                    -H "Content-Type: application/json" \
                    --data-binary @/zap/wrk/browser_auth_scan.yaml
                    """
                    
                    // Monitor scan progress
                    sh """
                    docker exec zap-daemon \
                    curl -s "http://localhost:${ZAP_PORT}/JSON/core/view/version" || true
                    """
                }
            }
        }
    }
    post {
        always {
            // Generate and retrieve report
            sh """
            docker exec zap-daemon \
            curl -X GET "http://localhost:${ZAP_PORT}/OTHER/core/other/htmlreport/" \
            -o /zap/wrk/report.html
            """
            
            // Cleanup
            sh 'docker stop zap-daemon || true'
            sh 'docker rm -f zap-daemon || true'
            archiveArtifacts artifacts: 'report.html'
        }
    }
}
