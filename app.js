const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();

if (process.env.MODE_ENV != "production")
  require("dotenv").config({ path: "backend/config/config.env" });

//Using Middlewares
app.use(express.json({
    limit: '50mb'
  }
));
app.use(express.urlencoded({
  limit: "50mb", 
  extended: true
 }
));
app.use(cookieParser())

//Importing routes
const post = require("./routes/Post");
const user = require("./routes/User");

//Using routes
app.use("/api/v1", post);
app.use("/api/v1", user);

module.exports = app;
