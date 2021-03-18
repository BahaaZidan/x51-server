import dotenv from "dotenv";
import Express from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import compact from "lodash/compact";

dotenv.config();

const app = Express();
const http = createServer(app);
const io = new SocketIOServer(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

class Player {
  socketID: string;
  nickname?: string;

  constructor(socketID: string, nickname?: string) {
    this.socketID = socketID;
    this.nickname = nickname;
  }
}

abstract class RoomState {
  protected connectedPlayers: Array<Player> = [];
  protected abstract gameState: any;
  protected status: "notReady" | "ready" | "inProgress" | "done" = "notReady";
  protected minPlayers: number;
  protected maxPlayers: number;

  constructor(minPlayers: number, maxPlayers: number) {
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
  }

  isReady() {
    if (this.connectedPlayers.length === this.minPlayers) {
      this.status = "ready";
      return true;
    }
    return false;
  }

  isJoinable() {
    return this.connectedPlayers.length < this.maxPlayers;
  }

  abstract isFinished(): boolean;
  abstract reset(): boolean;
  abstract move(...args: any): boolean;

  start() {
    if (this.status === "ready") {
      this.status = "inProgress";
      return true;
    }
    return false;
  }

  addPlayer(player: Player) {
    if (this.isJoinable()) {
      this.connectedPlayers = this.connectedPlayers.concat(player);
      this.isReady();
      return true;
    }
    return false;
  }

  removePlayer(socketID: string) {
    this.connectedPlayers = this.connectedPlayers.filter(
      (player) => player.socketID !== socketID
    );
    this.isReady();
  }

  serialize() {
    return this;
  }
}

type XOSlotName =
  | "0-0"
  | "0-1"
  | "0-2"
  | "1-0"
  | "1-1"
  | "1-2"
  | "2-0"
  | "2-1"
  | "2-2";

class XORoomState extends RoomState {
  protected gameState: {
    currentTurn?: Player; // TODO : should be a Cyclic Linked List
    slots: {
      [key in XOSlotName]: XOSlotState;
    };
  };
  protected playerX?: string;
  protected playerO?: string;
  protected winner?: "X" | "O";

  private static winningSlots: Array<Array<XOSlotName>> = [
    ["0-0", "0-1", "0-2"],
    ["1-0", "1-1", "1-2"],
    ["2-0", "2-1", "2-2"],

    ["0-0", "1-0", "2-0"],
    ["0-1", "1-1", "2-1"],
    ["0-2", "1-2", "2-2"],

    ["0-0", "1-1", "2-2"],
    ["0-2", "1-1", "2-0"],
  ];

  constructor() {
    super(2, 2);
    this.gameState = {
      slots: {
        "0-0": null,
        "0-1": null,
        "0-2": null,
        "1-0": null,
        "1-1": null,
        "1-2": null,
        "2-0": null,
        "2-1": null,
        "2-2": null,
      },
    };
  }

  addPlayer(player: Player) {
    const result = super.addPlayer(player);
    if (!result) return false;
    if (!this.playerX) {
      this.playerX = player.socketID;
    } else if (!this.playerO) {
      this.playerO = player.socketID;
    }
    return true;
  }

  start() {
    if (this.status !== "ready") return false;
    this.gameState.currentTurn = this.connectedPlayers[
      Math.floor(Math.random() * this.connectedPlayers.length)
    ];
    this.status = "inProgress";
    return true;
  }

  isFinished() {
    if (this.status === "notReady" || this.status === "ready") return false;
    if (
      XORoomState.winningSlots.find((slots) => {
        const xWins = slots.every((slot) => this.gameState.slots[slot] === "X");
        const oWins = slots.every((slot) => this.gameState.slots[slot] === "O");
        if (xWins || oWins) this.winner = xWins ? "X" : "O";
        return xWins || oWins;
      })
    ) {
      this.status = "done";
      return true;
    }
    if (compact(Object.values(this.gameState.slots)).length < 9) return false;

    this.status = "done";
    return true;
  }

  reset() {
    if (this.status === "done") {
      this.gameState.slots = {
        "0-0": null,
        "0-1": null,
        "0-2": null,
        "1-0": null,
        "1-1": null,
        "1-2": null,
        "2-0": null,
        "2-1": null,
        "2-2": null,
      };
      this.winner = undefined;
      this.status = "ready";
      return true;
    }
    return false;
  }

  move(slot: XOSlotName, socketID: string) {
    if (this.status === "done") return false; // INVESTIGATE : try switching this line with the one after it.
    if (this.status !== "inProgress") return false;
    if (this.gameState.currentTurn?.socketID !== socketID) return false;
    if (this.gameState.slots[slot]) return false;
    if (this.playerX === socketID) {
      this.gameState.slots[slot] = "X";
      this.gameState.currentTurn = this.connectedPlayers.find(
        (player) => player.socketID !== socketID
      );
      this.isFinished();
      return true;
    }
    if (this.playerO === socketID) {
      this.gameState.slots[slot] = "O";
      this.gameState.currentTurn = this.connectedPlayers.find(
        (player) => player.socketID !== socketID
      );
      this.isFinished();
      return true;
    }
    return false;
  }
}

const TheBossObject = {
  xo: {
    name: "Tic Tac Toe",
    rooms: new Map<string, XORoomState>(),
  },
};

type XOSlotState = undefined | null | "X" | "O";

const xoNameSpace = io.of("/xo");

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
    .emit(
      PLAYER_JOINED_ROOM_EVENT,
      TheBossObject.xo.rooms.get(room)?.serialize()
    );
});

xoNameSpace.adapter.on("leave-room", (room, socketID) => {
  TheBossObject.xo.rooms.get(room)?.removePlayer(socketID);
  xoNameSpace
    .to(room)
    .emit(
      PLAYER_LEFT_ROOM_EVENT,
      TheBossObject.xo.rooms.get(room)?.serialize()
    );
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
          PLAYER_STARTED_ROOM_EVENT,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );
    }
  });

  socket.on(PLAYER_RESET_ROOM_EVENT, ({ room }) => {
    const result = TheBossObject.xo.rooms.get(room)?.reset();

    if (result) {
      xoNameSpace
        .to(room)
        .emit(
          PLAYER_RESETED_ROOM_EVENT,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );
    }
  });

  socket.on(PLAYER_MOVED_EVENT, ({ room, data: { slot } }) => {
    const result = TheBossObject.xo.rooms.get(room)?.move(slot, socket.id);
    if (result) {
      xoNameSpace
        .to(room)
        .emit(
          BOARD_CHANGED_EVENT,
          TheBossObject.xo.rooms.get(room)?.serialize()
        );
    }
  });
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
