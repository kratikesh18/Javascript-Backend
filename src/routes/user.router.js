import {Router} from 'express'
import { loginUser, logoutUser, regenrateToken, registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// creating the routers 
// on router we are uploading 2files using multer with registering the user
router.route("/register" ).post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secured paths (routes)
router.route("/logout").post(verifyJWT , logoutUser)
router.route("/refresh-token").post(regenrateToken)

export default router