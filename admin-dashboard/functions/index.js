const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "papasarone@gmail.com",
    pass: "qwml jral nznh hwph",
  },
});exports.sendAdminActionEmail = functions.https.onCall(async (data, context) => {
  const { to, subject, text } = data;
console.log("TEST EMAIL PAYLOAD:", { to: "papasarone@gmail.com", subject, text });

  console.log("sendAdminActionEmail payload:", data);

  if (!to || to.trim() === "") {
    console.error("Email error: No recipients defined.");
    return { success: false, error: "No recipients defined" };
  }

  try {
    await transporter.sendMail({
      from: '"Admin" <papasarone@gmail.com>',
      to: to.trim(),
      subject: subject || "No Subject",
      text: text || "No body provided.",
    });

    console.log("Email successfully sent to:", to);
    return { success: true };
  } catch (err) {
    console.error("Email error:", err);
    return { success: false, error: err.message };
  }
});
