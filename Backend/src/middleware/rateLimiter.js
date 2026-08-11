const {RateLimiterRedis,RateLimiterMemory}=require('rate-limiter-flexible');
const redisClient=require('../config/redis');

const build=({keyPrefix,points,duration,blockDuration})=>new RateLimiterRedis({
    storeClient:redisClient,
    useRedisPackage:true,
    keyPrefix,
    points,
    duration,
    blockDuration,
    insuranceLimiter:new RateLimiterMemory({keyPrefix,points,duration,blockDuration})
});

const byUser=(req)=>req.result?._id?.toString();
const byIp=(req)=>req.ip;
const byEmail=(req)=>{
    const email=(req.body?.emailId || '').toLowerCase().trim();
    return email || null;
};

const blockIfExhausted=(limiter,keyOf,message)=>async(req,res,next)=>{
    const key=keyOf(req);
    if(!key) return next();

    let state;
    try{
        state=await limiter.get(key);
    }
    catch(err){
        console.error('Rate limiter store error:',err);
        return next();
    }

    if(state && state.consumedPoints>=limiter.points){
        const retryAfter=Math.max(1,Math.ceil(state.msBeforeNext/1000));
        res.set('Retry-After',String(retryAfter));
        return res.status(429).json({message,retryAfter});
    }

    next();
};

const enforce=(limiter,keyOf,message)=>async(req,res,next)=>{
    const key=keyOf(req);
    if(!key) return next();

    try{
        await limiter.consume(key);
        next();
    }
    catch(rejection){
        if(rejection instanceof Error){
            console.error('Rate limiter store error:',rejection);
            return next();
        }

        const retryAfter=Math.max(1,Math.ceil(rejection.msBeforeNext/1000));
        res.set('Retry-After',String(retryAfter));
        res.status(429).json({message,retryAfter});
    }
};

const chain=(...middlewares)=>(req,res,next)=>{
    let i=0;
    const step=(err)=>{
        if(err || i>=middlewares.length) return next(err);
        middlewares[i++](req,res,step);
    };
    step();
};

const singleFlight=({keyPrefix,ttlSeconds,message})=>async(req,res,next)=>{
    const id=byUser(req);
    if(!id) return next();

    const key=`${keyPrefix}:${id}`;

    let acquired;
    try{
        acquired=await redisClient.set(key,'1',{
            condition:'NX',
            expiration:{type:'EX',value:ttlSeconds}
        });
    }
    catch(err){
        console.error('Single-flight guard store error:',err);
        return next();
    }

    if(acquired!=='OK') return res.status(429).json({message});

    let released=false;
    const release=()=>{
        if(released) return;
        released=true;
        redisClient.del(key).catch((err)=>console.error('Single-flight release failed:',err));
    };

    res.once('finish',release);
    res.once('close',release);

    next();
};

const aiChatBurst=build({keyPrefix:'rl:ai:burst',points:12,duration:60,blockDuration:60});
const aiChatDaily=build({keyPrefix:'rl:ai:daily',points:200,duration:86400});

const runBurst=build({keyPrefix:'rl:run',points:20,duration:60,blockDuration:30});
const submitBurst=build({keyPrefix:'rl:submit',points:12,duration:60,blockDuration:30});

const authByIp=build({keyPrefix:'rl:auth:ip',points:60,duration:900,blockDuration:900});
const loginByEmail=build({keyPrefix:'rl:auth:email',points:8,duration:900,blockDuration:900});
const forgotByEmail=build({keyPrefix:'rl:forgot:email',points:3,duration:3600,blockDuration:3600});
const forgotByIp=build({keyPrefix:'rl:forgot:ip',points:10,duration:3600,blockDuration:3600});

const TOO_FAST="You're going a bit fast. Give it a moment and try again.";

module.exports={
    aiChatLimiter:chain(
        enforce(aiChatBurst,byUser,"You're sending messages faster than the assistant can help. Wait a minute and try again."),
        enforce(aiChatDaily,byUser,"You've reached today's limit for the AI assistant. It resets in 24 hours."),
        singleFlight({
            keyPrefix:'sf:ai',
            ttlSeconds:120,
            message:"The assistant is still answering your previous question. Wait for it to finish or stop it first."
        })
    ),

    runLimiter:enforce(runBurst,byUser,TOO_FAST),
    submitLimiter:enforce(submitBurst,byUser,TOO_FAST),

    loginLimiter:chain(
        enforce(authByIp,byIp,TOO_FAST),
        blockIfExhausted(loginByEmail,byEmail,"Too many failed sign-in attempts for this account. Try again in 15 minutes.")
    ),

    recordFailedLogin:(emailId)=>{
        const email=(emailId || '').toLowerCase().trim();
        if(!email) return Promise.resolve();
        return loginByEmail.consume(email).catch(()=>{});
    },

    clearFailedLogins:(emailId)=>{
        const email=(emailId || '').toLowerCase().trim();
        if(!email) return Promise.resolve();
        return loginByEmail.delete(email).catch(()=>{});
    },

    registerLimiter:enforce(authByIp,byIp,TOO_FAST),

    forgotPasswordLimiter:chain(
        enforce(forgotByIp,byIp,TOO_FAST),
        enforce(forgotByEmail,byEmail,"A reset link was already sent to this address. Check your inbox, or try again in an hour.")
    ),

    resetPasswordLimiter:enforce(authByIp,byIp,TOO_FAST)
};
