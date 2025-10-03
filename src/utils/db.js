import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE;

export const createUser = async (userData) => {
  const userId = uuidv4();

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
    ConditionExpression: "attribute_not_exists(PK)",
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

export const createQuiz = async (title, user) => {
  const quizId = uuidv4();

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

export const getQuizById = async (quizId) => {
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

  const newQuestion = {
    questionId: uuidv4(),
    name: questionData.name,
    question: questionData.question,
    answer: questionData.answer,
    location: {
      longitude: questionData.location.longitude,
      latitude: questionData.location.latitude,
    },
    createdAt: new Date().toISOString(),
  };

  const updateCommand = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: "METADATA",
    },
    UpdateExpression:
      "SET questions = list_append(if_not_exists(questions, :empty), :q)",
    ExpressionAttributeValues: {
      ":q": [newQuestion],
      ":empty": [],
    },
    ReturnValues: "UPDATED_NEW",
  });

  await ddb.send(updateCommand);
  return newQuestion;
};

export const deleteQuizFromDb = async (quizId, user) => {
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
