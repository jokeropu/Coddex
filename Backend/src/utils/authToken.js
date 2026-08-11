const jwt=require('jsonwebtoken');

const TOKEN_TTL_SECONDS=4*60*60;
const RENEW_BELOW_SECONDS=TOKEN_TTL_SECONDS/2;

const isProd=process.env.NODE_ENV==="production";

const authCookieOptions=(maxAge)=>({
    maxAge,
    httpOnly:true,
    secure:isProd,
    sameSite:isProd?"none":"lax",
});

const signAuthToken=(user)=>jwt.sign(
    {_id:user._id,emailId:user.emailId,role:user.role},
    process.env.JWT_KEY,
    {expiresIn:TOKEN_TTL_SECONDS}
);

const issueAuthCookie=(res,user)=>{
    const token=signAuthToken(user);
    res.cookie('token',token,authCookieOptions(TOKEN_TTL_SECONDS*1000));
    return token;
};

const clearAuthCookie=(res)=>{
    res.cookie('token',null,{...authCookieOptions(0),expires:new Date(Date.now())});
};

const renewIfStale=(res,payload,user)=>{
    if(res.headersSent) return;

    const remaining=payload.exp-Math.floor(Date.now()/1000);
    if(remaining<RENEW_BELOW_SECONDS) issueAuthCookie(res,user);
};

module.exports={
    TOKEN_TTL_SECONDS,
    RENEW_BELOW_SECONDS,
    authCookieOptions,
    signAuthToken,
    issueAuthCookie,
    clearAuthCookie,
    renewIfStale
};
