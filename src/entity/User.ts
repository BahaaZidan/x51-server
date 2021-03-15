import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

@Entity()
export default class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "text",
    unique: true,
  })
  username: string;

  @Column({
    type: "character varying",
    length: 50,
    nullable: true,
  })
  displayName: string;

  @Column({
    type: "text",
  })
  password: string;

  @Column({
    type: "text",
    nullable: true,
  })
  imageURL: string;

  @Column({
    type: "text",
    nullable: true,
  })
  discordTag: string;
}
