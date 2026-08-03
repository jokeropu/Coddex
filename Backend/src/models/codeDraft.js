const mongoose=require('mongoose');
const {Schema}=mongoose;

const codeDraftSchema=new Schema({
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
    contestId:{
        type:Schema.Types.ObjectId,
        ref:'contest',
        default:null
    },
    language:{
        type:String,
        required:true
    },
    code:{
        type:String,
        default:''
    }
},{
    timestamps:true
});

codeDraftSchema.index({userId:1,problemId:1,contestId:1,language:1},{unique:true});

const CodeDraft=mongoose.model("codeDraft",codeDraftSchema);
module.exports=CodeDraft;
