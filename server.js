const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const { getRandomQuestions } = require('./questions.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://quiz-kj4a.onrender.com", // produção
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Rota de saúde
app.get("/health", (req, res) => res.send("OK"));

// Cria banco de dados local
const db = new sqlite3.Database('dados.db');

db.run(`
  CREATE TABLE IF NOT EXISTS localizacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa1 TEXT,
    pessoa2 TEXT,
    latitude REAL,
    longitude REAL,
    cidade TEXT,
    pais TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/api/localizacao', (req, res) => {
  const { pessoa1, pessoa2, latitude, longitude, cidade, pais } = req.body;

  db.run(
    `INSERT INTO localizacoes (pessoa1, pessoa2, latitude, longitude, cidade, pais) VALUES (?, ?, ?, ?, ?, ?)`,
    [pessoa1, pessoa2, latitude, longitude, cidade, pais],
    function (err) {
      if (err) return res.status(500).send({ error: err.message });
      res.send({ success: true, id: this.lastID });
    }
  );
});

const sessions = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('createSession', (data) => {
    const sessionId = Math.random().toString(36).substring(2, 9);
    const questions = getRandomQuestions(10); // Gera perguntas para a sessão
    sessions[sessionId] = {
      players: { [socket.id]: data.playerName },
      answers: {},
      currentQuestion: 0,
      questions: questions // Armazena as perguntas na sessão
    };
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
    // Envia a primeira pergunta para o criador da sessão
    socket.emit('loadQuestion', { questions: questions, currentQuestion: 0 });
  });

  socket.on('joinSession', (data) => {
    const { sessionId, playerName } = data;
    if (sessions[sessionId] && Object.keys(sessions[sessionId].players).length < 2) {
      sessions[sessionId].players[socket.id] = playerName;
      socket.join(sessionId);
      io.to(sessionId).emit('playerJoined', { players: sessions[sessionId].players });
      // Envia as perguntas e a pergunta atual para o jogador que acabou de entrar
      socket.emit('loadQuestion', { questions: sessions[sessionId].questions, currentQuestion: sessions[sessionId].currentQuestion });
    } else {
      socket.emit('sessionError', { message: 'Session is full or does not exist.' });
    }
  });

  socket.on('submitAnswer', (data) => {
    const { sessionId, answer, participantId } = data; // Adicionado participantId
    if (sessions[sessionId]) {
      // Armazena a resposta associada ao socket.id e ao nome do jogador
      sessions[sessionId].answers[socket.id] = { answer, playerName: sessions[sessionId].players[socket.id] };
      const allPlayersAnswered = Object.keys(sessions[sessionId].players).every(socketId => sessions[sessionId].answers[socketId]);
      if (allPlayersAnswered) {
        io.to(sessionId).emit('allAnswered', { answers: sessions[sessionId].answers });
      }
    }
  });

  socket.on('nextQuestion', (data) => {
    const { sessionId } = data;
    if (sessions[sessionId]) {
      sessions[sessionId].currentQuestion++;
      sessions[sessionId].answers = {}; // Limpa as respostas para a próxima pergunta
      // Envia a próxima pergunta para todos os jogadores na sessão
      console.log(`Server: Emitting loadQuestion to all in session ${sessionId}. Questions count: ${sessions[sessionId].questions.length}, Current question: ${sessions[sessionId].currentQuestion}`);
      io.to(sessionId).emit('loadQuestion', { questions: sessions[sessionId].questions, currentQuestion: sessions[sessionId].currentQuestion });
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    for (const sessionId in sessions) {
      if (sessions[sessionId].players[socket.id]) {
        delete sessions[sessionId].players[socket.id];
        if (Object.keys(sessions[sessionId].players).length === 0) {
          delete sessions[sessionId];
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});