pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        JUICESHOP_PORT = '3000'
        ZAP_TIMEOUT_MINUTES = '30' // Increase for large scans
    }
    
    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs(deleteDirs: true)
                sh 'mkdir -p ${WORKSPACE}/reports'
            }
        }
        
        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh """
                        timeout 120 bash -c '
                        while ! curl -sf http://localhost:${JUICESHOP_PORT} >/dev/null; do 
                            sleep 5
                            echo "Waiting for JuiceShop to start..."
                        done'
                    """
                }
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    // Cleanup previous runs
                    sh 'docker rm -f zap-scan || true'
                    
                    // Run with resource limits and debug
                    sh """
                        docker run -d --name zap-scan \
                        --network=host \
                        --memory 4G --memory-swap 4G \
                        -v ${WORKSPACE}:/zap/wrk:rw \
                        -t ${ZAP_IMAGE} \
                        zap.sh -daemon -port 9090 \
                        -config api.disablekey=true \
                        -config connection.timeoutInSecs=600 \
                        -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                    
                    // Initial stabilization wait
                    sleep 15
                }
            }
        }
        
        stage('Monitor Scan Progress') {
            steps {
                script {
                    timeout(time: env.ZAP_TIMEOUT_MINUTES.toInteger(), unit: 'MINUTES') {
                        waitUntil {
                            def logs = sh(script: 'docker logs zap-scan 2>&1 | tail -100', returnStdout: true).trim()
                            echo "ZAP Status Check:\n${logs}"
                            
                            // Success conditions
                            if (logs.contains('Automation plan completed') || 
                                logs.contains('Scan progress 100%')) {
                                return true
                            }
                            
                            // Failure conditions
                            if (logs.contains('ERROR') || 
                                logs.contains('Exception') || 
                                logs.contains('Failed')) {
                                error("ZAP SCAN FAILED:\n${logs}")
                            }
                            
                            // Continue waiting
                            sleep 30
                            return false
                        }
                    }
                }
            }
        }
        
        stage('Generate Report') {
            steps {
                sh """
                    docker exec zap-scan zap-cli --zap-url http://localhost:9090 report \
                    -o /zap/wrk/reports/zap-report.html -f html
                """
                archiveArtifacts artifacts: 'reports/zap-report.html'
            }
        }
    }
    
    post {
        always {
            script {
                // Capture final logs for debugging
                sh 'docker logs zap-scan > ${WORKSPACE}/zap_full_logs.txt 2>&1 || true'
                archiveArtifacts artifacts: 'zap_full_logs.txt'
                
                // Cleanup containers
                sh 'docker stop zap-scan || true'
                sh 'docker rm -f zap-scan || true'
                sh 'docker stop juiceshop || true'
                
                // Fix permissions (if needed)
                sh 'sudo chown -R jenkins:jenkins ${WORKSPACE} || true'
            }
        }
}
