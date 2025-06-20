pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        ZAP_PORT = '8090'
        JUICE_SHOP_IMAGE = 'bkimminich/juice-shop'
        JUICE_SHOP_NETWORK = 'zap-juice-net'
    }
    stages {
        stage('Setup Network') {
            steps {
                sh 'docker network create ${JUICE_SHOP_NETWORK} || true'
            }
        }
        
        stage('Start Juice Shop') {
            steps {
                sh 'docker rm -f juiceshop || true'
                sh '''
                    docker run -d --name juiceshop \
                    --network ${JUICE_SHOP_NETWORK} \
                    -p 3000:3000 \
                    --rm ${JUICE_SHOP_IMAGE}
                '''
                sh '''
                    while ! docker run --rm --network ${JUICE_SHOP_NETWORK} \
                    curlimages/curl -s http://juiceshop:3000 >/dev/null; do
                        sleep 1
                        echo "Waiting for JuiceShop..."
                    done
                '''
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    writeFile file: "${WORKSPACE}/auth_plan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop-Auth"
      urls: ["http://juiceshop:3000"]
      includePaths: ["http://juiceshop:3000/.*"]
      authentication:
        method: "json"
        parameters:
          loginUrl: "http://juiceshop:3000/rest/user/login"
          loginRequestData: '{"email":"admin@juice-sh.op","password":"admin123"}'
          authToken: "authentication.token"
          verification:
            loggedInIndicator: "user/.*"

jobs:
  - type: "spider"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin"
      
  - type: "activeScan"
    parameters:
      context: "JuiceShop-Auth"
      user: "admin"
      scanPolicyName: "Default Policy"
      maxScanDurationInMins: 20

  - type: "report"
    parameters:
      template: "traditional-html"
      reportFile: "/zap/wrk/report.html"
"""
                    sh """
                    docker rm -f zap-scan || true
                    docker run --rm --name zap-scan \
                    --network ${JUICE_SHOP_NETWORK} \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    -p ${ZAP_PORT}:${ZAP_PORT} \
                    -t ${ZAP_IMAGE} zap.sh -cmd \
                    -port ${ZAP_PORT} \
                    -config api.disablekey=true \
                    -autorun /zap/wrk/auth_plan.yaml
                    """
                }
            }
        }
    }
    post {
        always {
            sh 'docker stop juiceshop zap-scan || true'
            sh 'docker network rm ${JUICE_SHOP_NETWORK} || true'
            archiveArtifacts artifacts: 'report.html'
        }
    }
}
