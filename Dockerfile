FROM python:3.14-slim

WORKDIR /app

# Install pipenv
RUN apt update && apt install -y pipenv libmagic1 libmagic-dev

COPY Pipfile Pipfile.lock ./
RUN pipenv install

COPY . .

CMD ["pipenv", "run", "bot"]