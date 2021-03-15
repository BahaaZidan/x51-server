import {
  AuthenticationError,
  PubSub,
  UserInputError,
  ForbiddenError,
} from "apollo-server-express";
import bcrypt from "bcrypt";
import { pipeResolvers } from "graphql-resolvers";
import {
  getUserByUsername,
  getUserByID,
  getUserFriends,
  getUserPendingFriendships,
  respondToFriendship,
} from "../controllers";
import Friendship from "../entity/Friendship";
import User from "../entity/User";
import { createLoginToken, verifyLoginToken } from "../utility/tokens";

const pubsub = new PubSub();

const helperResolvers = {
  auth: {
    isAuthenticated: (
      _parent: any,
      _args: any,
      { req, socketConnection }: any
    ) => {
      if (req) {
        return verifyLoginToken(req.headers["x-access-token"]);
      } else if (socketConnection) {
        return verifyLoginToken(socketConnection.context["x-access-token"]);
      }
      throw new ForbiddenError("Unsupported operation!");
    },
  },
};

const resolvers = {
  Query: {
    currentUser: pipeResolvers(
      helperResolvers.auth.isAuthenticated,
      (parent: any) => getUserByID(parent.id)
    ),

    user: () => {
      return null;
    },
  },

  Mutation: {
    signup: async (_parent: any, { input }: any) => {
      const user = new User();
      user.username = input.username;
      user.displayName = input.displayName;
      user.password = await bcrypt.hash(input.password, 10);

      const createdUser = await user.save();

      return {
        token: createLoginToken(createdUser.id, createdUser.username),
      };
    },
    login: async (_parent: any, { input }: any) => {
      const user = await getUserByUsername(input.username);

      if (!user) {
        throw new UserInputError("No user found with this login credentials.");
      }

      const isValid = await bcrypt.compare(input.password, user.password);

      if (!isValid) {
        throw new AuthenticationError("Invalid password.");
      }

      return {
        token: createLoginToken(user.id, user.username),
      };
    },
    userProfile: () => {
      return null;
    },
    createFriendRequest: pipeResolvers(
      helperResolvers.auth.isAuthenticated,
      async (parent: any, args: any) => {
        const receiverUser = await getUserByUsername(args.receiverUsername);

        if (!receiverUser) {
          throw new UserInputError("No user found with this ID.");
        }

        const friendship = new Friendship();
        friendship.senderID = parent.id;
        friendship.receiverID = receiverUser.id;

        // TODO : this doesn't throw on duplication
        const createdFriendship = await friendship.save();

        pubsub.publish(`FRIEND_REQUEST_CREATED_${args.receiverUsername}`, {
          friendRequestRecieved: createdFriendship,
        });
        return createdFriendship;
      }
    ),
    acceptFriendRequest: pipeResolvers(
      helperResolvers.auth.isAuthenticated,
      async (parent: any, args: any) => {
        await respondToFriendship(args.senderID, "accepted");
        return getUserByID(parent.id);
      }
    ),
    rejectFriendRequest: pipeResolvers(
      helperResolvers.auth.isAuthenticated,
      async (parent: any, args: any) => {
        await respondToFriendship(args.senderID, "blocked");
        return getUserByID(parent.id);
      }
    ),
  },

  Subscription: {
    friendRequestRecieved: {
      subscribe: pipeResolvers(
        helperResolvers.auth.isAuthenticated,
        (parent: any) =>
          pubsub.asyncIterator(`FRIEND_REQUEST_CREATED_${parent.username}`)
      ),
    },
  },

  FriendRequest: {
    from: (parent: any) => getUserByID(parent.senderID),
    to: (parent: any) => getUserByID(parent.receiverID),
  },

  User: {
    friends: async (parent: any) => getUserFriends(parent.id),
    friendRequests: (parent: any) => getUserPendingFriendships(parent.id),
  },
};

export default resolvers;
