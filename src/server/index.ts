import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { router } from './routes.js';


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));


const PORT = Number(process.env.PORT || 8080);
const WORKDIR = path.resolve(path.join(__dirname, '..', process.env.WORKDIR || '../workspace'));


// ensure workspace exists
fs.mkdirSync(WORKDIR, { recursive: true });


// static downloads (built jars)
app.use('/downloads', express.static(path.join(WORKDIR, '.builds')));


// mount API
app.use('/api', router({ WORKDIR }));


app.get('/health', (_req, res) => res.json({ ok: true }));


app.listen(PORT, () => {
console.log(`[server] listening on :${PORT}, workdir=`, WORKDIR);
});
