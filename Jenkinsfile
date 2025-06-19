pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        JUICESHOP_PORT = '3000'
        ZAP_PORT = '9090'
        WORKSPACE_PERM = '777'  // Temporary for debugging
    }
    
    stages {
        stage('Setup Environment') {
            steps {
                sh 'echo "Current workspace: ${WORKSPACE}"'
                sh 'ls -la ${WORKSPACE}'
                sh 'mkdir -p ${WORKSPACE}/reports'
                sh 'chmod -R ${WORKSPACE_PERM} ${WORKSPACE}'
            }
        }
        
        stage('Start JuiceShop') {
            steps {
                script {
                    try {
                        sh "docker rm -f juiceshop || true"
                        sh """
                            docker run -d \
                            --name juiceshop \
                            -p ${JUICESHOP_PORT}:3000 \
                            --rm ${JUICESHOP_IMAGE}
                        """
                        sh """
                            timeout 120 bash -c '
                            while ! curl -sf http://localhost:${JUICESHOP_PORT}; do
                                sleep 5
                                echo "Waiting for JuiceShop..."
                            done'
                        """
                    } catch (err) {
                        error "Failed to start JuiceShop: ${err}"
                    }
                }
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    try {
                        // Cleanup previous runs
                        sh 'docker rm -f zap-scan || true'
                        
                        // Run ZAP with debug options
                        sh """
                            docker run -d \
                            --name zap-scan \
                            --network=host \
                            -v ${WORKSPACE}:/zap/wrk:rw \
                            -e ZAP_JVM_OPTS="-Xmx2g -Ddebug=true" \
                            -t ${ZAP_IMAGE} \
                            zap.sh \
                            -daemon \
                            -port ${ZAP_PORT} \
                            -config api.disablekey=true \
                            -config database.newsession=3 \
                            -config connection.timeoutInSecs=300 \
                            -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                        """
                        
                        // Verify ZAP started
                        sh """
                            timeout 60 bash -c '
                            while ! curl -s http://localhost:${ZAP_PORT}; do
                                sleep 5
                                echo "Waiting for ZAP API..."
                            done'
                        """
                        
                        // Monitor active scan
                        sh """
                            timeout 300 bash -c '
                            while ! docker logs zap-scan 2>&1 | grep "Scan progress"; do
                                sleep 10
                                echo "Waiting for scan to start..."
                            done'
                        """
                    } catch (err) {
                        sh 'docker logs zap-scan > ${WORKSPACE}/zap_errors.log'
                        error "ZAP scan failed: ${err}\nCheck zap_errors.log"
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Save all diagnostic files
                sh 'docker logs zap-scan > ${WORKSPACE}/zap_full.log 2>&1 || true'
                sh 'curl -s http://localhost:${ZAP_PORT}/OTHER/core/other/htmlreport > ${WORKSPACE}/reports/zap_report.html || true'
                
                // Cleanup
                sh 'docker stop zap-scan || true'
                sh 'docker rm -f zap-scan || true'
                sh 'docker stop juiceshop || true'
                
                // Archive artifacts
                archiveArtifacts artifacts: '**/zap_*.log,**/reports/*.html'
            }
        }
    }
}
