pipeline {
    agent any
    environment {
        ZAP_IMAGE = 'owasp/zap2docker-stable'  // Using official stable image
        JUICE_SHOP_IMAGE = 'bkimminich/juice-shop'
        NETWORK_NAME = 'zap-net-${BUILD_ID}'  // Unique network per build
    }
    stages {
        stage('Setup Environment') {
            steps {
                script {
                    // Create unique network for this build
                    sh "docker network create ${NETWORK_NAME}"
                    
                    // Pull images in parallel for faster startup
                    parallel(
                        'Pull ZAP': { sh "docker pull ${ZAP_IMAGE}" },
                        'Pull Juice Shop': { sh "docker pull ${JUICE_SHOP_IMAGE}" }
                    )
                }
            }
        }

        stage('Start Juice Shop') {
            steps {
                script {
                    sh """
                    docker run -d --name juiceshop \
                    --network ${NETWORK_NAME} \
                    -p 3000:3000 \
                    --rm ${JUICE_SHOP_IMAGE}
                    """
                    // Wait for Juice Shop to be ready
                    sh """
                    docker run --rm --network ${NETWORK_NAME} \
                    curlimages/curl \
                    --max-time 120 \
                    --retry 10 \
                    --retry-delay 5 \
                    --retry-max-time 60 \
                    http://juiceshop:3000
                    """
                }
            }
        }

        stage('Configure Scan') {
            steps {
                script {
                    // Create authentication script
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
                    // Create scan configuration
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

        stage('Run ZAP Scan') {
            steps {
                script {
                    sh """
                    docker run --rm --name zap-scan \
                    --network ${NETWORK_NAME} \
                    -v ${WORKSPACE}:/zap/wrk:rw \
                    -p 8080:8080 \
                    -e ZAP_JVM_OPTIONS="-Xmx2g" \
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
            script {
                // Cleanup containers
                sh 'docker stop juiceshop zap-scan || true'
                
                // Remove network
                sh "docker network rm ${NETWORK_NAME} || true"
                
                // Archive results
                archiveArtifacts artifacts: 'report.html'
                
                // Store console output
                archiveArtifacts artifacts: 'zap.log', allowEmptyArchive: true
            }
        }
    }
}
