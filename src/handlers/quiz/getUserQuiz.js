import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { success, error } from "../../utils/responses.js";
import { getQuizById } from "../../utils/db.js";

export const getUserQuiz = async (event) => {
  try {
    const { quizId } = event.pathParameters;

    const quiz = await getQuizById(quizId);
    if (!quiz) {
      return error(404, "Quiz not found");
    }

    return success(quiz);
  } catch (err) {
    console.error(err);
    return error(500, "Couldn't fetch quiz");
  }
};

export const getUserQuizHandler = middy(getUserQuiz).use(httpErrorHandler());
