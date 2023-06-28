const express = require("express");
const {
  createPost,
  likeAndUnlikePost,
  deletePost,
  getPosOfFollowing,
  commentOnPost,
  deletePostComment,
} = require("../controllers/Post");
const { updateCaption } = require("../controllers/user");
const { isAuthenticated } = require("../middleware/auth");
const router = express.Router();

router.route("/post/upload").post(isAuthenticated, createPost);

router
  .route("/post/:id")
  .get(isAuthenticated, likeAndUnlikePost)
  .put(isAuthenticated, updateCaption)
  .delete(isAuthenticated, deletePost);

router.route("/posts").get(isAuthenticated, getPosOfFollowing);

//taking put as it is not neccessary we only post comment we can update also the post comment
router.route("/post/comment/:id").put(isAuthenticated, commentOnPost).delete(isAuthenticated,deletePostComment);

module.exports = router;
