const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const contestSubmissionSchema=new Schema({
    contestId:{
        type:Schema.Types.ObjectId,
        ref:'contest',
        required:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    problemId:{
        type:Schema.Types.ObjectId,
        ref:'problem',
        required:true
    },
    code:{
        type:String,
        required:true
    },
    language:{
        type:String,
        required:true,
        enum:['python','c++','c','java','javascript']
    },
    status:{
        type:String,
        enum:['pending','accepted','wrong-answer','error'],
        default:'pending'
    },
    runtime:{
        type:Number,
        default:0
    },
    memory:{
        type:Number,
        default:0
    },
    errorMessage:{
        type:String,
        default:""
    },
    testCasesPassed:{
        type:Number,
        default:0
    },
    testCasesTotal:{
        type:Number,
        default:0
    },
    isVirtual:{
        type:Boolean,
        required:true
    },
    submittedAtElapsedMs:{
        type:Number,
        required:true
    },
    pointsAwarded:{
        type:Number,
        default:0
    }
},{
    timestamps:true
});

contestSubmissionSchema.index({contestId:1,userId:1,problemId:1});

const ContestSubmission=mongoose.model("contestSubmission",contestSubmissionSchema);
module.exports=ContestSubmission;
