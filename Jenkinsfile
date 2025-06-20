pipeline {
    agent any

    environment {
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        JUICESHOP_IMAGE = 'bkimminich/juice-shop'
        GITHUB_REPO = 'https://github.com/sunidhiagrawal18/zap-juiceshop.git'
        JUICESHOP_PORT = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: "${GITHUB_REPO}",
                    credentialsId: 'github-credentials'
            }
        }

        stage('Start JuiceShop') {
            steps {
                script {
                    sh "docker run -d --name juiceshop -p ${JUICESHOP_PORT}:3000 --rm ${JUICESHOP_IMAGE}"
                    sh 'while ! curl -s http://localhost:${JUICESHOP_PORT} > /dev/null; do sleep 1; done'
                }
            }
        }

        stage('Start ZAP Daemon') {
            steps {
                script {
                    sh '''
                        docker rm -f zap-scan || true
                        docker run -d --name zap-scan --network=host \
                          -v ${WORKSPACE}:/zap/wrk:rw \
                          -t ${ZAP_IMAGE} \
                          zap.sh -daemon -port 9090 \
                          -dir /zap/wrk/.zap_home \
                          -config api.disablekey=true \
                          -config api.addrs.addr.name=.* \
                          -config api.addrs.addr.regex=true

                        echo "Waiting for ZAP to be ready..."
                        for i in {1..30}; do
                            if curl -s http://localhost:9090/JSON/core/view/version/ > /dev/null; then
                                echo "ZAP is ready"
                                break
                            fi
                            sleep 2
                        done
                    '''
                }
            }
        }

        stage('Run ZAP Automation Plan') {
            steps {
                script {
                    sh '''
                        echo "Triggering ZAP scan plan via API..."
                        docker exec zap-scan curl -s -X POST \
                            "http://localhost:9090/JSON/automation/action/runPlan/?fileName=/zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml"
                    '''
                }
            }
        }

        stage('Archive Reports') {
            steps {
                script {
                    // Report filenames should match YAML config
                    archiveArtifacts artifacts: 'html_report.html, xml_report.xml', allowEmptyArchive: false
                    publishHTML target: [
                        reportDir: '${WORKSPACE}',
                        reportFiles: 'html_report.html',
                        reportName: 'ZAP HTML Report',
                        alwaysLinkToLastBuild: true,
                        keepAll: true
                    ]
                }
            }
        }
    }

    post {
        always {
            sh 'docker stop zap-scan || true'
            sh 'docker stop juiceshop || true'
        }
    }
}
