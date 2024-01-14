import { app } from "./app.js";
import connectToDB from "./db/index.js";
import dotenv from 'dotenv'


dotenv.config({
    path:"./.env"
})
const port = process.env.PORT || 8000 
// async returns a promise so we can use then() and catch here
connectToDB()
.then(()=>{
    app.listen(port, ()=>{
        console.log(`server is running at : http://localhost:${port}`);
    })
})
.catch((err) =>{
    console.log("DB connection failed " ,err);
})

/*
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import express from 'express'
import { DB_NAME } from './constants.js';
// trying to connect database in first approch directly in index file 
const app = express();

dotenv.config({path: './.env'})

;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        app.on("error", ()=>{
            console.log("Error occured:",error);
            process.exit(1)
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`Connected to DB listening to the port : ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error while connecting:" , error);
        
    }
})()
*/