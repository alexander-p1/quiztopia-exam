import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { extractTokenFromEvent, verifyToken } from "../../utils/jwt.js";
import { success, error } from "../../utils/responses.js";
import { addQuestionToQuiz } from "../../utils/db.js";

export const postQuestion = async (event) => {
  try {
    const token = extractTokenFromEvent(event);
    const user = verifyToken(token);

    const { quizId, name, question, answer, location } = event.body;

    if (
      !quizId ||
      !name ||
      !question ||
      !answer ||
      !location ||
      location.longitude === undefined ||
      location.latitude === undefined
    ) {
      return error(400, "All fields are required");
    }

    await addQuestionToQuiz(quizId, user, {
      name,
      question,
      answer,
      location,
    });
    return success({ message: "Question added successfully" });
  } catch (err) {
    console.error(err);
    if (err.message.includes("token")) {
      return error(401, "Unauthorized");
    }
    if (err.message.includes("not owner")) {
      return error(403, "You can only add questions to your own quiz");
    }
    return error(500, "Couldn't add question");
  }
};

export const postQuestionHandler = middy(postQuestion)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
