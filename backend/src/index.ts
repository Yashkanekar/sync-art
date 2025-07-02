import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  // Respond to client pings
  socket.on("ping", () => {
    console.log(`Received ping from ${socket.id}`);
    socket.emit("pong", { time: Date.now() });
  });

  socket.on("draw:begin", (data) => {
    socket.broadcast.emit("draw:begin", data);
  });
  socket.on("draw:move", (data) => {
    socket.broadcast.emit("draw:move", data);
  });

  socket.on("board:update", (newLines) => {
      // emit to everyone (including the emitter)
      io.emit("board:update", newLines);
    });

     socket.on('draw:remove', (id: string) => {
    io.emit('draw:remove', id);
  });

  socket.on('draw:redo', (line) => {
    io.emit('draw:redo', line);
  });
    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
