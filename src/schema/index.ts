import { gql } from "apollo-server-express";

const schema = gql`
  type User {
    id: ID!
    username: String!
    displayName: String
    imageURL: String
    discordTag: String
    friends: [User]!
    friendRequests: [FriendRequest]!
  }

  type Token {
    token: String!
  }

  type FriendRequest {
    from: User!
    to: User!
  }

  input SignUpInput {
    username: String!
    displayName: String
    password: String!
  }

  input LoginInput {
    username: String!
    password: String!
  }

  input UserProfileInput {
    displayName: String
    imageURL: String
    discordTag: String
  }

  type Query {
    currentUser: User!
    user(username: String!): User
  }

  type Mutation {
    signup(input: SignUpInput!): Token
    login(input: SignUpInput!): Token
    userProfile(input: UserProfileInput!): User!
    createFriendRequest(receiverUsername: String!): FriendRequest!
    acceptFriendRequest(senderID: Int!): User!
    rejectFriendRequest(senderID: Int!): User!
  }

  type Subscription {
    friendRequestRecieved: FriendRequest
  }
`;

export default schema;
