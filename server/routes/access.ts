import { Router } from 'express';

export const accessRouter = Router();

accessRouter.post('/verify', (req, res) => {
  const { code } = req.body;

  if (code === process.env.MASTER_ACCESS_CODE) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false });
});