const express=require('express');
const notificationRouter=express.Router();

const {getNotifications,markAsRead,markAllAsRead,deleteNotification}=require('../controllers/notificationController');
const userMiddleware=require("../middleware/userMiddleware");

notificationRouter.get('/',userMiddleware,getNotifications);
notificationRouter.patch('/read-all',userMiddleware,markAllAsRead);
notificationRouter.patch('/:id/read',userMiddleware,markAsRead);
notificationRouter.delete('/:id',userMiddleware,deleteNotification);

module.exports=notificationRouter;
