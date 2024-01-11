import mongoose , {Schema, Types} from 'mongoose';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema = new Schema({
    username:{
        type:String,
        required : true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true    
    },
    
    email:{
        type:String,
        required : true,
        unique:true,
        lowercase:true,
        trim:true,   
    },
    fullname:{
        type:String,
        required : true,
        trim:true,   
        index:true
    },
    avatar:{
        type:String,       //cloudnary url
        required:true,
    },
    coverImage:{
        type:String,        //cloudnary url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"video"
        }
    ],
    password:{      //challange
        type:String,
        required:[true,"Password is required"]
    },
    refreshToken:{
        type:String,
    }

}, {timestamps:true})


// using some plugins for encrypting the password 
userSchema.pre('save', async function(next){
    if(!this.isModified("password"))return next() ;

    this.password =  bcrypt.hash(this.password , 10)
    next();
})

// checking the password  is correct or not 
userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password, this.password)
}

// genrating the random access tokens 

userSchema.methods.genrateAccessToken = function(){
    return jwt.sign({
        _id:this._id,
        email: this.email,
        username : this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }

    )
}
userSchema.methods.genrateRefreshToken = function(){
    return jwt.sign({
        _id:this._id,

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }

    )
}
export const User = mongoose.model('User' , userSchema)