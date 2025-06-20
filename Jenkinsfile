pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        LOCAL_JUICESHOP = 'http://localhost:3000'
    }
    stages {
        stage('Start Juice Shop') {
            steps {
                sh 'docker run -d --name juiceshop -p 3000:3000 --rm bkimminich/juice-shop'
                sh '''
                    while ! curl -s http://localhost:3000 >/dev/null; do 
                        sleep 1
                        echo "Waiting for JuiceShop..."
                    done
                '''
            }
        }
        
        stage('Authenticated Scan') {
            steps {
                script {
                    writeFile file: "${WORKSPACE}/auth_plan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop-Auth"
      urls: ["${LOCAL_JUICESHOP}"]
      includePaths: ["${LOCAL_JUICESHOP}/.*"]
      authentication:
        method: "json"
        parameters:
          loginUrl: "${LOCAL_JUICESHOP}/rest/user/login"
          loginRequestData: '{"email":"admin@juice-sh.op","password":"admin123"}'
          authToken: "authentication.token"
      verification:
        loggedInIndicator: ".*user/.*"
      users:
        - name: "admin"
          credentials:
            username: "admin@juice-sh.op"
            password: "admin123"

jobs:
  - type: "spider"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin"
      maxDuration: 5

  - type: "activeScan"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin"
      policy: "Default Policy"
      maxDuration: 20

  - type: "report"
    parameters:
      template: "traditional-html"
      reportFile: "/zap/wrk/report.html"
"""
                    
                    sh """
                    docker run --rm --name zap-scan \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    --network host \
                    -t ${ZAP_IMAGE} zap.sh -cmd \
                    -autorun /zap/wrk/auth_plan.yaml
                    """
                }
            }
        }
    }
    post {
        always {
            sh 'docker stop juiceshop zap-scan || true'
            archiveArtifacts artifacts: 'report.html'
        }
    }
}
