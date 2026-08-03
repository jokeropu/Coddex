const Notification=require('../models/notification');

const notify=async(userId,type,title,message,link=null)=>{
    try{
        await Notification.create({userId,type,title,message,link});
    }
    catch(err){

        console.error(`Failed to create notification (${type}) for user ${userId}:`,err.message);
    }
};

module.exports=notify;
