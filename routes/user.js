require("dotenv").config();
const express = require("express");
const userRouter = express.Router();
const passport = require("passport");
const passportConfig = require("../passport");
const JWT = require("jsonwebtoken");
const User = require("../models/User");
const Todo = require("../models/Todo");

const signToken = (userID) => {
  return JWT.sign(
    {
      iss: process.env.JWT_SECRET,
      sub: userID,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// @desc    Registering a User
// @route   POST /register
// @access  PUBLIC
userRouter.post("/register", (req, res) => {
  const { username, password, role } = req.body;
  // Check if user exists
  User.findOne({ username }, (err, user) => {
    if (err)
      res.status(500).json({
        message: { msgBody: "Something went wrong!", msgError: true },
      });
    if (user)
      res.status(400).json({
        message: { msgBody: "Username already in use!", msgError: true },
      });
    else {
      const newUser = new User({ username, password, role });
      newUser.save((err) => {
        if (err)
          res.status(500).json({
            message: { msgBody: "Something went wrong!", msgError: true },
          });
        else
          res.status(201).json({
            message: {
              msgBody: "Account successfully created!",
              msgError: false,
            },
          });
      });
    }
  });
});

// @desc    Login system
// @route   POST /login
// @access  PUBLIC
userRouter.post(
  "/login",
  passport.authenticate("local", { session: false }),
  (req, res) => {
    if (req.isAuthenticated()) {
      const { _id, username, role } = req.user;
      const token = signToken(_id);
      res.cookie("access_token", token, { httpOnly: true, sameSite: true });
      res.status(200).json({ isAuthenticated: true, user: { username, role } });
    }
  }
);

// @desc    Logout system
// @route   GET /login
// @access  PUBLIC
userRouter.get(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.clearCookie("access_token");
    res.json({ user: { username: "", role: "" }, success: true });
  }
);

// @desc    Adding Todos
// @route   POST /todo
// @access  PROTECTED
userRouter.post(
  "/todo",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const todo = new Todo(req.body);
    todo.save((err) => {
      if (err)
        res.status(500).json({
          message: { msgBody: "Something went wrong!", msgError: true },
        });
      else {
        req.user.todos.push(todo);
        req.user.save((err) => {
          if (err)
            res.status(500).json({
              message: { msgBody: "Something went wrong!", msgError: true },
            });
          else
            res.status(200).json({
              message: { msgBody: "Successfully created!", msgError: false },
            });
        });
      }
    });
  }
);

// @desc    Getting Todos
// @route   GET /todos
// @access  PROTECTED
userRouter.get(
  "/todos",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    User.findById({ _id: req.user._id })
      .populate("todos")
      .exec((err, document) => {
        if (err)
          res.status(500).json({
            message: { msgBody: "Something went wrong!", msgError: true },
          });
        else
          res.status(200).json({ todos: document.todos, authenticated: true });
      });
  }
);

// @desc    Admin Access (to a specific role)
// @route   GET /admin
// @access  PROTECTED
userRouter.get(
  "/admin",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req.user.role === "admin") {
      res
        .status(200)
        .json({ message: { msgBody: "You are an admin!", msgError: false } });
    } else {
      res.status(403).json({
        message: {
          msgBody: "You are not an admin! Go Away!",
          msgError: true,
        },
      });
    }
  }
);

// @desc    Authentication Persistence
// @route   GET /authenticated
// @access  PROTECTED
userRouter.get(
  "/authenticated",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { username, role } = req.user;
    res.status(200).json({ isAuthenticated: true, user: { username, role } });
  }
);

module.exports = userRouter;
