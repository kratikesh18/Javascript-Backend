import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import userRouter from './routes/user.router.js';

const app = express();

// app.use() used to configure middlewares 
app.use(cors({
    origin:process.env.CORS_ORIGIN , 
    credentials:true
}))

// configuration for inc json data
app.use(express.json({limit:"16kb"}))
// configuration for inc url data
app.use(express.urlencoded({limit:"16kb",extended:true}))
// configuration for  static assests
app.use(express.static("public"))
// config^n for client coockie manipul^n
app.use(cookieParser());


app.use('/api/v1/user' , userRouter)
// localhost:8080/api/v1/user/register
// localhost:8080/user/register
export {app}