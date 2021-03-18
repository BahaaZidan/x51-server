export class Player {
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

export default RoomState;
