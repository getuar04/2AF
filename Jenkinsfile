pipeline {
  agent any
  environment {
    IMAGE_NAME    = '2af-auth-service'
    IMAGE_TAG     = "build-${BUILD_NUMBER}"
    K8S_NAMESPACE = 'auth-service'
  }
  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/getuar04/2AF.git'
      }
    }
    stage('Setup Kubeconfig') {
      steps {
        script {
          sh "mkdir -p ${WORKSPACE}/.kube"
          sh "cp /var/jenkins_home/.kube/config ${WORKSPACE}/.kube/config"
          sh "sed -i 's|https://127.0.0.1|https://host.docker.internal|g' ${WORKSPACE}/.kube/config"
          sh "sed -i 's|https://localhost|https://host.docker.internal|g' ${WORKSPACE}/.kube/config"
          sh """
            python3 - <<'PYEOF'
import yaml
with open("${WORKSPACE}/.kube/config", "r") as f:
    cfg = yaml.safe_load(f)
for c in cfg.get("clusters", []):
    cluster = c.get("cluster", {})
    cluster["insecure-skip-tls-verify"] = True
    cluster.pop("certificate-authority-data", None)
    cluster.pop("certificate-authority", None)
    c["cluster"] = cluster
with open("${WORKSPACE}/.kube/config", "w") as f:
    yaml.dump(cfg, f, default_flow_style=False)
print("Kubeconfig modified successfully")
PYEOF
          """
        }
      }
    }
    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Run Tests') {
      steps {
        sh 'npm test'
      }
    }
    stage('Build Docker Image') {
      steps {
        retry(2) {
          sh """
            docker build \
              --network=host \
              --cache-from ${IMAGE_NAME}:latest \
              -t ${IMAGE_NAME}:${IMAGE_TAG} \
              -t ${IMAGE_NAME}:latest \
              .
          """
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        script {
          def kube = "--kubeconfig ${WORKSPACE}/.kube/config"
          sh "kubectl apply -f k8s/namespace.yaml ${kube}"
          sh "kubectl apply -f k8s/configmap.yaml ${kube}"
          sh "kubectl apply -f k8s/postgres.yaml  ${kube}"
          sh "kubectl apply -f k8s/redis.yaml     ${kube}"
          sh "kubectl apply -f k8s/mongodb.yaml   ${kube}"
          sh "kubectl apply -f k8s/kafka.yaml     ${kube}"
          sh "kubectl apply -f k8s/deployment.yaml ${kube}"
          sh "kubectl apply -f k8s/service.yaml   ${kube}"
          sh """
            kubectl patch deployment auth-service \
              -n ${K8S_NAMESPACE} ${kube} \
              --type=json \
              -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
          """
          sh """
            kubectl set image deployment/auth-service \
              auth-service=${IMAGE_NAME}:${IMAGE_TAG} \
              -n ${K8S_NAMESPACE} ${kube}
          """
          sh "kubectl rollout restart deployment/auth-service -n ${K8S_NAMESPACE} ${kube}"
          sh "kubectl rollout status deployment/auth-service -n ${K8S_NAMESPACE} ${kube} --timeout=300s"
        }
      }
    }
  }
  post {
    success {
      echo "✅ Build ${BUILD_NUMBER} u deploy-ua me sukses!"
    }
    failure {
      echo "❌ Build ${BUILD_NUMBER} dështoi."
    }
  }
}