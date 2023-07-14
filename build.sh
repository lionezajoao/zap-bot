docker stop whatsjs
docker rm whatsjs
docker build -t whatsjs .
docker run -d --name whatsjs whatsjs:latest