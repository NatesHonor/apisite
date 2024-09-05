const express = require('express');
const bodyParser = require('body-parser');
const fakenetwork = express.Router();

const onlinePlayers = new Set();
const playerData = {};

fakenetwork.use(bodyParser.json());

fakenetwork.get('/player/:playerName', async (req, res) => {
  const playerName = req.params.playerName;
  const isOnline = onlinePlayers.has(playerName);

  const level = playerData[playerName]?.level || 1;
  const rank = playerData[playerName]?.rank;
  let staff = false;

  try {
    const minotarApiUrl = `https://minotar.net/avatar/${playerName}/100`;
    const response = await fetch(minotarApiUrl);

    if (response.ok) {
      if (rank === "administrator" || rank === "contractor" || rank === "gamemaster" || rank === "helper" || rank === "mod") {
        staff = true;
      }
      const avatarUrl = minotarApiUrl;
      const playerInfo = {
        playerName: playerName,
        online: isOnline,
        level: level,
        rank: rank,
        avatarUrl: avatarUrl,
        staff: staff,
      };

      res.json(playerInfo);
    } else {
      res.status(500).json({ error: 'Failed to fetch player avatar.' });
    }
  } catch (error) {
    console.error('Error fetching player avatar:', error);
    res.status(500).json({ error: 'Failed to fetch player avatar.' });
  }
});

fakenetwork.post('/player/join', (req, res) => {
  const playerName = req.body.playerName;
  onlinePlayers.add(playerName);
  console.log(`Player "${playerName}" joined the server.`);
  res.sendStatus(200);
});

fakenetwork.post('/player/leave', (req, res) => {
  const playerName = req.body.playerName;
  onlinePlayers.delete(playerName);
  console.log(`Player "${playerName}" left the server.`);
  res.sendStatus(200);
});

fakenetwork.post('/player/level', (req, res) => {
  const playerName = req.body.playerName;
  const level = req.body.level;
  playerData[playerName] = { ...playerData[playerName], level: level };
  console.log(`Updated level for player "${playerName}": ${level}`);
  res.sendStatus(200);
});

fakenetwork.post('/player/rank', (req, res) => {
  const playerName = req.body.playerName;
  const rank = req.body.rank;
  playerData[playerName] = { ...playerData[playerName], rank: rank };
  console.log(`Updated rank for player "${playerName}": ${rank}`);
  res.sendStatus(200);
});

fakenetwork.post('/player/playtime', (req, res) => {
  const playerName = req.body.playerName;
  const playtimeMillis = req.body.playtimeMillis;
  playerData[playerName] = { ...playerData[playerName], playtimeMillis: playtimeMillis };
  console.log(`Updated playtime for player "${playerName}": ${playtimeMillis}`);
  res.sendStatus(200);
});

module.exports = fakenetwork;
