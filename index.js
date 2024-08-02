require("dotenv").config(); // Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

const MONGO_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Define the User schema and model
const userSchema = new mongoose.Schema({
  userID: { type: Number, required: true, unique: true },
  clicks: { type: Number, default: 0 },
  upgrades: [{ type: String }],
  friends: [{ type: Number }], // Field to store friend IDs
});

const User = mongoose.model("User", userSchema);

// API endpoint to get user clicks
app.get("/api/clicks", async (req, res) => {
  const { userID } = req.query;

  try {
    const user = await User.findOne({ userID });
    if (user) {
      res.json({ clicks: user.clicks });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API endpoint to update user clicks
app.post("/api/clicks", async (req, res) => {
  const { userID, clicks } = req.body;

  console.log(`Received update request: userID=${userID}, clicks=${clicks}`);

  try {
    const user = await User.findOneAndUpdate(
      { userID },
      { $set: { clicks } },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (error) {
    console.error("Error updating user clicks:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/upgrades", async (req, res) => {
  const { userID, upgradeName } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { userID },
      { $addToSet: { upgrades: upgradeName } },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (error) {
    console.error("Error storing upgrade:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/upgrades", async (req, res) => {
  const { userID } = req.query;

  try {
    // Ensure userID is a number
    const id = Number(userID);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid userID format" });
    }

    // Find the user by userID
    const user = await User.findOne({ userID: id });

    if (user) {
      // Return the upgrades array
      res.json({ upgrades: user.upgrades });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching upgrades:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/friends", async (req, res) => {
  const { userID } = req.query;
  try {
    const id = Number(userID);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid userID format" });
    }
    const user = await User.findOne({ userID: id });
    if (user) {
      res.json({ friends: user.friends }); // Return the friends array
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching friends:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// API endpoint to add a friend
app.post("/api/friends/add", async (req, res) => {
  const { userID, friendID } = req.body;

  try {
    // Add friendID to user's friends list
    const user = await User.findOneAndUpdate(
      { userID },
      { $addToSet: { friends: friendID } },
      { new: true, upsert: true }
    );

    // Optionally, add userID to the friend's friends list (if needed)
    await User.findOneAndUpdate(
      { userID: friendID },
      { $addToSet: { friends: userID } },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (error) {
    console.error("Error adding friend:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
