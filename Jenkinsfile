pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        JUICESHOP_PORT = '3000'
        ZAP_PORT = '9090'
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
                        timeout 60 bash -c '
                        while ! curl -sf http://localhost:${JUICESHOP_PORT} >/dev/null; do 
                            sleep 2
                            echo "Waiting for JuiceShop to start..."
                        done'
                    """
                }
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    sh 'docker rm -f zap-scan || true'
                    
                    sh """
                        docker run -d --name zap-scan \\
                        --network=host \\
                        -u \$(id -u jenkins):\$(id -g jenkins) \\
                        -v ${WORKSPACE}:/zap/wrk:rw \\
                        -t ${ZAP_IMAGE} \\
                        zap.sh -daemon \\
                        -port ${ZAP_PORT} \\
                        -config api.disablekey=true \\
                        -config api.addrs.addr.regex=true \\
                        -config api.addrs.addr.name=.* \\
                        -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                    
                    // Wait for ZAP initialization
                    sh """
                        timeout 30 bash -c '
                        while ! curl -sf http://localhost:${ZAP_PORT} >/dev/null; do 
                            sleep 3
                            echo "Waiting for ZAP to start..."
                        done'
                    """
                }
            }
        }
        
        stage('Monitor Scan') {
            steps {
                script {
                    timeout(time: 30, unit: 'MINUTES') {
                        waitUntil {
                            def logs = sh(script: 'docker logs zap-scan 2>&1 | tail -50', returnStdout: true).trim()
                            echo "ZAP Status:\n${logs}"
                            
                            if (logs.contains('Automation plan completed') || 
                                logs.contains('Scan progress 100%')) {
                                return true
                            }
                            
                            if (logs.contains('ERROR') || logs.contains('Exception')) {
                                error("ZAP scan failed:\n${logs}")
                            }
                            
                            sleep 10
                            return false
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Capture logs before cleanup
                sh 'docker logs zap-scan > ${WORKSPACE}/zap_scan.log 2>&1 || true'
                archiveArtifacts artifacts: 'zap_scan.log'
                
                // Cleanup containers
                sh 'docker stop zap-scan || true'
                sh 'docker rm -f zap-scan || true'
                sh 'docker stop juiceshop || true'
            }
        }
    }
}
