import { Router } from "express";
import {
  changeUserPassword,
  getCurrentUser,
  getUserChannelInfo,
  getUserWatchHistory,
  loginUser,
  logoutUser,
  regenrateToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// creating the routers
// on router we are uploading 2files using multer with registering the user
router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

// secured paths (routes)
// all post requests
router.route("/refresh-token").post(regenrateToken);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-passoword").post(verifyJWT, changeUserPassword);

// all patch requests
router.route("/update-details").patch(verifyJWT, updateAccountDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/update-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// all get requests
router.route("/get-user").get(verifyJWT, getCurrentUser);
router.route("/c/:username").get(verifyJWT, getUserChannelInfo);
router.route("/history").get(verifyJWT, getUserWatchHistory);

export default router;
