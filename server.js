const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const admin = require("firebase-admin");

const app = express();
require("dotenv").config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const serviceAccount = require("./token.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cat-wiki-df8ac-default-rtdb.firebaseio.com",
});

const db = admin.database();

// Replace with your CatAPI key
const CAT_API_KEY = process.env.API_KEY;

// API routes
app.get("/api/cats", async (req, res) => {
  try {
    const response = await axios.get("https://api.thecatapi.com/v1/breeds", {
      headers: { "x-api-key": CAT_API_KEY },
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cats data" });
  }
});

app.get("/api/cats/search/:id", async (req, res) => {
  const catId = req.params.id;

  try {
    const response = await axios.get(
      `https://api.thecatapi.com/v1/breeds/${catId}`,
      {
        headers: { "x-api-key": CAT_API_KEY },
      }
    );

    if (response.data.length === 0) {
      res.status(404).json({ message: "Cat not found" });
    } else {
      res.json(response.data[0]);
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cat data" });
  }
});

app.get("/api/cats/points/:id", async (req, res) => {
  const catId = req.params.id;
  // Update points for this cat in the database.
  const pointsRef = db.ref(`images/${catId}`);
  pointsRef.transaction((currentPoints) => (currentPoints || 0) + 1);
});

app.get("/api/cats/top", async (req, res) => {
  const imagesRef = db.ref("images");
  imagesRef
    .once("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Create an array with cat objects containing id and points
        const catsArray = Object.keys(data).map((catId) => {
          return {
            id: catId,
            points: data[catId],
          };
        });

        // Sort the array by points, in descending order
        catsArray.sort((a, b) => b.points - a.points);

        // Limit the array to the top 10 cats
        const topCats = catsArray.slice(0, 10);

        res.json(topCats);
      } else {
        res.status(404).json({ error: "No cat data found." });
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: "An error occurred while fetching data." });
    });
});

app.get("/api/cats/photos/:id", async (req, res) => {
  const catId = req.params.id;

  try {
    const response = await axios.get(
      `https://api.thecatapi.com/v1/images/search?limit=8&breed_ids=${catId}`,
      {
        headers: { "x-api-key": CAT_API_KEY },
      }
    );

    if (response.data.length === 0) {
      res.status(404).json({ message: "Cat not found" });
    } else {
      res.json(response.data);
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cat data" });
  }
});

// Start the server
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
