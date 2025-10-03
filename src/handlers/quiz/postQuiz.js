import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { extractTokenFromEvent, verifyToken } from "../../utils/jwt.js";
import { success, error } from "../../utils/responses.js";
import { createQuiz } from "../../utils/db.js";

export const postQuiz = async (event) => {
  try {
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
    return error(500, "Couldn't create quiz");
  }
};

export const postQuizHandler = middy(postQuiz)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
