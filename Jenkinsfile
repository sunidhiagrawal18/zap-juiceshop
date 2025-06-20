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
        
        stage('Prepare Scripts') {
            steps {
                script {
                    // Create scripts directory
                    sh 'mkdir -p ${WORKSPACE}/scripts'
                    
                    // Create authentication script
                    writeFile file: "${WORKSPACE}/scripts/JuiceShopAuth.js", text: """
function authenticate(helper, params, credentials) {
    var loginUrl = 'http://juiceshop:3000/rest/user/login';
    var request = helper.prepareMessage();
    request.getRequestHeader().setURI(new java.net.URI(loginUrl, false));
    request.getRequestHeader().setMethod('POST');
    request.getRequestHeader().setHeader('Content-Type', 'application/json');
    request.setRequestBody('{"email":"admin@juice-sh.op","password":"admin123"}');
    helper.sendAndReceive(request);
    var response = JSON.parse(request.getResponseBody().toString());
    return response.authentication.token;
}

function getRequiredParamsNames() {
    return ['username', 'password'];
}

function getOptionalParamsNames() {
    return [];
}

function getCredentialsParamsNames() {
    return ['username', 'password'];
}
"""
                }
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
        method: "script"
        parameters:
          script: "JuiceShopAuth.js"
          scriptEngine: "ECMAScript"
      users:
        - name: "admin"
          credentials:
            username: "admin@juice-sh.op"
            password: "admin123"

jobs:
  - type: "script"
    parameters:
      action: "add"
      type: "authentication"
      engine: "ECMAScript"
      name: "JuiceShopAuth.js"
      file: "/zap/wrk/scripts/JuiceShopAuth.js"

  - type: "spider"
    parameters:
      context: "JuiceShop-Auth"
      maxDuration: 5

  - type: "activeScan"
    parameters:
      context: "JuiceShop-Auth"
      policy: "Default"
      threadPerHost: 3
      maxScanDurationInMins: 15
      delayInMs: 1000

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
                    -config scanner.threadPerHost=3 \
                    -config scanner.delayInMs=1000 \
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
