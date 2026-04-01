import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendOtpEmail(to: string, name: string, code: string): Promise<void> {
  const expiry = process.env.OTP_EXPIRY_MINUTES ?? '10'
  const transport = createTransport()

  await transport.sendMail({
    from: `"Mamer Knights" <${process.env.SMTP_USER}>`,
    to,
    subject: `Your login code: ${code}`,
    text: [
      `Hi ${name},`,
      '',
      `Your Mamer Knights login code is: ${code}`,
      '',
      `This code expires in ${expiry} minutes.`,
      'If you did not request this, ignore this email.',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Montserrat,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:440px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
          <!-- Header -->
          <tr>
            <td style="background:#1B2A4A;padding:28px;text-align:center;">
              <h1 style="margin:0;color:#C5A55A;font-family:Oswald,Arial,sans-serif;font-size:26px;letter-spacing:2px;font-weight:700;">
                MAMER KNIGHTS
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 12px;color:#1B2A4A;font-size:16px;">Hi ${name},</p>
              <p style="margin:0 0 24px;color:#444;font-size:15px;">
                Use the code below to log in to the Knights App:
              </p>
              <!-- OTP Code -->
              <div style="background:#f7f7f7;border-radius:8px;padding:28px;text-align:center;margin:0 0 24px;">
                <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#1B2A4A;font-family:Oswald,Arial,sans-serif;">
                  ${code}
                </span>
              </div>
              <p style="margin:0;color:#888;font-size:13px;">
                Expires in ${expiry} minutes. If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f7f7f7;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#aaa;font-size:12px;">Mamer Knights American Football — Luxembourg</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  })
}
