pipeline {
  agent any

  environment {
    IMAGE_NAME    = '2af-auth-service'
    IMAGE_TAG     = "build-${BUILD_NUMBER}"
    REGISTRY = 'getu13'
    FULL_IMAGE    = "${REGISTRY}/${IMAGE_NAME}"
    K8S_NAMESPACE = 'auth-service'
    REPO_URL      = 'https://github.com/getuar04/2AF.git'
  }

  stages {

    stage('Checkout') {
      steps {
        git branch: 'main', url: "${REPO_URL}"
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Lint & Type Check') {
      steps {
        sh 'npm run lint:types'
      }
    }

    stage('Tests') {
      steps {
        sh 'npm test'
      }
      post {
        always {
          echo 'Tests completed'
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        retry(2) {
          sh """
            docker build \\
              --target production \\
              -t ${FULL_IMAGE}:${IMAGE_TAG} \\
              -t ${FULL_IMAGE}:latest \\
              .
          """
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
        }
      }
    }

    stage('Approve Deploy') {
      steps {
        timeout(time: 15, unit: 'MINUTES') {
          input message: "Deploy build #${BUILD_NUMBER} ne production?", ok: 'Deploy'
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh """
          kubectl get secret auth-secrets -n ${K8S_NAMESPACE} > /dev/null 2>&1 || \
          (echo 'ERROR: auth-secrets mungon! Shko te SETUP.md.' && exit 1)
        """

        sh "kubectl apply -f k8s/namespace.yaml"
        sh "kubectl apply -f k8s/configmap.yaml"
        sh "kubectl apply -f k8s/postgres.yaml"
        sh "kubectl apply -f k8s/redis.yaml"
        sh "kubectl apply -f k8s/mongodb.yaml"
        sh "kubectl apply -f k8s/kafka.yaml"
        sh "kubectl apply -f k8s/service.yaml"
        sh "kubectl apply -f k8s/deployment.yaml"

        sh """
          kubectl set image deployment/auth-service \\
            auth-service=${FULL_IMAGE}:${IMAGE_TAG} \\
            -n ${K8S_NAMESPACE}
        """
        sh """
          kubectl rollout status deployment/auth-service \\
            -n ${K8S_NAMESPACE} --timeout=180s
        """
      }
    }

    stage('Run DB Migration') {
      steps {
        sh "kubectl delete job db-migration -n ${K8S_NAMESPACE} --ignore-not-found=true"
        sh "kubectl apply -f k8s/migration.yaml -n ${K8S_NAMESPACE}"
        sh """
          kubectl wait --for=condition=complete job/db-migration \\
            -n ${K8S_NAMESPACE} --timeout=120s
        """
      }
    }

  }

  post {
    success {
      echo "Build ${BUILD_NUMBER} u deploy-ua me sukses!"
    }
    failure {
      echo "Build ${BUILD_NUMBER} deshtoi!"
    }
    always {
      sh "docker rmi ${FULL_IMAGE}:${IMAGE_TAG} || true"
      sh "docker rmi ${FULL_IMAGE}:latest || true"
    }
  }
}