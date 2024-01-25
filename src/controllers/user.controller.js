import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { updloadFileToCloud } from '../utils/Cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from 'mongoose'
import jwt from "jsonwebtoken"


const genrateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.genrateAccessToken()
        const refreshToken = user.genrateRefreshToken()

        // the both accesstoken and refreshtokens are genrated but the refeshToken is required to store in the db 
        user.refreshToken = refreshToken
        // storing to the db 
        await user.save({ validateBeforeSave: false })

        // now returning both tokens 
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(503, "Error Occured while genrating tokens")
    }

}


const registerUser = asyncHandler(async (req, res) => {
    // res.status("200").json({
    //     message:"Successful"
    // })


    // an  algorithm for writing the register the user
    /* 1.take input from frontend 
    2. validate if the data is entered correctly  ( ! empty)
    3. check if the user is already registerd ? 
    4. check for the images , check for avatar 
    5. upload the image data to cloudinary 
    6. create the user object - create entry to db
    7. rempove password and refresh token from the respone 
    8. check  check for the user creation
    9. return the respone whatever it is */

    // extraction of data from the reqeuest 

    console.log("\n!------------ User Registration Started -----------!")
    const { email, username, password, fullName } = req.body
    console.log("fullName is : ", email);
    console.log("username is : ", username);
    console.log("email is : ", email);
    console.log("password is : ", password);

    // validating if the all inputs are not empty 
    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(401, "those fileds are can't be empty ")
    }

    // checking if the user is already registerd 
    const userDoExist = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (userDoExist) {
        throw new ApiError(409, "User with this username or email already exist!")
    }

    // checking for the avatar and coverimage 
    //  console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(req.files, avatarLocalPath)

    //same as for coverimage 
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    // uploading to the cloudinary 
    const avatar = await updloadFileToCloud(avatarLocalPath)

    const coverImage = await updloadFileToCloud(coverImageLocalPath)

    // if avatar is faild to updload 
    if (!avatar) {
        throw new ApiError(500, "Error occured while uploading avatar ")
    }

    // else all set and  craeate the user object 
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",      //push if the url is found or else push empty string 
        username: username.toLowerCase()
    })

    // remove all the refresh token and password from the upfront response 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "An Error occured while registering the user")
    }

    createdUser ? console.log("!------------ user registeration successfull -------------! \n") : null;


    // now at the end  we are sending the final response 
    return res.status(200).json(
        // returning the api with the predeifined format of ApiResponse 
        new ApiResponse(200, createdUser, "User registered successfully !")

    )
})

const loginUser = asyncHandler(async (req, res, next) => {
    /* steps to login the user
    1.input from the req.body 
    2.validate the inputs (!empty)
    3.check the user exist 
    4.validate the user 
    5.find the user 
    6.genrate accessToken and refreshToken 
    7.send cookies */



    console.log("\n!---------------Login Process is Started. ----------------!")
    const { email, username, password } = req.body
    console.log("Credential  is ", email ? email : username)

    if (!username && !email) {
        throw new ApiError(405, "Email or Username is required !");
    }

    // finding the user from the db make sure to await  
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })


    if (!user) {
        throw new ApiError(401, "Creadentials not found, User does not exist!")
    }

    //validating the password dbOperation  
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(406, "Enter the Valid Password")
    }

    // genrating the accessToken and refreshToken thats a time taking process await till token genrates  
    const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(user._id)

    // now accessing the logged-in user 
    const loggedUser = await User.findById(user._id).select("-password -refreshToken")


    //cookie-options 
    const options = {
        httpOnly: true,
        secure: true
    }

    console.log("!--------------- Login Process is Ended. ----------------!\n")
    // sending the response 
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser, accessToken, refreshToken
                },
                "User logged in SuccessFully"
            ),
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    console.log("\n!--------- Logout Process Started --------------!")
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    // setting options for the response
    const options = {
        httpOnly: true,
        secure: true
    }

    console.log("!--------- Logout Process Ended  --------------!\n")
    // sending ApiResponse
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged out successfully"))
})


const regenrateToken = asyncHandler(async (req, res, next) => {
    /* we are genrating the access token using the refreshToken
    1. retriving the token (refreshToken)
    2. if token found go try catch  
    3. decode the token by verifying it 
    4. find the user by decoded info i.e  (_id) 
    5. check if user found or not throw error
    6. check if incomming token is matches to the stored refresh token of user Database 
    7. if the refresh token is not matches throw error we didnt do process any further because refresh token is expired or invalid
    8. else call the genrate tokens and send them as a response */

    const incommingToken = req.cookies.refreshToken || req.body.refreshToken
    console.log("\n!---------Started Regenrating tokens ----------!")
    if (!incommingToken) {
        throw new ApiError(402, " UnAuthorized : Refesh Token is not found ")
    }

    try {
        // verifying the token 
        const decodedInfo = jwt.verify(incommingToken, process.env.REFRESH_TOKEN_SECRET)

        // finding the user by using this decoded infos DBCALl! 
        const user = await User.findById(decodedInfo?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token ")
        }


        // if user is found now make a call to the db compare the incomming token to the db token 
        if (incommingToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is used or invalid ")
        }

        // returning the new accesstoken and refresh token as a response with the http options 
        const options = {
            httpOnly: true,
            secure: true
        }

        // now generate the toke using function 
        const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(decodedInfo._id)

        console.log("!-------- Access and refreshToken Genrated Successfully ----!\n")
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200,
                    { accessToken, refreshToken },
                    "Access token regenrated successfully! ")
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Request")
    }
})


