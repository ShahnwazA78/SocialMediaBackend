const app = require("./app");
const cloudnary=require("cloudinary")
cloudnary.config({
  cloud_name:process.env.CLOUD_NAME,
  api_key:process.env.CLOUD_API_KEY,
  api_secret:process.env.CLOUD_API_SECRET
})
const connectDatabase = require("./config/database");
connectDatabase();
app.listen(process.env.PORT, () => {
  console.log(`server is running on port ${process.env.PORT}`);
});
