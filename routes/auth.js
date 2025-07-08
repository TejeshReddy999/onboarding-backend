import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {body, validationResult} from 'express-validator';

import User from '../models/user.js';
import sendEmail from '../utils/sendEmail.js';


const router = express.Router();

// Register route
router.post('/register', 
    
    [body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')], 
    
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            let existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const verificationtoken = crypto.randomBytes(32).toString('hex');

            const user = new User({
                name,
                email,
                password: hashedPassword,
                verificationtoken,
            });

            await user.save();

            const verifyUrl = `http://localhost:5000/api/auth/verify-email?token=${verificationtoken}&email=${email}`;
            
            const html =    `<h1>Verify Your Email</h1>
                            <p>Click the link below to activate your account:</p>
                            <a href="${verifyUrl}">${verifyUrl}</a>`;

            await sendEmail(email, 'Email Verification', html);

            res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
        }

        catch (error) {
            res.status(500).json({ message: 'Server error',error: error.message });
        }
    }
);

// Email verification route
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;
  console.log('Incoming token:', token);
  console.log('Incoming email:', email);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User from DB:', user);

    if (user.isVerified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    if (user.verificationtoken !== token) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    user.isVerified = true;
    user.verificationtoken = '';
    await user.save();

    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Login route
router.post('/login',[
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerfied) {
            return res.status(403).json({ message: 'Email not verified' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({token,message: 'Login successful '});
    } 
    
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;