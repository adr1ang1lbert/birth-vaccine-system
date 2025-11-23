/**
 * REMINDER ENGINE (Triggered manually via /run-reminders)
 * VERBOSE LOGGING VERSION
 */

require("dotenv").config();
const fs = require("fs");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const africastalking = require("africastalking");

/* ---------------------------------------
   FIREBASE INITIALIZATION (RENDER SAFE)
----------------------------------------- */

// Read the Firebase secret file from Render Secret Files
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    fs.readFileSync("/etc/secrets/serviceAccountKey.json", "utf8")
  );
  console.log("✔ Firebase service account loaded");
} catch (err) {
  console.error("❌ Failed to load Firebase key:", err);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* ---------------------------------------
   ENVIRONMENT VARIABLES
----------------------------------------- */

const AT_USERNAME = process.env.AT_USERNAME;
const AT_APIKEY = process.env.AT_APIKEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

console.log("🔐 Secrets loaded: ", {
  africasTalkingUser: AT_USERNAME ? "OK" : "MISSING",
  gmailUser: GMAIL_USER ? "OK" : "MISSING",
});

/* ---------------------------------------
   CLIENT INITIALIZATION
----------------------------------------- */

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

/* ---------------------------------------
   MESSAGE GENERATORS
----------------------------------------- */

// SMS for low-literacy users
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

// Bilingual professional email
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
<p><strong>${child}</strong> anapaswa kupokea chanjo ya <strong>${vaccine}</strong> LEO (${dueDate}).</p>
`.trim();
}


/* ---------------------------------------
   MAIN REMINDER ENGINE WITH VERBOSE LOGS
----------------------------------------- */

async function runNow() {
  console.log("🚀 Starting REMINDER ENGINE (Verbose Mode)...");
  let notificationsSent = 0;

  const childrenSnap = await db.collection("children").get();
  console.log(`📌 Found ${childrenSnap.size} children in database`);

  for (const childDoc of childrenSnap.docs) {
    const child = { id: childDoc.id, ...childDoc.data() };

    console.log(`\n👶 Checking child: ${child.childName} (ID: ${child.id})`);

    const scheduleSnap = await db
      .collection(`children/${child.id}/schedule`)
      .get();

    if (scheduleSnap.empty) {
      console.log("⚠️ No vaccines scheduled — skipping child.");
      continue;
    }

    for (const vaccineDoc of scheduleSnap.docs) {
      const vaccine = vaccineDoc.data();

      console.log(`   ➤ Vaccine: ${vaccine.vaccine}`);

      if (!vaccine.dueDate) {
        console.log("     ⏭️ Skipped: No due date.");
        continue;
      }

      if (vaccine.status === "Given") {
        console.log("     ⏭️ Skipped: Already marked as GIVEN.");
        continue;
      }

      const dueDate = new Date(vaccine.dueDate);
      const today = new Date();

      const diffDays = Math.floor(
        (dueDate - today) / (1000 * 60 * 60 * 24)
      );

      console.log(`     📅 Due in: ${diffDays} days`);

      if (diffDays !== 2 && diffDays !== 0) {
        console.log("     ⏭️ Not time for reminder — SKIPPED.");
        continue;
      }

      const type = diffDays === 2 ? "2days" : "today";

      console.log(
        `     ✅ Sending reminder (${type === "2days" ? "2 DAYS BEFORE" : "TODAY"})`
      );

      const smsText = smsMessage(child.childName, vaccine.vaccine, vaccine.dueDate, type);
      const emailHTML = emailMessage(child.childName, vaccine.vaccine, vaccine.dueDate, type);

      /* ---- SEND SMS ---- */
      if (child.contact) {
        try {
          await smsClient.send({ to: child.contact, message: smsText });
          console.log(`     📱 SMS sent to: ${child.contact}`);
          notificationsSent++;
        } catch (err) {
          console.error("     ❌ SMS ERROR:", err);
        }
      } else {
        console.log("     ⚠️ No phone number available — SMS not sent.");
      }

      /* ---- SEND EMAIL ---- */
      if (child.guardianEmail) {
        try {
          await transporter.sendMail({
            from: GMAIL_USER,
            to: child.guardianEmail,
            subject: `Vaccination Reminder for ${child.childName}`,
            html: emailHTML,
          });

          console.log(`     📧 Email sent to: ${child.guardianEmail}`);
          notificationsSent++;
        } catch (err) {
          console.error("     ❌ EMAIL ERROR:", err);
        }
      } else {
        console.log("     ⚠️ No email address available — Email not sent.");
      }
    }
  }

  console.log(`\n🎉 REMINDER ENGINE COMPLETE — Total notifications sent: ${notificationsSent}`);
}

module.exports = { runNow };
