const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: "Backend is running 🚀" });
});

// Import reminder engine
const reminderEngine = require("./reminder");

// Manual trigger route (for cron-job.org)
app.get('/run-reminders', async (req, res) => {
  try {
    await reminderEngine.runNow();
    res.send("Reminder job executed successfully ✅");
  } catch (err) {
    console.error("❌ Error running reminders:", err);
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
