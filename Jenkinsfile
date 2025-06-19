pipeline {
    agent any
    
    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
    }
    
    stages {     

        stage('Cleanup Workspace') {
            steps {
                deleteDir() // This cleans up everything in ${WORKSPACE}
            }
}
        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh 'while ! curl -s http://localhost:${JUICESHOP_PORT} >/dev/null; do sleep 1; echo "Waiting for JuiceShop to start..."; done'
                    echo "JuiceShop is now running and ready for testing"
                }
            }
        }

        stage('Debug Workspace Permissions') {
            steps {
                sh '''
                    chmod -R 777 ${WORKSPACE} || true
                    echo "Workspace ownership:"
                    ls -ld ${WORKSPACE}
                    echo "Workspace contents:"
                    ls -la ${WORKSPACE}
                '''
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    sh """
                        docker rm -f zap-scan || true
                        docker run --name zap-scan --network="host" \
                        --user 0 -v ${WORKSPACE}:/zap/wrk:rw \
                          -i ${ZAP_IMAGE} \
                          zap.sh -cmd -port 9090 -config api.disablekey=true \
                          -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                    """
                }
            }
        }

        stage('Debug: Check Container Permissions') {
            steps {
                script {
                    // List contents of /zap/ and /zap/wrk
                    sh 'docker exec zap-scan ls -la /zap/ || echo "Failed to list /zap/"'
                    sh 'docker exec zap-scan ls -la /zap/wrk || echo "Failed to list /zap/wrk"'
        
                    // Try creating a file in /zap/wrk
                    sh 'docker exec zap-scan touch /zap/wrk/test.txt || echo "Failed to create test file"'
        
                    // Confirm file was created
                    sh 'docker exec zap-scan ls -la /zap/wrk/test.txt || echo "test.txt not found"'
                }
            }
}

        stage('Archive Results') {
            steps {
                // Archive both reports if needed
                archiveArtifacts artifacts: 'report.html, juiceShopXmlReport.xml', allowEmptyArchive: false
        
                publishHTML target: [
                    reportDir: '.',
                    reportFiles: 'report.html',
                    reportName: 'ZAP Report',
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true
                ]
            }
        }
    
}

    post {
        always {
            // Stop containers (in case they’re still running)
            sh 'docker stop zap-scan || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
