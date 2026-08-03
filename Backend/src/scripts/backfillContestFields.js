require('dotenv').config();
const mongoose = require('mongoose');
const main = require('../config/db');
const Problem = require('../models/problem');
const User = require('../models/user');

const run = async () => {
    await main();

    const problemResult = await Problem.updateMany(
        { visibleInProblemList: { $exists: false } },
        { $set: { visibleInProblemList: true } }
    );
    const userResult = await User.updateMany(
        { contestRating: { $exists: false } },
        { $set: { contestRating: 500 } }
    );

    console.log(`Backfilled visibleInProblemList for ${problemResult.modifiedCount} problem(s).`);
    console.log(`Backfilled contestRating for ${userResult.modifiedCount} user(s).`);
    await mongoose.connection.close();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
