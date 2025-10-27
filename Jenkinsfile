pipeline {
  agent any
  options { timestamps() }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Setup Node') { steps { sh 'node -v || . $NVM_DIR/nvm.sh && nvm install 18 && nvm use 18' } }
    stage('Install Deps') { steps { sh 'npm ci || npm i' } }
    stage('Install Browsers') { steps { sh 'npx playwright install --with-deps' } }
    stage('Test') { steps { sh 'npx playwright test' } }
    stage('Report') { steps { archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true } }
  }
  post {
    always { publishHTML([reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report']) }
  }
}