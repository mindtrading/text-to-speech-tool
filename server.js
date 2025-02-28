const express = require("express");
const fs = require("fs");
const axios = require("axios");
const { GoogleAuth } = require("google-auth-library");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

const GOOGLE_CREDENTIALS = JSON.parse(fs.readFileSync("google-key.json"));
const GOOGLE_TTS_API = "https://texttospeech.googleapis.com/v1/text:synthesize";

const auth = new GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

async function generateSpeech(text, voice, speed) {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const response = await axios.post(GOOGLE_TTS_API, {
        input: { text },
        voice: {
            languageCode: "es-ES",
            name: voice
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: parseFloat(speed)
        }
    }, {
        headers: { Authorization: `Bearer ${token.token}` }
    });

    const audioContent = response.data.audioContent;
    const uniqueFilename = `speech_${Date.now()}.mp3`;
    const filePath = path.join(__dirname, uniqueFilename);
    fs.writeFileSync(filePath, Buffer.from(audioContent, "base64"));
    
    return uniqueFilename;
}

app.post("/tts", async (req, res) => {
    try {
        const { text, voice, speed } = req.body;
        const fileName = await generateSpeech(text, voice, speed);
        res.json({ audioUrl: `/${fileName}` });
    } catch (error) {
        console.error("Error generating speech:", error);
        res.status(500).json({ error: "Failed to generate speech." });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
