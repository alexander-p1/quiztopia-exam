import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { extractTokenFromEvent, verifyToken } from "../../utils/jwt.js";
import { success, error } from "../../utils/responses.js";
import { deleteQuizFromDb } from "../../utils/db.js";

export const deleteQuiz = async (event) => {
  try {
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { quizId } = event.pathParameters;

    await deleteQuizFromDb(quizId, user);
    return success({ message: "Quiz deleted successfully" });
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    if (err.message.includes("not owner")) {
      return error(403, "You can only delete your own quiz");
    }
    return error(500, "Couldn't delete quiz");
  }
};

export const deleteQuizHandler = middy(deleteQuiz).use(httpErrorHandler());
