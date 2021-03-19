import compact from "lodash/compact";
import RoomState, { Player } from "./RoomState";

export type XOSlotName =
  | "0-0"
  | "0-1"
  | "0-2"
  | "1-0"
  | "1-1"
  | "1-2"
  | "2-0"
  | "2-1"
  | "2-2";

type XOSlotState = undefined | null | "X" | "O";

class XORoomState extends RoomState {
  protected gameState: {
    currentTurn?: Player; // TODO : should be a Cyclic Linked List
    slots: {
      [key in XOSlotName]: XOSlotState;
    };
  };
  protected playerX?: string;
  protected playerO?: string;
  protected result?: "X" | "O" | "DRAW";

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
        if (xWins || oWins) this.result = xWins ? "X" : "O";
        return xWins || oWins;
      })
    ) {
      this.status = "done";
      return true;
    }
    if (compact(Object.values(this.gameState.slots)).length < 9) return false;

    this.status = "done";
    this.result = "DRAW";
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
      this.result = undefined;
      this.status = "ready";
      return true;
    }
    return false;
  }

  move(slot: XOSlotName, socketID: string) {
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

export default XORoomState;
