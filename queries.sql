CREATE TABLE users(
id SERIAL PRIMARY KEY,
first_name VARCHAR (100) NOT NULL,
last_name VARCHAR (100) NOT NULL,
email VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS quiz_scores (
id SERIAL PRIMARY KEY,
user_id INTEGER,
averagescores JSONB,
overallscore NUMERIC,
created_at TIMESTAMP DEFAULT now(),
FOREIGN KEY (user_id) REFERENCES users(id)
);