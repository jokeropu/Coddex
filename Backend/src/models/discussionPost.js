const mongoose=require('mongoose');
const {Schema}=mongoose;

const discussionPostSchema=new Schema({
    problemId:{
        type:Schema.Types.ObjectId,
        ref:'problem',
        required:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    parentId:{
        type:Schema.Types.ObjectId,
        ref:'discussionPost',
        default:null
    },
    title:{
        type:String,
        default:null
    },
    content:{
        type:String,
        required:true
    },
    code:{
        type:String,
        default:null
    },
    language:{
        type:String,
        default:null
    },
    likes:[
        {
            type:Schema.Types.ObjectId,
            ref:'user'
        }
    ]
},{
    timestamps:true
});

discussionPostSchema.index({problemId:1,parentId:1,createdAt:-1});

const DiscussionPost=mongoose.model("discussionPost",discussionPostSchema);
module.exports=DiscussionPost;
