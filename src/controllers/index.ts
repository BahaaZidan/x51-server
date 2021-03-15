import Friendship, { FriendshipStatus } from "../entity/Friendship";
import User from "../entity/User";

export const getUserFriendships = (userID: number, status: FriendshipStatus) =>
  Friendship.createQueryBuilder("friendship")
    .where("friendship.receiverID = :userID AND friendship.status = :status", {
      userID,
      status,
    })
    .getMany();

export const getUserPendingFriendships = (userID: number) =>
  getUserFriendships(userID, "pending");

export const getUserRelevantFriendships = (userID: number) =>
  Friendship.createQueryBuilder("friendship")
    .where(
      "(friendship.senderID = :userID OR friendship.receiverID = :userID) AND friendship.status = :status",
      {
        userID,
        status: "accepted",
      }
    )
    .getMany();

export const getUserFriends = async (userID: number) => {
  const relevantFriendships = await getUserRelevantFriendships(userID);

  return relevantFriendships.map((friendship) => {
    const friendUserID =
      friendship.senderID !== userID
        ? friendship.senderID
        : friendship.receiverID;

    return getUserByID(friendUserID);
  });
};

export const getUserByUsername = (username: string) =>
  User.findOne({ username });

export const getUserByID = (id: number) => User.findOne(id);

export const respondToFriendship = (
  senderID: number,
  newStatus: "blocked" | "accepted"
) => Friendship.update({ senderID }, { status: newStatus });
