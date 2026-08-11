require('dotenv').config();
const mongoose=require('mongoose');

const run=async()=>{
    await mongoose.connect(process.env.DB_CONNECT_STRING);
    const videos=mongoose.connection.db.collection('solutionvideos');

    const stamped=await videos.updateMany(
        {provider:{$exists:false}},
        {$set:{provider:'cloudinary'}}
    );
    console.log(`stamped provider on ${stamped.modifiedCount} existing record(s)`);

    const indexes=await videos.indexes();
    const legacy=indexes.find((i)=>i.key?.cloudinaryPublicId===1 && i.unique && !i.sparse);

    if(legacy){
        await videos.dropIndex(legacy.name);
        console.log(`dropped non-sparse unique index "${legacy.name}"`);
    }else{
        console.log('no non-sparse unique index on cloudinaryPublicId');
    }

    await videos.createIndex({cloudinaryPublicId:1},{unique:true,sparse:true});
    console.log('created sparse unique index on cloudinaryPublicId');

    const after=await videos.indexes();
    console.log(after.map((i)=>`  ${i.name} unique=${!!i.unique} sparse=${!!i.sparse}`).join('\n'));

    await mongoose.disconnect();
};

run().catch(async(err)=>{
    console.error('Migration failed:',err.message);
    await mongoose.disconnect().catch(()=>{});
    process.exit(1);
});
