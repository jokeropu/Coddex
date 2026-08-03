const {createClient}=require('redis');

const redisClient = createClient({
    username:'default',
    password:process.env.REDIS_PASS,
    socket:{
        host:'level-fuchsiaish-coil-20067.db.redis.io',
        port:10341
    }
});

redisClient.on('error',(err)=>{
    console.error('Redis Client Error:',err);
});

module.exports=redisClient;