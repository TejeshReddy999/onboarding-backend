import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from './config/db.js';
import authRoutes from './routes/auth.js';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});