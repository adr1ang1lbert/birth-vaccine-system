/**
 * FULL AUTOMATED REMINDER SYSTEM FOR FIREBASE FUNCTIONS
 * - Sends SMS & Email notifications to guardians
 * - Runs daily at 8:00 AM Africa/Nairobi
 * - Reads: children/{childId}/schedule/{vaccineId}
 * - Reminder: 2 days before due date
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const africastalking = require("africastalking");

admin.initializeApp();
const db = admin.firestore();

/**
 * --------------------------------------------------------
 *  🔧 CONFIG LOADER (Safe for older Node versions)
 * --------------------------------------------------------
 */

const cfg = functions.config() || {};

// ---------------------------
// Africa’s Talking Config
// ---------------------------

const atUsername =
  cfg.africastalking && cfg.africastalking.username ?
    cfg.africastalking.username :
    null;

const atApiKey =
  cfg.africastalking && cfg.africastalking.apikey ?
    cfg.africastalking.apikey :
    null;

const hasAT = atUsername && atApiKey;

let smsClient = null;
if (hasAT) {
  smsClient = africastalking({
    username: atUsername,
    apiKey: atApiKey,
  }).SMS;
}

// ---------------------------
// SMTP / Email Config
// ---------------------------

const smtpHost = cfg.smtp && cfg.smtp.host ? cfg.smtp.host : null;
const smtpPort =
  cfg.smtp && cfg.smtp.port ? Number(cfg.smtp.port) : 587;

const smtpUser = cfg.smtp && cfg.smtp.user ? cfg.smtp.user : null;
const smtpPass = cfg.smtp && cfg.smtp.pass ? cfg.smtp.pass : null;

const mailFrom =
  cfg.smtp && cfg.smtp.from ?
    cfg.smtp.from :
    `"Vaccine System" <no-reply@example.com>`;

const hasSMTP = smtpHost && smtpUser && smtpPass;

let transporter = null;
if (hasSMTP) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * --------------------------------------------------------
 *  🕗 DAILY SCHEDULED REMINDER FUNCTION
 * --------------------------------------------------------
 */

exports.sendDailyNotifications = functions.pubsub
    .schedule("0 8 * * *")
    .timeZone("Africa/Nairobi")
    .onRun(async () => {
      console.log("⏳ Running daily vaccine reminder check…");

      const reminderInterval = 2;
      let notificationsSent = 0;

      const childrenSnap = await db.collection("children").get();

      for (const childDoc of childrenSnap.docs) {
        const child = {id: childDoc.id, ...childDoc.data()};

        const scheduleSnap = await db
            .collection(`children/${child.id}/schedule`)
            .get();

        for (const vaccineDoc of scheduleSnap.docs) {
          const vaccine = vaccineDoc.data();

          if (!vaccine.dueDate) continue;

          const dueDate = new Date(vaccine.dueDate);
          const today = new Date();

          const diffDays = Math.floor(
              (dueDate - today) / (1000 * 60 * 60 * 24),
          );

          if (diffDays !== reminderInterval) continue;

          const messageText = `
Reminder: ${child.childName} is due for ${vaccine.vaccine}
on ${vaccine.dueDate}. Please visit the nearest clinic.
        `.trim();

          // ⭐ SEND SMS
          if (hasAT && child.guardianPhone) {
            try {
              await smsClient.send({
                to: child.guardianPhone,
                message: messageText,
              });

              console.log(`📱 SMS sent to ${child.guardianPhone}`);
              notificationsSent++;
            } catch (err) {
              console.error("❌ SMS sending failed:", err);
            }
          }

          // ⭐ SEND EMAIL
          if (hasSMTP && child.guardianEmail) {
            try {
              await transporter.sendMail({
                from: mailFrom,
                to: child.guardianEmail,
                subject: `Vaccine Reminder for ${child.childName}`,
                text: messageText,
                html: `
                <p>Hello,</p>
                <p>
                  This is a reminder that <b>${child.childName}</b>
                  is scheduled for:
                </p>
                <ul>
                  <li><b>Vaccine:</b> ${vaccine.vaccine}</li>
                  <li><b>Due Date:</b> ${vaccine.dueDate}</li>
                </ul>
                <p>Please ensure you visit the clinic on time.</p>
                <p>Thank you.</p>
              `,
              });

              console.log(`📧 Email sent to ${child.guardianEmail}`);
              notificationsSent++;
            } catch (err) {
              console.error("❌ Email sending failed:", err);
            }
          }
        }
      }

      console.log(
          `🎉 Daily notifications complete. Total sent: ${notificationsSent}`,
      );

      return null;
    });

/**
 * --------------------------------------------------------
 *  ✔ TEST FUNCTION
 * --------------------------------------------------------
 */

exports.testConfigStatus = functions.https.onRequest((req, res) => {
  res.json({
    africasTalkingConfigured: hasAT,
    smtpConfigured: hasSMTP,
  });
});
