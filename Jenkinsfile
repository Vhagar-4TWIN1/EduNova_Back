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
sh 'chmod +x node_modules/.bin/webpack || true'
sh('npm run build-dev') 
} 
} 
} 
} 
}
