const mongoose = require('mongoose');
require('dotenv').config();

async function testMongo() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Success: MongoDB Connected');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testMongo();
