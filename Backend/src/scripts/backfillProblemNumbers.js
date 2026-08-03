require('dotenv').config();
const mongoose = require('mongoose');
const main = require('../config/db');
const Problem = require('../models/problem');

const run = async () => {
    await main();

    const problems = await Problem.find({ problemNumber: { $exists: false } })
        .sort({ _id: 1 })
        .select('_id problemNumber');

    const lastNumbered = await Problem.findOne({ problemNumber: { $exists: true } })
        .sort({ problemNumber: -1 })
        .select('problemNumber');

    let nextNumber = lastNumbered?.problemNumber ? lastNumbered.problemNumber + 1 : 1;

    for (const problem of problems) {
        problem.problemNumber = nextNumber;
        await problem.save();
        nextNumber++;
    }

    console.log(`Backfilled problemNumber for ${problems.length} problem(s).`);
    await mongoose.connection.close();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
