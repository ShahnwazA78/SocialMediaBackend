const nodemailer = require("nodemailer");

exports.sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
   host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "3f1d4f82fe7ace",
    pass: "15e9ff5cd6bb22"
  },
    
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
