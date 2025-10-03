import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../utils/db.js";
import { generateToken } from "../utils/jwt.js";
import { success, error } from "../utils/responses.js";

const signup = async (event) => {
  try {
    const { email, password } = event.body;

    if (!email || !password) {
      return error(400, "email and password is required");
    }

    if (password.length < 6) {
      return error(400, "password must be atleast 6 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(400, "email not valid format");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken({
      userId: user.userId,
      email: user.email,
    });

    return success({
      token,
      user: {
        userId: user.userId,
        email: user.email,
      },
      message: "User created successfully",
    });
  } catch (err) {
    console.error("Signup error:", err);

    if (err.message === "User already exist") {
      return error(400, "This email already exist");
    }
    return error(500, "Internal server error");
  }
};

const login = async (event) => {
  try {
    const { email, password } = event.body;

    if (!email || !password) {
      return error(400, "Email and password is needed");
    }

    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      return error(401, "Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return error(401, "Invalid credentials");
    }

    const token = generateToken({
      userId: user.userId,
      email: user.email,
    });

    return success({
      token,
      user: {
        userId: user.userId,
        email: user.email,
      },
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login Error", err);
    return error(500, "Internal server error");
  }
};

export const signupHandler = middy(signup)
  .use(jsonBodyParser())
  .use(httpErrorHandler());

export const loginHandler = middy(login)
  .use(jsonBodyParser())
  .use(httpErrorHandler());
