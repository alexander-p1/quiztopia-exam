import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
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
    ExpressionAttributeValue: {
      ":userId": userId,
    },
  });

  const result = await ddb.send(command);
  return result.Items?.[0];
};

// Quiz

export const createQuiz = async (title, user) => {
  const quizId = `quiz_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
      quizId,
      title,
      createdBy: user.userId,
      createdByEmail: user.email,
      createdAt: new Date().toISOString(),
      questions: [],
    },
  });

  await ddb.send(command);
  return { quizId, title, createdBy: user.userId, createdByEmail: user.email };
};

export const getAllQuizzes = async () => {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
    ExpressionAttributeValues: {
      ":pk": "QUIZ#",
      ":sk": "METADATA",
    },
  });

  const result = await ddb.send(command);
  return result.Items.map((item) => ({
    quizId: item.quizId,
    title: item.title,
    createdBy: item.createdByEmail,
  }));
};

export const getQuizById = async (quizId, userId) => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
    },
  });

  const result = await ddb.send(command);
  if (!result.Item) {
    return null;
  }

  return {
    quizId: result.Item.quizId,
    title: result.Item.title,
    createdBy: result.Item.createdByEmail,
    questions: result.Item.questions || [],
  };
};

export const addQuestionToQuiz = async (quizId, user, questionData) => {
  // Först hämta quiz för att kolla ägare
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
    },
  });

  const result = await ddb.send(getCommand);
  if (!result.Item) {
    throw new Error("Quiz not found");
  }

  if (result.Item.createdBy !== user.userId) {
    throw new Error("You are not owner of this quiz");
  }

  // Lägg till frågan
  const newQuestion = {
    questionId: `q_${Date.now()}`,
    question: questionData.question,
    answer: questionData.answer,
    location: {
      longitude: questionData.longitude,
      latitude: questionData.latitude,
    },
    createdAt: new Date().toISOString(),
  };

  const updateCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      ...result.Item,
      questions: [...(result.Item.questions || []), newQuestion],
    },
  });

  await ddb.send(updateCommand);
  return newQuestion;
};

export const deleteQuizFromDb = async (quizId, user) => {
  // Först hämta quiz för att kolla ägare
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
    },
  });

  const result = await ddb.send(getCommand);
  if (!result.Item) {
    throw new Error("Quiz not found");
  }

  if (result.Item.createdBy !== user.userId) {
    throw new Error("You are not owner of this quiz");
  }

  // Ta bort quiz
  const deleteCommand = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
    },
  });

  await ddb.send(deleteCommand);
  return true;
};
