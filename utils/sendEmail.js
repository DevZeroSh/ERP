const nodemailer = require("nodemailer");

//Nodemailer
const sendEmail = async (options) => {
  try {
    //1- Create transporter (service thatll send email like "gmail","Mailgun","Mialtrap",...)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465, // if secure false port = 587, if true port = 465
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    //2-Define email options (Like from , to , subject, email, email content)
    const mailOpts = {
      from: { name: "SmartPos <smartinb.co@gmail.com>" },
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    //3-Send email
    await transporter.sendMail(mailOpts);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmail;
