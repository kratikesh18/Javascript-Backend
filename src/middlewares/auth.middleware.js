import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT =asyncHandler(async(req ,res ,next)=>{
try {
    
        // accessing the accessToken from the cookies or it can come from the header of the request 
        const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer" , "")
        console.log(token);
    
        //if we didn't find any token we have to throw an api error
        if(!token){
            throw new ApiError(400, "unAuthorized request")
        }
    
        // if we found out the token then we have to decrypt it using environment secreat code using jwt the token and extract the information from it 
        // if the token is verified then we will get the decoded information 
        const decodedInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        // now finding the user using the decoded info inforomation 
        const user = await User.findById(decodedInfo?._id).select("-password -refreshToken")
    
        // if we didn't find any user then we must have an invalid access token
        if(!user){
            throw new ApiError(403, "Invalid Access Token")
        }
    
        // if we got the user   
        req.user = user;
        next()
} catch (error) {
    throw new ApiError(402, error?.message || "Invalid access token")
}
})