// writing more controllers for password updataion getting current user , update account details , uploading files 

const changeUserPassword = asyncHandler(async (req, res) => {
    // extracting old and new password from request of user 
    const { oldPassword, newPassword } = req.body

    //the user is logged in so we can access the user directly by req.user
    // by accessing the user we can get the ._id of the user and we can find the data entry

    const user = await User.findById(req.user?._id)

    // if(!user){
    //     throw new ApiError(401, "User not found ")
    // }

    // checking if the old password is same as the currenct password 
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)                  
                                    //this user always be the object method is calling for the this object 
    if (!isOldPasswordCorrect) {
        throw new ApiError(400, "Enter Correct Old Password ")
    }

    // if we reach down here , that means we got the correct old password 
    user.password = newPassword
    // saving tne new passowrd to the database 
    await user.save({ validateBeforeSave: false })

    // the password is successfully stored to the database now its time to return the response 
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password is updated successfully "))
})

// gettin the currentUser 
const getCurrentUser = asyncHandler(async (req, res) => {
    // if user is already logged in then we can get directly the user 
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "CurrentUser Fetched Successfully!"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    // here we are updating the fullName and email of the user 
    const { fullName, email } = req.body

    // check if the both things are not empty 
    if (!fullName || !email) {
        throw new ApiError(405, "Mentioned fields are required!")
    }

    // finding the user and updating the data to the database 
    const user = await User.findOneAndUpdate(
        req.user._id,
        {
            $set: {

                fullName: fullName,
                email: email
            }

        },
        { new: true }
    )   //now removing the password field from the user '   
        .select("-password")

    // we are ready to send the response containing the user 
    res
        .status(200)
        .json(new ApiResponse(200, { user }, "Account Details Updation Successfull"))
})

//uploading the profile photous and cover photus 
const updateAvatar = asyncHandler(async (req, res) => {
    // getting the localpath of the avatar 
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(409, "Avatar file is not found")
    }

    // if we found the localpath we need to upload the file to the cloudinary 
    const avatar = await updloadFileToCloud(avatarLocalPath)

    // if we didn't find the avatar url that means file is not uploaded to the cloud service
    if (!avatar.url) {
        throw new ApiError(400, "Error is occured while uploading the file")
    }

    // avatar contains the object given by the cloudinary 
    // we need to save the avatar url to the database  findByIdAndUpdate 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    // ready to send the response 
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar is updated Successfully "))

})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) {
        throw new ApiError(400, "CoverImage not found")
    }

    // try to upload the localfilepath to the cloudinary 
    const coverImage = await updloadFileToCloud(coverLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error occured while updating CoverImage ")
    }

    // if we found the coverImgae.url now time to save the url to the database 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage updated Successfully"))
})

const getUserChannelInfo = asyncHandler(async (req, res) => {
    // fetching the username from the req.params 
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is not found")
    }

    // creating the pipeline to get the userchannel info from the database 
    const channelInfo = await User.aggregate([
        // first pipeline 
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        // second pipeline for getting the subscribers from subscriptions schema
        {
            $lookup: {
                from: "subscriptions",
                localField: "_.id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        // third pipeline for getting the channels to subscribed from schema schema
        {
            $lookup: {
                from: "subscriptions",
                localField: "_.id",
                foreignField: "subscribers",
                as: "subscribedTo"
            }
        },
        // 4th pipeline for adding more fields 
        {
            $addFields: {
                // calculating the subscribers 
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedCount: {
                    $size: "$subscribedTo"
                },
                // this below section is for getting the is subscribed or not 
                isSubscribed: {
                    // checking the condition 
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // the project pipline for selections of the data to be send 
        {

            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscribersCount: 1,
                channelsSubscribedCount: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1
            }
        }
    ])

    // if channel {info ) is not fond then we have to throw the error 
    if (!channelInfo?.length) {
        throw new ApiError(404, "This Channel does not exist ")
    }

    console.log(channelInfo)

    // else we are ready to send the response 
    return res.status(200).json(new ApiResponse(200, channelInfo[0], "UserChannelInfo fetched successfully !"))
})

const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        // writing the pipline 
        {
            $match: {
                // match  _id  
                // _id : req.user?._id  // we have to match the _id as a object not a string 
                _id: new mongoose.Types.ObjectId(req.user?._id)

            }
        },

        // writing the first lookup 
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: '_id',
                as: "watchHistory",
                // Pipline for finding the owner 
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }   
                        }
                    }
                ]
            }
        }

    ])

    // ready to send the response 
    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory , "WatchHistory fetched successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    regenrateToken,
    changeUserPassword,
    getCurrentUser,
    updateAvatar,
    updateCoverImage,
    updateAccountDetails,
    getUserChannelInfo,
    getUserWatchHistory
}