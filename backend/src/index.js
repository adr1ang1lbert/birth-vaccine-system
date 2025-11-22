/**
 * BACKEND REMINDER SYSTEM (Render.com version)
 * - Runs daily using node-cron
 * - Reads Firestore
 * - Sends Email + SMS reminders
 */
require("dotenv").config();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const africastalking = require("africastalking");
const cron = require("node-cron");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Vaccine Reminder Backend is running"));

// 🔥 Load your Firebase key file
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});
const db = admin.firestore();

/**
 * --------------------------------------------------------
 *  🔐 CONFIG — Replace THESE with your actual values
 * --------------------------------------------------------
 */

const AT_USERNAME = process.env.AT_USERNAME;
const AT_APIKEY = process.env.AT_APIKEY;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const smsClient = africastalking({
  username: AT_USERNAME,
  apiKey: AT_APIKEY,
}).SMS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

/**
 * --------------------------------------------------------
 *  🕗 DAILY REMINDER JOB (runs at 8:00 AM Nairobi)
 * --------------------------------------------------------
 */

cron.schedule("0 8 * * *", async () => {
  console.log("⏳ Running daily vaccine reminder check…");

  const reminderInterval = 2; // Days before due date
  let notificationsSent = 0;

  const childrenSnap = await db.collection("children").get();

  for (const childDoc of childrenSnap.docs) {
    const child = { id: childDoc.id, ...childDoc.data() };

    const scheduleSnap = await db
      .collection(`children/${child.id}/schedule`)
      .get();

    for (const vaccineDoc of scheduleSnap.docs) {
      const vaccine = vaccineDoc.data();

      if (!vaccine.dueDate) continue;

      // Skip vaccines already given
      if (vaccine.status === "Given") continue;

      const dueDate = new Date(vaccine.dueDate);
      const today = new Date();

      const diffDays = Math.floor(
        (dueDate - today) / (1000 * 60 * 60 * 24)
      );

      // Send reminder 2 days before OR on the due date
      if (diffDays !== 2 && diffDays !== 0) continue;

      let messageText = "";

      if (diffDays === 2) {
        messageText = `
Reminder: ${child.childName} is due for ${vaccine.vaccine}
in 2 days (${vaccine.dueDate}). Please prepare to visit the nearest clinic.
        `.trim();
      }

      if (diffDays === 0) {
        messageText = `
Reminder: ${child.childName} is scheduled for ${vaccine.vaccine} TODAY
(${vaccine.dueDate}). Please visit the clinic as soon as possible.
        `.trim();
      }

      /**
       * ⭐ SEND SMS — Firestore uses 'contact'
       */
      if (child.contact) {
        try {
          await smsClient.send({
            to: child.contact,
            message: messageText,
          });

          console.log("📱 SMS sent to:", child.contact);
          notificationsSent++;
        } catch (err) {
          console.error("❌ SMS failed:", err);
        }
      }

      /**
       * ⭐ SEND EMAIL — Firestore uses 'guardianEmail'
       */
      if (child.guardianEmail) {
        try {
          await transporter.sendMail({
            from: GMAIL_USER,
            to: child.guardianEmail,
            subject: `Vaccine Reminder for ${child.childName}`,
            text: messageText,
          });

          console.log("📧 Email sent to:", child.guardianEmail);
          notificationsSent++;
        } catch (err) {
          console.error("❌ Email failed:", err);
        }
      }
    }
  }

  console.log(`🎉 Daily reminders complete. Sent: ${notificationsSent}`);
});

app.listen(3000, () => console.log("Server running on port 3000"));
