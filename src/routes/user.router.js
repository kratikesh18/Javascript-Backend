import {Router} from 'express'
import { registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';

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
// router.route("/login" ).post(login)

export default router