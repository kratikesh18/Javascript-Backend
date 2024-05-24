import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js';


const connectToDB = async()=>{
    try {

        // mongoose.connect returns us connection instance 
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

//  ${connectionInstance.connection.host}
        console.log(`\n\t\tDBConnect Sucessfull..`);
    } catch (error) {
        console.log("\tError DBCONNECT FAILED" , error );
        process.exit(1)
    }

}

export default connectToDB;