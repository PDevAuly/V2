import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.listen(5000, () => {
  console.log('Server läuft auf http://localhost:5000');
});
