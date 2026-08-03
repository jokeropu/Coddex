const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const dailyChallengeSchema=new Schema({
    date:{
        type:String,
        required:true,
        unique:true
    },
    problemId:{
        type:Schema.Types.ObjectId,
        ref:'problem',
        required:true
    },
    windowStart:{
        type:Date,
        required:true
    },
    windowEnd:{
        type:Date,
        required:true
    }
},{
    timestamps:true
});

dailyChallengeSchema.index({problemId:1,date:-1});

const DailyChallenge=mongoose.model("dailyChallenge",dailyChallengeSchema);
module.exports=DailyChallenge;
