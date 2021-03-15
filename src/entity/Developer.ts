import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

type Link = {
  name: string;
  url: string;
};

@Entity()
export default class Developer extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "text",
    unique: true,
  })
  username: string;

  @Column({
    type: "text",
  })
  passwordHash: string;

  @Column({
    type: "text",
  })
  imageURL: string;

  @Column({
    type: "text",
  })
  coverURL: string;

  @Column({
    type: "json",
    array: true,
  })
  links: Array<Link>;
}
