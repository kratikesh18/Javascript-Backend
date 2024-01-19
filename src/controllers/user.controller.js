import {asyncHandler} from '../utils/asyncHandler.js'
import  { ApiError } from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import { updloadFileToCloud } from '../utils/Cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const genrateAccessAndRefreshToken =async(userId)=>{
    try {
        const user = await User.findById(userId);
        const refreshToken = user.genrateAccessToken()
        const accessToken = user.genrateRefreshToken()

        // the both accesstoken and refreshtokens are genrated but the refeshToken is required to store in the db 
        user.refreshToken = refreshToken
        // storing to the db 
        await user.save({validateBeforeSave:false})

        // now returning both tokens 
        return {refreshToken, accessToken}

    } catch (error) {
        throw new ApiError(503, "Error Occured while genrating tokens")
    }

}


const registerUser = asyncHandler( async(req, res)=>{
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


    const {email, username, password, fullName} = req.body
    console.log("fullName is : " , email);
    console.log("username is : " , username);
    console.log("email is : " , email);
    console.log("password is : " , password);

    // validating if the all inputs are not empty 
    if(
        [fullName, username, email , password].some( (field) => field?.trim() === "" )    
    ){
        throw new ApiError(401, "those fileds are can't be empty ")
    }   

    // checking if the user is already registerd 
    const userDoExist = await User.findOne({
        $or :[{email} , {username}]
    })

    if(userDoExist){    
        throw new ApiError(409, "User with this username or email already exist!")
    }

    // checking for the avatar and coverimage 
    //  console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path;
//    console.log(req.files , avatarLocalPath)

    //same as for coverimage 
    let coverImageLocalPath;
    
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required")
    }
    
    // uploading to the cloudinary 
    const avatar = await updloadFileToCloud(avatarLocalPath)
    const coverImage = await updloadFileToCloud(coverImageLocalPath)

    // if avatar is faild to updload 
    if(!avatar){
        throw new ApiError(500, "Error occured while uploading avatar ")
    }

    // else all set and  craeate the user object 
    const user = await User.create({
        fullName, 
        email,  
        password, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "" ,      //push if the url is found or else push empty string 
        username: username.toLowerCase()
    })

    // remove all the refresh token and password from the upfront response 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500 , "An Error occured while registering the user")
    }

    createdUser?console.log("user registeration successfull ! "):null;
    // now at the end  we are sending the final response 
    return res.status(200).json(
        // returning the api with the predeifined format of ApiResponse 
        new ApiResponse(200, createdUser, "User registered successfully !")

    )
})

const loginUser = asyncHandler(async (req, res, next)=>{
    /* steps to login the user
    1.input from the req.body 
    2.validate the inputs (!empty)
    3.check the user exist 
    4.validate the user 
    5.find the user 
    6.genrate accessToken and refreshToken 
    7.send cookies */
    

    
    

    const {email , username , password} = req.body

    if(!username && !email){
        throw new ApiError(405, "Email or Username is required !");
    }

    // finding the user from the db 
    const user = User.findOne({
            $or: [{username} , {email}]
    })


    if(!user){
        throw new ApiError(401 , "Creadentials not found, User does not exist!")
    }

    //validating the password dbOperation  
     const  isPasswordValid = await user.isPasswordCorrect(password)
     
     if(!isPasswordValid) {
        throw new ApiError(405, "Enter the Valid Password")
     }

    // genrating the accessToken and refreshToken thats a time taking process await till token genrates  
    const {accessToken , refreshToken} = await genrateAccessAndRefreshToken(user._id)

    // now accessing the logged-in user 
    const loggedUser = await User.findById(user._id).select("-password -refreshToken")


    //cookie-options 
    const options = {
        httpOnly : true, 
        secure:true
    }

    // sending the response 
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
             {
                user: loggedUser, accessToken , refreshToken
             }
        ),
        
        "User logged in SuccessFully"
    )

})


const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    // setting options for the response
    const options = {
        httpOnly:true,
        secure:true
    }

    // sending ApiResponse
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refeshToken" , options)
    .json(new ApiResponse(200, {}, "User Logged out successfully")) 
})


export {
    registerUser,
    loginUser,
    logoutUser
}