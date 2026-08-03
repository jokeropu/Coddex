const mongoose=require('mongoose');
const {Schema}=mongoose;

const unlockedContentSchema=new Schema({
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
    type:{
        type:String,
        enum:['video','editorial'],
        required:true
    }
},{
    timestamps:true
});

unlockedContentSchema.index({userId:1,problemId:1,type:1},{unique:true});

const UnlockedContent=mongoose.model("unlockedContent",unlockedContentSchema);
module.exports=UnlockedContent;
