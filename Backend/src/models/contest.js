const mongoose=require('mongoose');
const {Schema}=mongoose;

const contestSchema=new Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    startTime:{
        type:Date,
        required:true
    },
    endTime:{
        type:Date,
        required:true
    },
    createdBy:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    problems:[
        {
            problemId:{
                type:Schema.Types.ObjectId,
                ref:'problem',
                required:true
            },
            difficulty:{
                type:String,
                enum:['easy','medium','hard'],
                required:true
            }
        }
    ],
    problemsPublished:{
        type:Boolean,
        default:false
    },
    ratingsProcessed:{
        type:Boolean,
        default:false
    },
    wasRated:{
        type:Boolean,
        default:null
    }
},{
    timestamps:true
});

const Contest=mongoose.model("contest",contestSchema);
module.exports=Contest;
