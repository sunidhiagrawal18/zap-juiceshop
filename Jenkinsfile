pipeline {
    agent any

    stages {
        stage('1. Clone & Verify Files') {
            steps {
                git branch: 'main', 
                   url: 'https://github.com/sunidhiagrawal18/zap-juiceshop.git',
                   credentialsId: 'github-credentials'

                sh '''
                    echo "Verifying repository structure..."
                    cd zap-juiceshop
                    ls -lR
                    
                    # Mandatory file checks
                    [ -f plans/owasp_juiceshop_plan_docker_with_auth.yaml ] || { echo "ERROR: Missing plan file"; exit 1; }
                    [ -f scripts/GetToken_juiceshop_with_auth.js ] || { echo "ERROR: Missing auth script"; exit 1; }
                    
                    # Optional OpenAPI spec check
                    if [ -d "openapi-specs/" ]; then
                        echo "OpenAPI specs found"
                        [ -f openapi-specs/swagger-juiceshop_demo.json ] || echo "WARNING: Missing OpenAPI spec"
                    else
                        echo "WARNING: openapi-specs/ directory not found"
                    fi
                    
                    mkdir -p reports
                    chmod -R 777 .
                '''
            }
        }

        stage('2. Run ZAP Scan') {
            steps {
                dir('zap-juiceshop') {
                    sh '''
                        echo "Starting ZAP scan with full directory mounts..."
                        docker run --rm \
                            -v $(pwd)/plans:/zap/wrk/plans:ro \
                            -v $(pwd)/scripts:/zap/wrk/scripts:ro \
                            -v $(pwd)/openapi-specs:/zap/wrk/openapi-specs:ro \
                            -v $(pwd)/reports:/zap/wrk/reports:rw \
                            -e JAVA_OPTS="-Xmx2g" \
                            ghcr.io/zaproxy/zaproxy:stable \
                            zap.sh -cmd \
                            -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                        
                        echo "Scan completed. Reports generated:"
                        ls -l reports/
                    '''
                }
            }
        }
    }

    post {
        always {
            dir('zap-juiceshop/reports') {
                archiveArtifacts artifacts: '*.html, *.xml, *.json'
                publishHTML target: [
                    allowMissing: true,
                    reportDir: '.',
                    reportFiles: 'juiceShopHtmlReport.html',
                    reportName: 'ZAP Security Report'
                ]
            }
            
            sh 'docker system prune -f || true'
        }
    }
}
