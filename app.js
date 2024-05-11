const express = require('express');
const redis = require('redis');
const { Pool } = require('pg');

const app = express();
const redisClient = redis.createClient({
    url: 'redis://redis:6379',
    retry_strategy: function(options) {
        if (options.attempt > 10) {
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});

redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis', err);
});

const pool = new Pool({
    user: 'user',
    host: 'db',
    database: 'mydatabase',
    password: 'password',
    port: 5432,
});

app.use(express.json());

app.post('/message', async (req, res) => {
    const { message } = req.body;
    try {
        await redisClient.lPush('messages', message);
        res.send('Message added to Redis');
    } catch (error) {
        console.error('Redis error:', error);
        res.status(500).send('Failed to add message to Redis');
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await redisClient.lRange('messages', 0, -1);
        res.json(messages);
    } catch (error) {
        console.error('Redis error:', error);
        res.status(500).send('Failed to retrieve messages from Redis');
    }
});

app.post('/user', async (req, res) => {
    const { username } = req.body;
    const result = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING *', [username]);
    res.json(result.rows[0]);
});

app.get('/users', async (req, res) => {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});

module.exports = app;
