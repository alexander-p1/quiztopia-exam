import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpCors from "@middy/http-cors";
import { extractTokenFromEvent, verifyToken } from "../utils/jwt.js";
import { success, error } from "../utils/responses.js";
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  addQuestionToQuiz,
  deleteQuizFromDb,
} from "../utils/database.js";

// Hämta alla quiz (publik)
const getQuiz = async (event) => {
  try {
    const quizzes = await getAllQuizzes();
    return success(quizzes);
  } catch (err) {
    console.error(err);
    return error(500, "Could not fetch quizzes");
  }
};

// Skapa nytt quiz (kräver inloggning)
const postQuiz = async (event) => {
  try {
    // Kolla JWT
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { title } = event.body;
    if (!title) {
      return error(400, "Title is required");
    }

    const quiz = await createQuiz(title, user);
    return success(quiz);
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    return error(500, "Could not create quiz");
  }
};

// Lägg till fråga (kräver inloggning)
const postQuestion = async (event) => {
  try {
    // Kolla JWT
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { quizId, question, answer, longitude, latitude } = event.body;

    if (
      !quizId ||
      !question ||
      !answer ||
      longitude === undefined ||
      latitude === undefined
    ) {
      return error(400, "All fields are required");
    }

    await addQuestionToQuiz(quizId, user, {
      question,
      answer,
      longitude,
      latitude,
    });
    return success({ message: "Question added successfully" });
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    if (err.message.includes("not owner")) {
      return error(403, "You can only add questions to your own quizzes");
    }
    return error(500, "Could not add question");
  }
};

// Hämta specifikt quiz (kräver inloggning)
const getUserQuiz = async (event) => {
  try {
    // Kolla JWT
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { userid, quizid } = event.pathParameters;

    const quiz = await getQuizById(quizid, userid);
    if (!quiz) {
      return error(404, "Quiz not found");
    }

    return success(quiz);
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    return error(500, "Could not fetch quiz");
  }
};

// Ta bort quiz (kräver inloggning)
const deleteQuiz = async (event) => {
  try {
    // Kolla JWT
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { quizid } = event.pathParameters;

    await deleteQuizFromDb(quizid, user);
    return success({ message: "Quiz deleted successfully" });
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    if (err.message.includes("not owner")) {
      return error(403, "You can only delete your own quizzes");
    }
    return error(500, "Could not delete quiz");
  }
};

// Exportera med Middy middleware
export const getQuizHandler = middy(getQuiz)
  .use(httpErrorHandler())
  .use(httpCors());

export const postQuizHandler = middy(postQuiz)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(httpCors());

export const postQuestionHandler = middy(postQuestion)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(httpCors());

export const getUserQuizHandler = middy(getUserQuiz)
  .use(httpErrorHandler())
  .use(httpCors());

export const deleteQuizHandler = middy(deleteQuiz)
  .use(httpErrorHandler())
  .use(httpCors());
