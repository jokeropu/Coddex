const axios=require('axios');

const verifyTurnstileToken=async(token,remoteip)=>{
    if(!token){
        return {success:false,error:"Missing Turnstile token"};
    }

    try{
        const params=new URLSearchParams();
        params.append('secret',process.env.TURNSTILE_SECRET_KEY);
        params.append('response',token);
        if(remoteip){
            params.append('remoteip',remoteip);
        }

        const {data}=await axios.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            params
        );

        if(!data.success){
            return {success:false,error:"Turnstile verification failed"};
        }
        return {success:true};
    }
    catch(err){
        return {success:false,error:"Turnstile verification request failed: "+err.message};
    }
};

module.exports=verifyTurnstileToken;
