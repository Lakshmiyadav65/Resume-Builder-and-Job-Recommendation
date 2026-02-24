const OpenAI = require('openai');
require('dotenv').config();

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

async function testGroq() {
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Say hello" }],
        });
        console.log('Success:', completion.choices[0].message.content);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testGroq();
