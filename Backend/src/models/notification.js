const mongoose=require('mongoose');
const {Schema}=mongoose;

const NOTIFICATION_TYPES=[
    'contest_reminder',
    'contest_result',
    'contest_created',
    'contest_updated',
    'daily_challenge_solved',
    'streak_milestone',
    'streak_at_risk',
    'streak_broken',
    'premium_purchased',
    'premium_cancelled',
    'premium_expiring',
    'profile_updated',
    'password_reset'
];

const notificationSchema=new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    type:{
        type:String,
        enum:NOTIFICATION_TYPES,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true
    },
    link:{
        type:String,
        default:null
    },
    read:{
        type:Boolean,
        default:false
    }
},{
    timestamps:true
});

const NOTIFICATION_TTL_SECONDS=60*60*24*30;

notificationSchema.index({userId:1,createdAt:-1});
notificationSchema.index({createdAt:1},{expireAfterSeconds:NOTIFICATION_TTL_SECONDS});

const Notification=mongoose.model("notification",notificationSchema);
module.exports=Notification;
module.exports.NOTIFICATION_TYPES=NOTIFICATION_TYPES;
