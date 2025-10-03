import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { success, error } from "../../utils/responses.js";
import {
  getAllQuizzes,
} from "../../utils/db.js";

export const getQuiz = async () => {
  try {
    const quizzes = await getAllQuizzes();
    return success(quizzes);
  } catch (err) {
    console.error(err);
    return error(500, "Couldn't fetch quiz");
  }
};

export const getQuizHandler = middy(getQuiz)
  .use(httpErrorHandler())