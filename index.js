const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs-extra');

const app = express();
app.use(bodyParser.json());

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK_URL) {
    console.error("Penner");
    process.exit(1);
}

const DATA_FILE = 'counter.json';
let data = { executionCount: 0, messageId: null };

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
        console.error("Keine Daten geladen L:", err);
    }
}

loadData();

app.post('/execute', async (req, res) => {
    const { name, username, stats } = req.body;
    if (!name || !username || !stats) return res.status(400).json({ success: false });

    data.executionCount += 1;

    const embed = {
        username: "Silence | Public",
        embeds: [{
            title: `📊 Total Executions: ${data.executionCount}`,
            description: `**👤 Name:** ${name}\n**ℹ️ Username:** ${username}`,
            color: Math.floor(Math.random() * 0xFFFFFF),
            fields: [
                { name: "💪 Strength", value: stats.strength.toString(), inline: true },
                { name: "🛡️ Durability", value: stats.durability.toString(), inline: true },
                { name: "⚡ Agility", value: stats.agility.toString(), inline: true },
                { name: "♻️ Rebirths", value: stats.rebirths.toString(), inline: true },
                { name: "💀 Kills", value: stats.kills.toString(), inline: true },
                { name: "⚔️ Brawls", value: stats.brawls.toString(), inline: true }
            ]
        }]
    };

    try {
        if (data.messageId) {
            const url = `${WEBHOOK_URL.replace("/webhooks/", "/webhooks/")}/messages/${data.messageId}`;
            await axios.patch(url, embed);
        } else {
            const response = await axios.post(WEBHOOK_URL, embed);
            data.messageId = response.data.id;
        }
        saveData();
        res.json({ success: true, executionCount: data.executionCount });
    } catch (err) {
        console.error("Discord Fehler braun:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/counter', (req, res) => {
    res.json({ executionCount: data.executionCount });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
