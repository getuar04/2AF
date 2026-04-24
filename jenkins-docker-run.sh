docker run -d `
  --name jenkins `
  --restart=on-failure `
  -p 8080:8080 `
  -p 50000:50000 `
  `
  -v jenkins_home:/var/jenkins_home `
  `
  -v //./pipe/docker_engine://./pipe/docker_engine `
  `
  -v "${HOME}/.kube:/root/.kube:ro" `
  `
  -e DOCKER_HOST=npipe:////./pipe/docker_engine `
  `
  --add-host=host.docker.internal:host-gateway `
  jenkins-custom:latest

echo ""
echo "Jenkins po starton ne http://localhost:8080"
echo ""
echo "Prit 30 sekonda pastaj ekzekuto:"
echo "  docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"