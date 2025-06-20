pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:2.12.0'  // Specific version
        JUICE_SHOP_IMAGE = 'bkimminich/juice-shop'
        NETWORK_NAME = 'zap-net'
    }
    stages {
        stage('Setup Network') {
            steps {
                sh 'docker network create ${NETWORK_NAME} || true'
            }
        }

        stage('Start Juice Shop') {
            steps {
                sh 'docker rm -f juiceshop || true'
                sh """
                docker run -d --name juiceshop \
                --network ${NETWORK_NAME} \
                -p 3000:3000 \
                --rm ${JUICE_SHOP_IMAGE}
                """
                sh """
                while ! docker run --rm --network ${NETWORK_NAME} \
                curlimages/curl -s http://juiceshop:3000 >/dev/null; do
                    sleep 1
                    echo "Waiting for JuiceShop to start..."
                done
                """
            }
        }

        stage('Prepare Scan') {
            steps {
                script {
                    // Create the authentication script
                    writeFile file: "${WORKSPACE}/juice_auth.js", text: """
function authenticate(helper, params, credentials) {
    var loginUrl = 'http://juiceshop:3000/rest/user/login';
    var request = helper.prepareMessage();
    request.getRequestHeader().setURI(new java.net.URI(loginUrl, false));
    request.getRequestHeader().setMethod('POST');
    request.getRequestHeader().setHeader('Content-Type', 'application/json');
    request.setRequestBody('{"email":"admin@juice-sh.op","password":"admin123"}');
    helper.sendAndReceive(request);
    return request.getResponseHeader().getStatusCode() == 200;
}

function getRequiredParamsNames() {
    return [];
}
"""
                    // Create the scan plan
                    writeFile file: "${WORKSPACE}/scan.yaml", text: """
env:
  contexts:
    - name: "JuiceShop"
      urls: ["http://juiceshop:3000"]
      includePaths: ["http://juiceshop:3000/.*"]
      authentication:
        method: "script"
        parameters:
          script: "juice_auth.js"
          scriptEngine: "ECMAScript"
      sessionManagement:
        method: "cookie"

jobs:
  - type: "script"
    parameters:
      action: "add"
      type: "authentication"
      engine: "ECMAScript"
      name: "juice_auth.js"
      file: "/zap/wrk/juice_auth.js"

  - type: "spider"
    parameters:
      context: "JuiceShop"
      maxDuration: 5

  - type: "activeScan"
    parameters:
      context: "JuiceShop"
      policy: "Default"
      maxScanDurationInMins: 15
      threadPerHost: 3

  - type: "report"
    parameters:
      template: "traditional-html"
      reportFile: "/zap/wrk/report.html"
"""
                }
            }
        }

        stage('Run Scan') {
            steps {
                script {
                    sh """
                    docker rm -f zap-scan || true
                    docker run --rm --name zap-scan \
                    --network ${NETWORK_NAME} \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    -p 8080:8080 \
                    -t ${ZAP_IMAGE} zap.sh -cmd \
                    -port 8080 \
                    -config api.disablekey=true \
                    -config scanner.threadPerHost=3 \
                    -autorun /zap/wrk/scan.yaml
                    """
                }
            }
        }
    }
    post {
        always {
            sh 'docker stop juiceshop zap-scan || true'
            sh 'docker network rm ${NETWORK_NAME} || true'
            archiveArtifacts artifacts: 'report.html'
        }
    }
}
