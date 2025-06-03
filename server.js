const express = require('express');
const path = require('path');
const fs = require('fs');
const {Client}=require("pg");
const bodyParser=require("body-parser");


const app = express();
const PORT = 3000;


const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // required for Render-hosted PostgreSQL
  }
});

db.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Connection error:', err));


db.query(`
  CREATE TABLE IF NOT EXISTS quiz_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    averagescore JSON NOT NULL,
    overallscore NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`).then(() => console.log('Table created')).catch(console.error);



// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files (CSS, JS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve quiz.html when user visits '/quiz'
app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz.html'));
});

// Handle POST request to save scores
app.post('/save-scores', async (req, res) => {
  const { averageScores, overallScore } = req.body;

  if (!averageScores || overallScore === undefined) {
    return res.status(400).json({ error: 'Missing averageScores or overallScore' });
  }

  try{ 
    //Convert averageScores to a JSON string
    await db.query("INSERT INTO quiz_scores (averagescore,overallscore) VALUES ($1,$2)",[JSON.stringify(averageScores),overallScore]
  );
     res.redirect("/");
  } catch(error){
    console.error('Database error:', error);
    res.status(500).json({error:'Database error'});
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
