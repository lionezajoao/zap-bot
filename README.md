# WhatsJS Bot

A WhatsApp bot built with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), supporting media commands, MongoDB integration, and AWS S3 session storage. The project is containerized using Docker and orchestrated with Docker Compose.

## Project Structure

```
.
├── app/
│   ├── main.js                # Entry point for the bot
│   ├── database/
│   │   └── bot.js             # MongoDB integration and command management
│   ├── media/                 # Media files and commands.json
│   └── src/
│       ├── messageHandler.js  # Handles WhatsApp messages and commands
│       ├── sessionHandler.js  # Manages session storage (AWS S3)
│       └── utils.js           # Utility functions
├── .env                       # Environment variables (S3, MongoDB, etc.)
├── Dockerfile                 # Docker image definition
├── docker-compose.yml         # Multi-container orchestration
├── package.json               # Node.js dependencies and scripts
└── README.md                  # Project documentation
```

## Docker & Database

This project uses Docker Compose to run both the bot and a MongoDB database in separate containers.

- **zap-bot**: Runs the WhatsApp bot using the image built from the provided `Dockerfile`.
- **mongo**: Runs a MongoDB instance with authentication enabled.

### docker-compose.yml

Key points:
- The `zap-bot` service depends on the `mongo` service.
- MongoDB credentials and database name are set via environment variables.
- MongoDB data is persisted using a Docker volume (`mongo-data`).

### MongoDB

- The bot uses MongoDB to store and manage command definitions.
- On startup, the bot loads commands from `app/media/commands.json` into the database if not already present.

## Environment Variables

Set these in your `.env` file:

```
S3_ID=
S3_SECRET=
S3_ENDPOINT=
SESSION_BUCKET=
EXECUTABLE_PATH=
STORE_DEBUG=true
MONGO_URI=
```

## Usage

1. **Build and start the services:**
   ```sh
   docker-compose up --build
   ```

2. **Bot Initialization:**
   - On first run, the bot will initialize the MongoDB database and load commands.
   - Scan the QR code printed in the logs to authenticate WhatsApp Web.

3. **Adicionando Comandos Personalizados:**
    - Para criar novos comandos, edite o arquivo `app/media/commands.json`. Cada comando deve seguir a estrutura abaixo:
      ```json
      {
         "trigger": "!gatinho",
         "description": "Um gatinho fofo",
         "response": {
            "type": "media",
            "path": "miau.mp3"
         }
      }
      ```
    - Campos obrigatórios:
      - `trigger`: palavra-chave que ativa o comando (ex: `!gatinho`).
      - `description`: breve descrição do comando.
      - `response.type`: tipo de resposta (`text`, `media` ou `sticker`).
      - `response.content` ou `response.path`: 
         - Use `content` para respostas de texto.
         - Use `path` para arquivos de mídia ou figurinhas (o arquivo deve estar em `app/media/`).
    - Exemplo de comandos:
      ```json
      [
         {
            "trigger": "!querida",
            "description": "Uma mensagem fofa",
            "response": {
              "type": "text",
              "content": "QUERIDA É MINHA XERECA"
            }
         },
         {
            "trigger": "!vampeta",
            "description": "Uma foto fofa",
            "response": {
              "type": "media",
              "path": "vampeta.jpg"
            }
         },
         {
            "trigger": "!vasco",
            "description": "Um time fofo",
            "response": {
              "type": "sticker",
              "path": "vascao.jpeg"
            }
         }
      ]
      ```
    - Após adicionar ou editar comandos, execute:
      ```sh
      npm run build
      ```
      Isso irá atualizar o banco de dados MongoDB com os novos comandos.

## Scripts

- `npm start` – Runs the bot.
- `npm run dev` – Runs the bot with `nodemon` for development.
- `npm run build` – Initializes the MongoDB database with commands.

## License

ISC