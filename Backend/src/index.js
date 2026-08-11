const express=require('express');
const app=express();
require('dotenv').config();
const main=require('./config/db');
const cookieParser=require('cookie-parser');
const authRouter=require("./routes/userAuth");
const redisClient=require('./config/redis');
const problemRouter=require('./routes/problemCreator');
const submitRouter=require('./routes/submit');
const aiRouter=require('./routes/aiChatting');
const videoRouter=require('./routes/videoCreator');
const paymentRouter=require('./routes/payment');
const contestRouter=require('./routes/contest');
const dailyChallengeRouter=require('./routes/dailyChallenge');
const discussionRouter=require('./routes/discussion');
const progressRouter=require('./routes/progress');
const codeDraftRouter=require('./routes/codeDraft');
const unlockRouter=require('./routes/unlock');
const notificationRouter=require('./routes/notification');
const cors=require('cors');

app.set('trust proxy',1);

const allowedOrigins=(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map(o=>o.trim());

app.use(cors({
    origin:allowedOrigins,
    credentials:true,
}));

app.use(express.json({
    verify:(req,res,buf)=>{
        req.rawBody=buf;
    }
}));
app.use(cookieParser());
app.use('/user',authRouter);
app.use('/problem',problemRouter);
app.use('/submission',submitRouter);
app.use('/ai',aiRouter);
app.use('/video',videoRouter);
app.use('/payment',paymentRouter);
app.use('/contest',contestRouter);
app.use('/daily-challenge',dailyChallengeRouter);
app.use('/discussion',discussionRouter);
app.use('/progress',progressRouter);
app.use('/codedraft',codeDraftRouter);
app.use('/unlock',unlockRouter);
app.use('/notifications',notificationRouter);

const InitializeConnection=async()=>{
    try{
        await Promise.all([main(),redisClient.connect()]);
        console.log("DB Connected");

        const port=process.env.PORT || 3000;
        app.listen(port,()=>{
            console.log("Server listening at port number: "+port);
        })
    }
    catch(err){
        console.error("Fatal startup error, exiting: "+err);
        process.exit(1);
    }

}

InitializeConnection();
