import express from "express";
import bodyParser from "body-parser";
import { Client } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import pg from "pg";
require ('dotenv').config()

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const app = express();
const port = 3000;



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
  CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    first_name VARCHAR (100) NOT NULL,
    last_name VARCHAR (100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100)
);
  `).then(() => console.log('Table created')).catch(console.error);



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


// Middleware setup
app.set("view engine", "ejs");
app.set("views", path.join(_dirname, "views"));
app.use(express.static(path.join(_dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

app.use((req, res, next) => {
  res.locals.firstName = req.session.firstName || null;
  res.locals.lastName = req.session.lastName || null;
  res.locals.userId = req.session.userId || null;
  next();
});

function ensureAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login");
}

// Routes

// Root
app.get("/", (req, res) => {
  console.log(req.session);
  res.render("home", {
    firstName: req.session.firstName,
    lastName: req.session.lastName,
  });
});

// Log in
app.get("/login", (req, res) => {
  res.render("login");
});

// Register
app.get("/register", (req, res) => {
  res.render("register");
});

// Quiz
app.get("/quiz", isAuthenticated, (req, res) => {
  res.render("quiz", {
    user: {
      id: req.session.userId,
      email: req.session.userEmail,
      firstName: req.session.firstName,
      lastName: req.session.lastName,
    },
  });
});

// About
app.get("/about", (req, res) => {
  res.render("about");
});

// Education
app.get("/education", (req, res) => {
  res.render("education");
});

// Register route
app.post("/register", async (req, res) => {
  const { username: email, password, first_name, last_name } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      const result = await db.query(
        "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name",
        [email, password, first_name, last_name]
      );

      const user = result.rows[0];
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.firstName = user.first_name;
      req.session.lastName = user.last_name;

      res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { username: email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (password === user.password) {
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.firstName = user.first_name;
        req.session.lastName = user.last_name;

        res.redirect("/");
      } else {
        res.send("Incorrect password");
      }
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Score saving route
app.post("/save-scores", ensureAuthenticated, async (req, res) => {
  try {
    const { averageScores, overallScore } = req.body;

    if (!averageScores || typeof overallScore !== "number") {
      return res.status(400).json({ error: "Invalid data" });
    }

    const userId = req.session.userId;

    await db.query(
      "INSERT INTO quiz_scores (user_id, averagescores, overallscore) VALUES ($1, $2, $3)",
      [userId, JSON.stringify(averageScores), overallScore]
    );

    res.json({ message: "Scores saved successfully" });
  } catch (error) {
    console.error("Error saving scores:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
