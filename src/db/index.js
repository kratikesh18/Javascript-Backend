import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js';


const connectToDB = async()=>{
    try {

        // mongoose.connect returns us connection instance 
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)


        console.log(`\nDBConnect Sucessfull.. DB-HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Error DBCONNECT FAILED" , error );
        process.exit(1)
    }

}

export default connectToDB;