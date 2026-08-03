const mongoose=require('mongoose');
const {Schema}=mongoose;

const userSchema=new Schema({
    firstName:{
        type:String,
        required:true,
        minlength:3,
        maxlength:20
    },
    lastName:{
        type:String, 
        minlength:3,
        maxlength:20
    },
    emailId:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
        immutable:true
    },
    age:{
        type:Number,
        min:8,
        max:100
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'  
    },
    password:{
        type:String,
        required:true,
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    },
    isPremium:{
        type:Boolean,
        default:false
    },
    razorpayCustomerId:{
        type:String
    },
    razorpaySubscriptionId:{
        type:String
    },
    subscriptionStatus:{
        type:String,
        enum:['none','created','authenticated','active','paused','halted','cancelled','completed','expired'],
        default:'none'
    },
    problemSolved:{
        type:[{
            type:Schema.Types.ObjectId,
            ref:'problem',
            unique:true
        }],
    },
    contestRating:{
        type:Number,
        default:500
    },
    credits:{
        type:Number,
        default:0
    },
    dailyStreak:{
        type:Number,
        default:0
    },
    lastDailyCreditDate:{
        type:String,
        default:null
    },
    resetPasswordToken:{
        type:String,
        default:null
    },
    resetPasswordExpires:{
        type:Date,
        default:null
    },
    profilePicture:{
        type:String,
        default:null
    },
    avatarPublicId:{
        type:String,
        default:null
    },
    githubUrl:{
        type:String,
        default:null
    },
    linkedinUrl:{
        type:String,
        default:null
    }
},{
    timestamps:true
});

userSchema.index({contestRating:-1});

userSchema.post('findOneAndDelete',async function(userInfo){
    if(userInfo){
        const userId=userInfo._id;
        await mongoose.model('submission').deleteMany({userId});
        await mongoose.model('contestParticipation').deleteMany({userId});
        await mongoose.model('contestSubmission').deleteMany({userId});
        await mongoose.model('discussionPost').deleteMany({userId});
        await mongoose.model('codeDraft').deleteMany({userId});
        await mongoose.model('unlockedContent').deleteMany({userId});
        await mongoose.model('notification').deleteMany({userId});
    }
});

const User=mongoose.model("user",userSchema);
module.exports=User;