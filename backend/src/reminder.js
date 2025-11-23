/**
 * REMINDER ENGINE (Triggered manually via /run-reminders)
 */

require("dotenv").config();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const africastalking = require("africastalking");

// Firebase Init (Correct path for Render secret files)
admin.initializeApp({
  credential: admin.credential.cert("/etc/secrets/serviceAccountKey.json"),
});

const db = admin.firestore();

// ENV
const AT_USERNAME = process.env.AT_USERNAME;
const AT_APIKEY = process.env.AT_APIKEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// SMS client
const smsClient = africastalking({
  username: AT_USERNAME,
  apiKey: AT_APIKEY,
}).SMS;

// Email client
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

/* --------------------------
   MESSAGE GENERATORS
--------------------------- */

// BILINGUAL SMS (simple, low-literacy)
function smsMessage(child, vaccine, dueDate, type) {
  if (type === "2days") {
    return `
EN: Reminder: ${child} needs ${vaccine} in 2 days (${dueDate}). 
SW: Kumbusho: ${child} atapokea ${vaccine} ndani ya siku 2 (${dueDate}).
    `.trim();
  }

  return `
EN: Reminder: ${child} needs ${vaccine} TODAY (${dueDate}). 
SW: Kumbusho: ${child} anahitaji ${vaccine} LEO (${dueDate}).
  `.trim();
}

// BILINGUAL EMAIL (rich HTML)
function emailMessage(child, vaccine, dueDate, type) {
  if (type === "2days") {
    return `
<h3>English</h3>
<p><strong>${child}</strong> is due for <strong>${vaccine}</strong> in 2 days (${dueDate}).</p>

<h3>Kiswahili</h3>
<p><strong>${child}</strong> anapaswa kupata chanjo ya <strong>${vaccine}</strong> ndani ya siku 2 (${dueDate}).</p>
    `.trim();
  }

  return `
<h3>English</h3>
<p><strong>${child}</strong> is scheduled for <strong>${vaccine}</strong> TODAY (${dueDate}).</p>

<h3>Kiswahili</h3>
<p><strong>${child}</strong> anapaswa kupokea <strong>${vaccine}</strong> LEO (${dueDate}).</p>
  `.trim();
}

/* --------------------------
     MAIN REMINDER PROCESS
--------------------------- */

async function runNow() {
  console.log("⏳ Running vaccine reminder job…");

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
      if (vaccine.status === "Given") continue;

      const dueDate = new Date(vaccine.dueDate);
      const today = new Date();

      const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

      // Only send reminders at diff = 2 or 0
      if (diffDays !== 2 && diffDays !== 0) continue;

      const type = diffDays === 2 ? "2days" : "today";

      // SMS TEXT
      const smsText = smsMessage(child.childName, vaccine.vaccine, vaccine.dueDate, type);

      // EMAIL TEXT
      const emailHTML = emailMessage(child.childName, vaccine.vaccine, vaccine.dueDate, type);

      // Send SMS
      if (child.contact) {
        try {
          await smsClient.send({ to: child.contact, message: smsText });
          console.log("📱 SMS sent to:", child.contact);
          notificationsSent++;
        } catch (err) {
          console.error("❌ SMS failed:", err);
        }
      }

      // Send Email
      if (child.guardianEmail) {
        try {
          await transporter.sendMail({
            from: GMAIL_USER,
            to: child.guardianEmail,
            subject: `Vaccination Reminder for ${child.childName}`,
            html: emailHTML,
          });
          console.log("📧 Email sent to:", child.guardianEmail);
          notificationsSent++;
        } catch (err) {
          console.error("❌ Email failed:", err);
        }
      }
    }
  }

  console.log(`🎉 Reminder job complete. Notifications sent: ${notificationsSent}`);
}

module.exports = { runNow };
