const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary=require("cloudinary")
exports.createPost = async (req, res) => {
  try {
    //cloudnary
    const mycloud=await cloudinary.v2.uploader.upload(req.body.image,{
      folder:"posts"});
    const newPostData = {
      caption: req.body.caption,
      image: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      },
      owner: req.user._id,
    };

    const newPost = await Post.create(newPostData);
    const user = await User.findById(req.user._id);

    user.posts.unshift(newPost._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to delete this post",
      });
    }

    await cloudinary.v2.uploader.destroy(post.image.public_id);
    
    await post.remove();


     const user = await User.findById(req.user._id);
     const index = user.posts.indexOf(req.params.id);
     user.posts.splice(index, 1);
     await user.save();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });

  } catch (error) {
   return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.likeAndUnlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.likes.includes(req.user._id)) {
      const index = post.likes.indexOf(req.user._id);
      post.likes.splice(index, 1);
      await post.save();

      return res.status(200).json({
        succcess: true,
        message: "Post Unliked",
      });
    } else {
      post.likes.push(req.user._id);
      await post.save();

      return res.status(200).json({
        succcess: true,
        message: "Post Liked",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPosOfFollowing = async (req, res) => {
  try {
    // const user = await User.findById(req.user._id).populate("following","posts") hum aise v krskte h;
    const user = await User.findById(req.user._id);
    const posts = await Post.find({
      owner: {
        $in: user.following,
      },
    }).populate("owner likes comments.user");
    res.status(200).json({
      succcess: true,
      posts:posts.reverse(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    let commentIndex = -1;
    post.comments.forEach((item, index) => {
      if (item.user.toString() === req.user._id.toString()) {
        commentIndex = index;
      }
    });
    if (commentIndex != -1) {
      post.comments[commentIndex].comment = req.body.comment;
      await post.save();
      return res.status(200).json({
        success: true,
        message: "Comment updated successfully",
      });
    } else {
      post.comments.push({
        user: req.user._id,
        comment: req.body.comment,
      });
      await post.save();
      return res.status(200).json({
        success: true,
        message: "Comment added successfully",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePostComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }


    //checking if owner wants to delete the comment
    if (post.owner.toString() === req.user._id.toString()) {
  
      if(req.body.commentId==undefined)
      {
       return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      post.comments.forEach((item, index) => {
        if (item._id.toString() === req.body.commentId.toString()) {
          return post.comments.splice(index, 1);
        }
      });
      await post.save();
      res.status(200).json({
        success: true,
        message: "Selected Comment deleted successfully",
      });
      
    } else {
      post.comments.forEach((item, index) => {
        if (item.user.toString() === req.user._id.toString()) {
          return post.comments.splice(index, 1);
        }
      });

      await post.save();

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
