pipeline {
    agent any

    stages {
        stage('1. Clone Repository') {
            steps {
                // Clone your repo with ZAP configs
                git(
                    url: 'https://github.com/sunidhiagrawal18/zap-juiceshop.git',
                    branch: 'main',
                    credentialsId: 'github-credentials'
                )
                
                // Verify all required files exist
                sh '''
                    echo "Verifying file structure:"
                    ls -lR zap-juiceshop/
                    [ -f zap-juiceshop/plans/owasp_juiceshop_plan_docker_with_auth.yaml ] || exit 1
                    [ -f zap-juiceshop/scripts/GetToken_juiceshop_with_auth.js ] || exit 1
                '''
            }
        }

        stage('2. Start JuiceShop') {
            steps {
                sh '''
                    docker run -d \\
                        --name juiceshop \\
                        --network host \\
                        -p 3000:3000 \\
                        bkimminich/juice-shop
                    
                    # Wait for JuiceShop to be ready
                    while ! curl -s http://localhost:3000 >/dev/null; do
                        sleep 5
                    done
                '''
            }
        }

        stage('3. Run ZAP Scan') {
            steps {
                sh '''
                    cd zap-juiceshop
                    mkdir -p reports
                    chmod -R 777 .
                    
                    # Run ZAP with ALL files mounted
                    docker run --rm \\
                        --network="host" \\
                        -v $(pwd)/plans:/zap/wrk/plans:ro \\
                        -v $(pwd)/scripts:/zap/wrk/scripts:ro \\
                        -v $(pwd)/openapi-specs:/zap/wrk/openapi-specs:ro \\
                        -v $(pwd)/reports:/zap/wrk/reports:rw \\
                        ghcr.io/zaproxy/zaproxy:stable \\
                        zap.sh -cmd \\
                        -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                '''
            }
        }
    }

    post {
        always {
            // Save all artifacts
            archiveArtifacts artifacts: 'zap-juiceshop/reports/*, zap-juiceshop/plans/*, zap-juiceshop/scripts/*'
            
            // Cleanup
            sh '''
                docker stop juiceshop || true
                docker rm juiceshop || true
                docker system prune -f
            '''
        }
    }
}
