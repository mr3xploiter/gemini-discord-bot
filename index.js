const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const axios = require('axios');
const { DISCORD_TOKEN, GEMINI_API_KEY } = require('./config');

// MongoDB Connection
mongoose.connect('mongodb+srv://siamstechnology:lE1ierCEp811mDAe@cluster0vidora.srwtkmz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0vidora')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Mongoose Schema
const userSchema = new mongoose.Schema({
  userId: String,
  username: String,
  messages: [{ content: String, timestamp: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);
const now = new Date();

const date = now.toLocaleDateString(); // Example: 4/19/2025
const time = now.toLocaleTimeString();
// Gemini API Endpoint
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function askGemini(prompt, displayName) {
    try {
      const systemPrompt = `You are Suva AI, a helpful, friendly, and intelligent assistant developed and trained by Siam. You always respond in Bangla unless asked otherwise . use emoji in every response. current date is :${date} & time is : ${time} dont need to send unless user asked you`;
      const finalPrompt = `User "${displayName}" asked: ${prompt}`;
  
      const response = await axios.post(
        GEMINI_ENDPOINT,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }]
            },
            {
              role: "user",
              parts: [{ text: finalPrompt }]
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
  
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      return text;
    } catch (error) {
      console.error("Gemini Error:", error.response?.data || error.message);
      return "Sorry, Gemini couldn't respond right now.";
    }
  }
  
// Discord Client Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
  
    const isMentioned = message.mentions.has(client.user);
    if (!isMentioned) return;
  
    const displayName = message.guild
      ? message.guild.members.cache.get(message.author.id)?.displayName || message.author.username
      : message.author.username;
  
    const cleanMessage = message.content.replace(/<@!?(\d+)>/, '').trim();
  
    const geminiReply = await askGemini(cleanMessage || "Hello!", displayName);
  
    // Save to MongoDB
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = new User({
        userId: message.author.id,
        username: message.author.username,
        messages: []
      });
    }
    user.username = message.author.username;
    user.messages.push({ content: message.content });
    await user.save();
  
    message.reply(geminiReply);
  });
  
client.login(DISCORD_TOKEN);
