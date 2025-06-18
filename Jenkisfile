pipeline {
    agent any
    environment {
        // Docker image for ZAP
        ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
        
        // Local workspace paths (adjust as needed)
        WORKSPACE_DIR = "${WORKSPACE}/zap-juiceshop"
    }
    options {
        timeout(time: 1, unit: 'HOURS') 
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }
    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', 
                   url: 'https://github.com/your-username/zap-juiceshop.git',
                   credentialsId: 'github-credentials'  // Create in Jenkins credentials
            }
        }
        
        stage('Prepare Environment') {
            steps {
                script {
                    // Create reports directory with permissions
                    sh """
                        mkdir -p ${WORKSPACE_DIR}/reports
                        chmod -R 777 ${WORKSPACE_DIR}
                    """
                    
                    // Verify critical files exist
                    sh """
                        ls -l ${WORKSPACE_DIR}/plans/
                        ls -l ${WORKSPACE_DIR}/scripts/
                        [ -f ${WORKSPACE_DIR}/plans/owasp_juiceshop_plan_docker_with_auth.yaml ] || exit 1
                    """
                }
            }
        }
        
        stage('Run ZAP Scan') {
            steps {
                script {
                    try {
                        sh """
                            docker run --rm \
                                --network="host" \
                                -v ${WORKSPACE_DIR}:/zap/wrk/:rw \
                                ${ZAP_IMAGE} \
                                zap.sh -cmd \
                                -autorun /zap/wrk/plans/owasp_juiceshop_plan_docker_with_auth.yaml
                        """
                    } catch (err) {
                        echo "Scan failed: ${err}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Process Results') {
            steps {
                script {
                    // Count high vulnerabilities
                    def highVulns = sh(
                        script: """
                            grep -c '<riskcode>3' ${WORKSPACE_DIR}/reports/juiceShopXmlReport.xml || true
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (highVulns.toInteger() > 0) {
                        unstable("Found ${highVulns} high risk vulnerabilities")
                    }
                    
                    // Generate summary
                    def reportSummary = """
                    ZAP Scan Results:
                    - HTML Report: ${WORKSPACE_DIR}/reports/juiceShopHtmlReport.html
                    - XML Report:  ${WORKSPACE_DIR}/reports/juiceShopXmlReport.xml
                    - High Vulns:  ${highVulns}
                    """
                    writeFile file: 'report-summary.txt', text: reportSummary
                }
            }
        }
    }
    post {
        always {
            // Archive reports and logs
            archiveArtifacts artifacts: '**/reports/*, report-summary.txt', allowEmptyArchive: true
            
            // Publish HTML report
            publishHTML target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: "${WORKSPACE_DIR}/reports",
                reportFiles: 'juiceShopHtmlReport.html',
                reportName: 'ZAP Security Report'
            ]
            
            // Clean up Docker
            sh 'docker system prune -f'
        }
        success {
            slackSend color: 'good', 
                     message: "ZAP Scan Successful - ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: 'danger', 
                     message: "ZAP Scan Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
