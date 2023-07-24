const User = require("../models/User");
const Post = require("../models/Post");
const crypto = require("crypto");
const { sendEmail } = require("../middleware/sendEmail");
const cloudinary = require("cloudinary");
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "user already exist",
      });
    }

    const myAvatars = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });

    user = await User.create({
      name,
      email,
      password,
      avatar: { public_id: myAvatars.public_id, url: myAvatars.secure_url },
    });

    const token = await user.generateToken();
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true, // Set the secure flag to true for HTTPS-only cookies
    };
    console.log("before cookies set");
    res.status(201).cookie("token", token, options).json({
      success: true,
      user,
      token,
    });
    console.log("after cookies set");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email })
      .select("+password")
      .populate("following followers posts");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not exists",
      });
    }
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password not match",
      });
    }

    const token = await user.generateToken();
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true, // Set the secure flag to true for HTTPS-only cookies
    };
    console.log("before cookies set");

    return res.status(200).cookie("token", token, options).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, { expires: new Date(Date.now()), httpOnly: true })
      .json({
        success: true,
        message: "Logged Out",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.followUser = async (req, res) => {
  try {
    const logedInUser = await User.findById(req.user._id);
    const userToFollow = await User.findById(req.params.id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (logedInUser.following.includes(userToFollow._id)) {
      const indexfollowing = logedInUser.following.indexOf(userToFollow._id);
      logedInUser.following.splice(indexfollowing, 1);

      const indexfollowers = userToFollow.followers.indexOf(logedInUser._id);
      userToFollow.followers.splice(indexfollowers, 1);

      await logedInUser.save();
      await userToFollow.save();

      return res.status(200).json({
        success: false,
        message: "User Unfollowed",
      });
    } else {
      logedInUser.following.push(userToFollow._id);
      userToFollow.followers.push(logedInUser._id);

      await logedInUser.save();
      await userToFollow.save();
    }

    res.status(200).json({
      success: true,
      message: "User Followed",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please enter old and new password",
      });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { name, email, avatar } = req.body;

    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "Please enter name and email",
      });
    }

    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email;
    }

    if (avatar) {
      await cloudinary.uploader.destroy(user.avatar.public_id);

      const myAvatars = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });

      user.avatar.public_id = myAvatars.public_id;
      user.avatar.url = myAvatars.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCaption = async (req, res) => {
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
        message: "You are not authorized to update this post",
      });
    }

    post.caption = req.body.caption;
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const posts = user.posts;
    const followers = user.followers;
    const following = user.following;
    const userId = user._id;

    //removing Avatar from cloudinary also
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    await user.remove();
    //logout user after deleting profile
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true, // Set the secure flag to true for HTTPS-only cookies
    });

    //delete all posts of the user
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.findById(posts[i]);

      await post.remove();
    }

    //removing user from followers followings;
    for (let i = 0; i < followers.length; i++) {
      const follower = await User.findById(followers[i]);
      const index = follower.following.indexOf(userId);
      follower.following.splice(index, 1);
      await follower.save();
    }

    //removing user from  followings followers;
    for (let i = 0; i < following.length; i++) {
      const follows = await User.findById(following[i]);
      const index = follows.followers.indexOf(userId);
      follows.followers.splice(index, 1);
      await follows.save();
    }

    //removing all comments of the user from all posts
    const allPosts = await Post.find();
    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);
      for (let j = 0; j < post.comments.length; j++) {
        if (post.comments[j].user.toString() === userId.toString()) {
          post.comments.splice(j, 1);
          await post.save();
          break;
        }
      }
    }

    //removing all likes of the user from all posts
    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);
      for (let j = 0; j < post.likes.length; j++) {
        if (post.likes[j].toString() === userId.toString()) {
          post.likes.splice(j, 1);
          await post.save();
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "posts followers following"
    );
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "posts followers following"
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      name: { $regex: req.query.name, $options: "i" },
    });
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const resetPasswordToken = user.getResetPasswordToken();

    await user.save();

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/password/reset/${resetPasswordToken}`;
    const message = `Reset Your password by clicking on the link below:\n\n${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Password",
        message,
      });
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email}`,
      });
    } catch (error) {
      //mail sent failed so make changes undefined that we did change on user model
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expire token",
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const posts = [];
    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUsersPosts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const posts = [];
    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
