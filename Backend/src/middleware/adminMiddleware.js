const jwt=require('jsonwebtoken');
const User=require('../models/user');
const redisClient=require('../config/redis');
const {renewIfStale}=require('../utils/authToken');
const adminMiddleware=async(req,res,next)=>{
    try{
        const {token}=req.cookies;
        if(!token){
            throw new Error("Token is not present");
        }
        const payload=jwt.verify(token,process.env.JWT_KEY);

        const {_id}=payload;
        if(!_id){
            throw new Error("Id is missing");
        }
        
        const result=await User.findById(_id);

        if(payload.role!=="admin"){
            throw new Error("Invalid Token");
        }
        if(!result){
            throw new Error("User not found");
        }

        const isBlocked=await redisClient.exists(`token:${token}`);

        if(isBlocked){
            throw new Error("Invalid Token");
        }
        renewIfStale(res,payload,result);

        req.result=result;
        next();
    }
    catch(err){
        res.status(401).send(err.message);
    }
}

module.exports=adminMiddleware;