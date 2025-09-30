import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE;

export const createUser = async (userData) => {
  const userId = `user_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userData.email}`,
      SK: "PROFILE",
      userId,
      email: userData.email,
      password: userData.password,
      createdAt: new Date().toISOString(),
    },
    ConditionExpression: "attribute_not_exists(pk)",
  });

  try {
    await ddb.send(command);
    return { userId, email: userData.email };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User already exists");
    }
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: "PROFILE",
    },
  });

  const result = await ddb.send(command);
  return result.Item;
};

export const getUserById = async (userId) => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "GSI1",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributesValue: {
      ":userId": userId,
    },
  });

  const result = await ddb.send(command);
  return result.Items?.[0];
};
