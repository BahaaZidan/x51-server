import { Entity, BaseEntity, Check, PrimaryColumn, Column } from "typeorm";

export type FriendshipStatus = "pending" | "blocked" | "accepted";

@Entity()
@Check(`"senderID" < "receiverID" OR "senderID" > "receiverID"`)
export default class Friendship extends BaseEntity {
  @PrimaryColumn()
  senderID: number;

  @PrimaryColumn()
  receiverID: number;

  @Column({
    default: "pending",
  })
  status: FriendshipStatus;
}
