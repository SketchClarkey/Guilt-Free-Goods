import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { createTransport } from 'nodemailer';
import { randomBytes } from 'crypto';

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Return success even if user doesn't exist for security
        return res.status(200).json({ message: 'If an account exists, a password reset email has been sent.' });
      }

      // Generate reset token
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      // Send reset email
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Reset your password',
        html: `
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      return res.status(200).json({ message: 'If an account exists, a password reset email has been sent.' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { token, password } = req.body;

      const verificationToken = await prisma.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken || verificationToken.expires < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      const hashedPassword = await hash(password, 12);

      await prisma.user.update({
        where: { email: verificationToken.identifier },
        data: { password: hashedPassword },
      });

      // Delete the used token
      await prisma.verificationToken.delete({
        where: { token },
      });

      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password update error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 