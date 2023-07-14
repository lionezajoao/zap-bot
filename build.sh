docker stop whatsjs
docker rm whatsjs
docker build -t whatsjs .
docker run -d --restart=always --name whatsjs whatsjs:latest
