pipeline {
    agent {
        docker {
            image 'docker:dind'  // Docker-in-Docker for container operations
            args '--privileged --network=host -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    stages {
        stage('1. Clone & Verify Files') {
            steps {
                sh '''
                    echo "Cloning repository..."
                    git clone https://github.com/sunidhiagrawal18/zap-juiceshop.git
                    
                    echo "Verifying file structure:"
                    cd zap-juiceshop
                    ls -lR
                    
                    // Critical file checks
                    [ -f plans/owasp_juiceshop_plan_docker_with_auth.yaml ] || { echo "Missing plan file!"; exit 1; }
                    [ -f scripts/GetToken_juiceshop_with_auth.js ] || { echo "Missing auth script!"; exit 1; }
                    
                    mkdir -p reports
                    chmod -R 777 .
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
                    
                    echo "Waiting for JuiceShop..."
                    until curl -s http://localhost:3000 >/dev/null; do sleep 5; done
                '''
            }
        }

        stage('3. Run ZAP Scan') {
            steps {
                sh '''
                    cd zap-juiceshop
                    
                    docker run --rm \\
                        --network="host" \\
                        -v $(pwd)/plans:/zap/wrk/plans \\
                        -v $(pwd)/scripts:/zap/wrk/scripts \\
                        -v $(pwd)/openapi-specs:/zap/wrk/openapi-specs \\
                        -v $(pwd)/reports:/zap/wrk/reports \\
                        ghcr.io/zaproxy/zaproxy:stable \\
                        zap.sh -cmd -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'zap-juiceshop/reports/*'
            
            sh '''
                docker stop juiceshop || true
                docker rm juiceshop || true
            '''
        }
    }
}
