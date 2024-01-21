import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'

cloudinary.config({ 
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME , 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


// updloading the file to the cloudinary 
const updloadFileToCloud = async(localFilePath) => {
    try {
      if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{
        resource_type:"auto"
      })
      // file is uploaded to the cloudinary 
      console.log( "file is uploaded " , response.url)
      return response 
      
    } catch (error) {
      fs.unlinkSync(localFilePath)    //removes the locally saved temp file 
      console.log("returning null from here" , error?.message)
      return null;
    }
   
    finally{
      fs.unlinkSync(localFilePath)
    }
    
}

// exporting the uploadfile function 
export {updloadFileToCloud}