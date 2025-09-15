const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text, qrCodeBase64) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || "kunlexlatest@gmail.com",
            to,
            subject,
            text
        };

        if (qrCodeBase64) {
            mailOptions.attachments = [
                {
                    filename: 'ticket-qr-code.png',
                    content: qrCodeBase64.split("base64,")[1],
                    encoding: 'base64',
                    contentType: 'image/png'
                }
            ];
        }

        const info = await Transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
    }
};

module.exports = {
    sendEmail
};