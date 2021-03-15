import jwt from "jsonwebtoken";

export const createLoginToken = (id: number, username: string) =>
  jwt.sign({ id, username }, process.env.TOKEN_SECRET || "lolo", {
    expiresIn: "30d",
  });

export const verifyLoginToken = (token: string) =>
  jwt.verify(token, process.env.TOKEN_SECRET || "lolo");
