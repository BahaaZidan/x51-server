import dotenv from "dotenv";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Player } from "./RoomState";
import XORoomState from "./XORoomState";

dotenv.config();

const http = createServer();
const io = new SocketIOServer(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const TheBossObject = {
  xo: {
    name: "Tic Tac Toe",
    rooms: new Map<string, XORoomState>(),
  },
};

const xoNameSpace = io.of("/xo");

export const GAME_STATE_CHANGED = "GAME_STATE_CHANGED";
export const PLAYER_CREATE_ROOM_EVENT = "PLAYER_CREATE_ROOM_EVENT";
export const ROOM_CREATED_EVENT = "ROOM_CREATED_EVENT";
export const PLAYER_JOIN_ROOM_EVENT = "PLAYER_JOIN_ROOM_EVENT";
export const PLAYER_JOINED_ROOM_EVENT = "PLAYER_JOINED_ROOM_EVENT";
export const PLAYER_LEFT_ROOM_EVENT = "PLAYER_LEFT_ROOM_EVENT";
export const PLAYER_MOVED_EVENT = "PLAYER_MOVED_EVENT";
export const BOARD_CHANGED_EVENT = "BOARD_CHANGED_EVENT";
export const PLAYER_START_ROOM_EVENT = "PLAYER_START_ROOM_EVENT";
export const PLAYER_STARTED_ROOM_EVENT = "PLAYER_STARTED_ROOM_EVENT";
export const PLAYER_RESET_ROOM_EVENT = "PLAYER_RESET_ROOM_EVENT";
export const PLAYER_RESETED_ROOM_EVENT = "PLAYER_RESETED_ROOM_EVENT";

xoNameSpace.adapter.on("create-room", (room) => {
  TheBossObject.xo.rooms.set(room, new XORoomState());
});

xoNameSpace.adapter.on("delete-room", (room) => {
  TheBossObject.xo.rooms.delete(room);
});

xoNameSpace.adapter.on("join-room", (room, socketID) => {
  TheBossObject.xo.rooms.get(room)?.addPlayer(new Player(socketID));

  xoNameSpace
    .to(room)
    .emit(GAME_STATE_CHANGED, TheBossObject.xo.rooms.get(room)?.serialize());

  xoNameSpace.to(room).emit(PLAYER_JOINED_ROOM_EVENT, { socketID });
});

xoNameSpace.adapter.on("leave-room", (room, socketID) => {
  TheBossObject.xo.rooms.get(room)?.removePlayer(socketID);

  xoNameSpace
    .to(room)
    .emit(GAME_STATE_CHANGED, TheBossObject.xo.rooms.get(room)?.serialize());

  xoNameSpace.to(room).emit(PLAYER_LEFT_ROOM_EVENT, { socketID });
});

xoNameSpace.on("connection", (socket) => {
  socket.on(PLAYER_CREATE_ROOM_EVENT, () => {
    const newRoomID = uuidv4();
    socket.join(newRoomID);
    xoNameSpace.to(socket.id).emit(ROOM_CREATED_EVENT, { room: newRoomID });
  });

  socket.on(PLAYER_JOIN_ROOM_EVENT, ({ room }) => {
    socket.join(room);
  });

  socket.on(PLAYER_START_ROOM_EVENT, ({ room }) => {
    const result = TheBossObject.xo.rooms.get(room)?.start();

    if (result) {
      xoNameSpace
        .to(room)
        .emit(
          GAME_STATE_CHANGED,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );

      xoNameSpace
        .to(room)
        .emit(PLAYER_STARTED_ROOM_EVENT, { socketID: socket.id });
    }
  });

  socket.on(PLAYER_RESET_ROOM_EVENT, ({ room }) => {
    const result = TheBossObject.xo.rooms.get(room)?.reset();

    if (result) {
      xoNameSpace
        .to(room)
        .emit(
          GAME_STATE_CHANGED,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );

      xoNameSpace
        .to(room)
        .emit(PLAYER_RESETED_ROOM_EVENT, { socketID: socket.id });
    }
  });

  socket.on(PLAYER_MOVED_EVENT, ({ room, data: { slot } }) => {
    const result = TheBossObject.xo.rooms.get(room)?.move(slot, socket.id);
    if (result) {
      xoNameSpace
        .to(room)
        .emit(
          GAME_STATE_CHANGED,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );

      xoNameSpace.to(room).emit(BOARD_CHANGED_EVENT, { socketID: socket.id });
    }
  });
});

const PORT = 3002;

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
