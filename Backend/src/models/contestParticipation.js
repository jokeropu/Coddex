const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const contestParticipationSchema=new Schema({
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
    problemScores:[
        {
            problemId:{
                type:Schema.Types.ObjectId,
                ref:'problem'
            },
            score:{
                type:Number,
                default:0
            },
            wrongAttempts:{
                type:Number,
                default:0
            },
            acceptedAtElapsedMs:{
                type:Number,
                default:null
            }
        }
    ],
    totalScore:{
        type:Number,
        default:0
    },
    lastAcceptedAtElapsedMs:{
        type:Number,
        default:null
    },
    ratingBefore:{
        type:Number
    },
    ratingAfter:{
        type:Number
    },
    ratingDelta:{
        type:Number
    },
    rank:{
        type:Number
    }
},{
    timestamps:true
});

contestParticipationSchema.index({contestId:1,userId:1},{unique:true});
contestParticipationSchema.index({contestId:1,totalScore:-1});

const ContestParticipation=mongoose.model("contestParticipation",contestParticipationSchema);
module.exports=ContestParticipation;
