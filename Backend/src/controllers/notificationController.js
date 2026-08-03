const Notification=require('../models/notification');

const getNotifications=async(req,res)=>{
    try{
        const page=Math.max(parseInt(req.query.page)||1,1);
        const limit=20;
        const skip=(page-1)*limit;

        const [notifications,unreadCount,totalCount]=await Promise.all([
            Notification.find({userId:req.result._id}).sort({createdAt:-1}).skip(skip).limit(limit),
            Notification.countDocuments({userId:req.result._id,read:false}),
            Notification.countDocuments({userId:req.result._id})
        ]);

        res.status(200).json({
            notifications,
            unreadCount,
            currentPage:page,
            totalPages:Math.ceil(totalCount/limit)
        });
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const markAsRead=async(req,res)=>{
    try{
        const {id}=req.params;
        await Notification.updateOne({_id:id,userId:req.result._id},{$set:{read:true}});
        res.status(200).json({message:"Marked as read"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const markAllAsRead=async(req,res)=>{
    try{
        await Notification.updateMany({userId:req.result._id,read:false},{$set:{read:true}});
        res.status(200).json({message:"All marked as read"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const deleteNotification=async(req,res)=>{
    try{
        const {id}=req.params;
        await Notification.deleteOne({_id:id,userId:req.result._id});
        res.status(200).json({message:"Notification deleted"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getNotifications,markAsRead,markAllAsRead,deleteNotification};
