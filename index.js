const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs-extra');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(bodyParser.json());

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

if (!BOT_TOKEN) {
    console.error("Missing DISCORD_BOT_TOKEN environment variable");
    process.exit(1);
}
if (!VOICE_CHANNEL_ID) {
    console.error("Missing VOICE_CHANNEL_ID environment variable");
    process.exit(1);
}

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});

const DATA_FILE = 'counter.json';
let data = { executionCount: 0 };
let botOnline = false;

function saveData() {
    fs.writeJsonSync(DATA_FILE, data);
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileData = fs.readJsonSync(DATA_FILE);
            if (fileData && typeof fileData.executionCount === 'number') {
                data = fileData;
            }
        }
    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

async function updateVoiceChannelTitle() {
    const newTitle = `[👑] Executions | ${data.executionCount}`;

    try {

        if (!botOnline) {
            await client.login(BOT_TOKEN);
            botOnline = true;
            console.log("🟢 Bot is now online");
        }

        await axios.patch(
            `https:
            { name: newTitle },
            {
                headers: {
                    'Authorization': `Bot ${BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`Voice channel updated: ${newTitle}`);

        setTimeout(() => {
            if (botOnline) {
                client.destroy();
                botOnline = false;
                console.log("🔴 Bot went offline");
            }
        }, 30000);

    } catch (err) {
        console.error("Failed to update voice channel:", err.response?.data || err.message);
    }
}

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('error', (err) => {
    console.error('Bot error:', err);
    botOnline = false;
});

loadData();

app.post('/execute', async (req, res) => {
    const { name, username, stats } = req.body;

    if (!name || !username || !stats) {
        return res.status(400).json({ success: false, error: "Missing required fields (name, username, stats)" });
    }

    data.executionCount += 1;

    console.log(`Execution by ${name} (${username}) - Total: ${data.executionCount}`);

    try {
        await updateVoiceChannelTitle();

        saveData();

        res.json({ 
            success: true, 
            executionCount: data.executionCount,
            player: { name, username, stats }
        });
    } catch (err) {
        console.error("Error processing execution:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/counter', (req, res) => {
    res.json({ executionCount: data.executionCount });
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'running', 
        executionCount: data.executionCount,
        channelId: VOICE_CHANNEL_ID,
        botOnline: botOnline
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Voice channel ID: ${VOICE_CHANNEL_ID}`);
    console.log(`Current execution count: ${data.executionCount}`);
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (botOnline) {
        client.destroy();
    }
    process.exit(0);
});
