require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000' // Or your Netlify/Vercel URL
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// DeepSeek API Configuration
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// System prompt for the coach persona
const COACH_PERSONA = `
You are a professional accountability coach helping users stay focused on their goals.
Your tone should be:
- Supportive but direct
- Solution-focused
- Encouraging but honest
- Asking probing questions

Guidelines:
1. Keep responses under 2 sentences
2. Focus on actionable advice
3. Acknowledge challenges but emphasize progress
4. Never use profanity or harsh language
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, chatHistory } = req.body;

        const messages = [
            {
                role: "system",
                content: COACH_PERSONA
            },
            ...chatHistory.map(msg => ({
                role: msg.sender === 'user' ? "user" : "assistant",
                content: msg.message
            })),
            {
                role: "user",
                content: message
            }
        ];

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: "deepseek-chat",
            messages,
            temperature: 0.7,
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            reply: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error('DeepSeek API Error:', error.response?.data || error.message);
        res.status(500).json({ error: "Error processing your request" });
    }
});

// Root route
app.get('/', (req, res) => {
    res.send('Accountability Coach API is running.');
});

// Start server (this should be last)
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});