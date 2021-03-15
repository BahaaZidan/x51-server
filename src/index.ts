import dotenv from "dotenv";
import Express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();

const app = Express();
const http = createServer(app);
const io = new SocketIOServer(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

const PORT = 3002;

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

process.on("SIGINT", () => {
  process.exit();
});
