docker stop whatsjs
docker rm whatsjs
docker build -t whatsjs .
docker run -d --restart --name whatsjs whatsjs:latest
