pipeline {
  agent any

  environment {
    IMAGE_NAME    = '2af-auth-service'
    IMAGE_TAG     = "build-${BUILD_NUMBER}"
    REGISTRY      = 'getu13'
    FULL_IMAGE    = "${REGISTRY}/${IMAGE_NAME}"
    K8S_NAMESPACE = 'auth-service'
    REPO_URL      = 'https://github.com/getuar04/2AF.git'
    KUBECONFIG    = "${WORKSPACE}/.kube/config"
  }

  options {
    timeout(time: 60, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {

    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[url: "${REPO_URL}"]]
        ])
        echo "Checkout successful - commit: ${env.GIT_COMMIT?.take(8) ?: 'N/A'}"
      }
    }

    stage('Setup Kubeconfig') {
      steps {
        script {
          sh "mkdir -p ${WORKSPACE}/.kube"
          sh "cp /var/jenkins_home/.kube/config ${WORKSPACE}/.kube/config"

          sh """
            sed -i 's|https://127.0.0.1|https://host.docker.internal|g' ${WORKSPACE}/.kube/config
            sed -i 's|https://localhost|https://host.docker.internal|g' ${WORKSPACE}/.kube/config
          """

          sh """
            python3 - <<'PYEOF'
import yaml

with open("${WORKSPACE}/.kube/config", "r") as f:
    cfg = yaml.safe_load(f)

for cluster_entry in cfg.get("clusters", []):
    cluster = cluster_entry.get("cluster", {})
    cluster["insecure-skip-tls-verify"] = True
    cluster.pop("certificate-authority-data", None)
    cluster.pop("certificate-authority", None)
    cluster_entry["cluster"] = cluster

with open("${WORKSPACE}/.kube/config", "w") as f:
    yaml.dump(cfg, f, default_flow_style=False)

print("Kubeconfig modified successfully")
PYEOF
          """

          sh "kubectl cluster-info --kubeconfig ${WORKSPACE}/.kube/config"
          echo "kubectl is connected to Kubernetes"
        }
      }
    }

    stage('Verify Secrets') {
      steps {
        script {
          def secretExists = sh(
            script: "kubectl get secret auth-secrets -n ${K8S_NAMESPACE} --kubeconfig ${WORKSPACE}/.kube/config > /dev/null 2>&1",
            returnStatus: true
          )
          if (secretExists != 0) {
            error("SEKRET MUNGON: auth-secrets not found in namespace ${K8S_NAMESPACE}.")
          }
          echo "Secret auth-secrets exists in namespace ${K8S_NAMESPACE}"
        }
      }
    }

   stage('Lint & Type Check') {
  steps {
    script {
      writeFile file: "${WORKSPACE}/lint.sh", text: 'npm ci --prefer-offline --no-audit && npm run lint:types'
      sh """
        docker run --rm \
          -v ${WORKSPACE}:/app \
          -w /app \
          --network host \
          node:20-alpine \
          sh /app/lint.sh
      """
    }
  }
}

stage('Tests') {
  steps {
    script {
      writeFile file: "${WORKSPACE}/test.sh", text: 'npm ci --prefer-offline --no-audit && npm test -- --runInBand --forceExit'
      sh """
        docker run --rm \
          -v ${WORKSPACE}:/app \
          -w /app \
          --network host \
          node:20-alpine \
          sh /app/test.sh
      """
    }
  }
  post {
    always {
      echo "Tests executed"
    }
  }
}
    stage('Build Docker Image') {
      steps {
        script {
          retry(2) {
            sh """
              docker build \\
                --target production \\
                --no-cache=false \\
                -t ${FULL_IMAGE}:${IMAGE_TAG} \\
                -t ${FULL_IMAGE}:latest \\
                .
            """
          }
          echo "Docker image built: ${FULL_IMAGE}:${IMAGE_TAG}"
        }
      }
    }

    stage('Push to Registry') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-hub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
          sh "docker push ${FULL_IMAGE}:${IMAGE_TAG}"
          sh "docker push ${FULL_IMAGE}:latest"
          sh "docker logout"
        }
        echo "Image pushed: ${FULL_IMAGE}:${IMAGE_TAG}"
      }
    }

    stage('Approve Deploy') {
      steps {
        timeout(time: 15, unit: 'MINUTES') {
          input message: "Deploy build #${BUILD_NUMBER} (${FULL_IMAGE}:${IMAGE_TAG})?",
                ok: 'Yes, deploy!'
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
          sh "kubectl apply -f k8s/service.yaml   ${kube}"
          sh "kubectl apply -f k8s/deployment.yaml ${kube}"

          sh """
            kubectl patch deployment auth-service \
              -n ${K8S_NAMESPACE} ${kube} \
              --type=json \
              -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
          """

          sh """
            kubectl set image deployment/auth-service \
              auth-service=${FULL_IMAGE}:${IMAGE_TAG} \
              -n ${K8S_NAMESPACE} ${kube}
          """

          sh "kubectl rollout restart deployment/auth-service -n ${K8S_NAMESPACE} ${kube}"

          sh """
            kubectl rollout status deployment/auth-service \
              -n ${K8S_NAMESPACE} ${kube} --timeout=300s
          """

          echo "Deploy completed successfully!"
        }
      }
    }

    stage('Run DB Migration') {
      steps {
        script {
          def kube = "--kubeconfig ${WORKSPACE}/.kube/config"
          def migrationExists = sh(
            script: 'test -f k8s/migration.yaml',
            returnStatus: true
          )
          if (migrationExists == 0) {
            sh "kubectl delete job db-migration -n ${K8S_NAMESPACE} ${kube} --ignore-not-found=true"
            sh "kubectl apply -f k8s/migration.yaml -n ${K8S_NAMESPACE} ${kube}"
            sh "kubectl wait --for=condition=complete job/db-migration -n ${K8S_NAMESPACE} ${kube} --timeout=120s"
            echo "DB migration executed successfully"
          } else {
            echo "k8s/migration.yaml does not exist - migration step skipped"
          }
        }
      }
    }

  }

  post {
    success {
      echo "Build #${BUILD_NUMBER} deployed: ${FULL_IMAGE}:${IMAGE_TAG}"
    }
    failure {
      echo "Build #${BUILD_NUMBER} failed. Check logs above."
    }
    always {
      script {
        sh "docker rmi ${FULL_IMAGE}:${IMAGE_TAG} || true"
      }
    }
  }
}