import mongoose ,{ Schema} from 'mongoose'

const subscriptionSchema = new Schema({
    subscribers:{
        type: mongoose.Types.ObjectId,
        ref:"User"
    },
    channel : {
        type:mongoose.Types.ObjectId,
        ref:"User"
    }
}, {timestamps:true})

export const Subscriptions = mongoose.model("Subscriptions" , subscriptionSchema)