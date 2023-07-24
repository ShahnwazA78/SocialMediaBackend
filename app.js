const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require("cors");
const app = express();

if (process.env.MODE_ENV != "production")
  require("dotenv").config({ path: "./config/config.env" });

//Using Middlewares
app.use(
  express.json({
    limit: "50mb",
  })
);
app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
  })
);
app.use(cookieParser());

// Use cors() middleware with the appropriate origin setting to allow requests from your frontend
app.use(
  cors({
    origin: "https://socail-media-front.vercel.app",
    credentials: true, // Allow cookies to be sent in the request (important for authentication)
  })
);
//Importing routes
const post = require("./routes/Post");
const user = require("./routes/user");

//Using routes
app.use("/api/v1", post);
app.use("/api/v1", user);

module.exports = app;
