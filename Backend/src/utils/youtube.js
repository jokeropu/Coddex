const axios=require('axios');

const YOUTUBE_ID=/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const REJECTED="That video does not exist, is private, or its uploader has disabled embedding.";
const UNREACHABLE="Could not reach YouTube to verify that link. Try again in a moment.";

const extractYoutubeId=(url)=>{
    const trimmed=String(url||'').trim();
    const match=trimmed.match(YOUTUBE_ID);
    if(match) return match[1];
    return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
};

const fetchYoutubeMeta=async(youtubeId)=>{
    const watchUrl=`https://www.youtube.com/watch?v=${youtubeId}`;

    try{
        const {data}=await axios.get('https://www.youtube.com/oembed',{
            params:{url:watchUrl,format:'json'},
            timeout:10000
        });

        return {
            watchUrl,
            title:data.title,
            author:data.author_name,
            thumbnailUrl:data.thumbnail_url
        };
    }
    catch(err){
        const status=err.response?.status;
        const rejectedByYoutube=status===400 || status===404;
        const error=new Error(rejectedByYoutube?REJECTED:UNREACHABLE);
        error.rejectedByYoutube=rejectedByYoutube;
        throw error;
    }
};

module.exports={extractYoutubeId,fetchYoutubeMeta};
