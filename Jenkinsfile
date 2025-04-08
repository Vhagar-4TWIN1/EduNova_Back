pipeline{ 
agent any 
stages { 
stage('Install dependencies') { 
steps{ 
script { 
sh('npm install') 
} 
} 
}
  stage('Unit Test') { 
steps{
  script { 
sh('npm test') 
} 
} 
} 
stage('Build application') { 
steps{ 
script { 
sh('npm run build-dev') 
} 
} 
} 
  stage('MVN Sonarqube') {
         steps {
                 sh 'mvn sonar:sonar -Dsonar.token=squ_7af8e73dbed9867cd6208c11c6d5b0e6482c9be3 -Dmaven.test.skip=true' 
             }
        }
  stage('MVN Nexus') {
            steps {
                sh 'mvn deploy -Dmaven.test.skip=true'
            }
        }
}
    
}
