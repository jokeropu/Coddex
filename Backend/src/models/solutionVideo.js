const mongoose=require('mongoose');
const {Schema}=mongoose;

const videoSchema=new Schema({
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
    provider:{
        type:String,
        enum:['cloudinary','youtube'],
        default:'cloudinary',
        required:true
    },
    cloudinaryPublicId:{
        type:String,
        unique:true,
        sparse:true
    },
    secureUrl:{
        type:String
    },
    youtubeId:{
        type:String
    },
    sourceUrl:{
        type:String
    },
    title:{
        type:String
    },
    author:{
        type:String
    },
    thumbnailUrl:{
        type:String
    },
    duration:{
        type:Number
    },
},{
    timestamps:true
});

videoSchema.pre('validate',function(){
    if(this.provider==='cloudinary' && (!this.cloudinaryPublicId || !this.secureUrl)){
        throw new Error('A Cloudinary walkthrough needs cloudinaryPublicId and secureUrl');
    }
    if(this.provider==='youtube' && !this.youtubeId){
        throw new Error('A YouTube walkthrough needs youtubeId');
    }
});

const SolutionVideo=mongoose.model("solutionVideo",videoSchema);
module.exports=SolutionVideo;
