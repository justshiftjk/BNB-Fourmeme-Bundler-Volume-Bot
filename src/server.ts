import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validatePubkey } from '@validate-pubkey/hex';

const execAsync = promisify(exec);
const app = express();

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

// Allow inline scripts by setting permissive CSP
app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.UI_PORT || 3000;

// Get current .env values
app.get('/api/env', async (req, res) => {
    try {
        // Read .env file directly
        const envPath = '.env';
        const envData: { [key: string]: string } = {};

        console.log('Reading env from:', path.resolve(envPath));
        console.log('File exists:', fs.existsSync(envPath));

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        envData[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });
            console.log('Loaded env data:', Object.keys(envData));
        }
        console.log('envData:', envData);
        if (!envData.RPC_URL) {
            console.log("RPC_URL is not set");
            return res.status(400).json({ error: 'RPC_URL is not set' });
        }
        if (!envData.PRIVATE_KEY) {
            console.log("PRIVATE_KEY is not set");
            return res.status(400).json({ error: 'PRIVATE_KEY is not set' });
        }
        // Token address is optional for distribution phase
        if (envData.TOKEN_ADDRESS && await validatePubkey(envData.TOKEN_ADDRESS) === false) {
            console.log("TOKEN_ADDRESS is invalid");
            return res.status(400).json({ error: 'Invalid token address' });
        }
        res.json({
            TOTAL_BNB: envData.TOTAL_BNB,
            TOTAL_NUM_WALLETS: envData.TOTAL_NUM_WALLETS,
            MIN_DEPOSIT_BNB: envData.MIN_DEPOSIT_BNB,
            MAX_DEPOSIT_BNB: envData.MAX_DEPOSIT_BNB,
            MIN_BUY_NUM_PER_CYCLE: envData.MIN_BUY_NUM_PER_CYCLE,
            MAX_BUY_NUM_PER_CYCLE: envData.MAX_BUY_NUM_PER_CYCLE,
            MIN_BUY_PERCENT_BNB: envData.MIN_BUY_PERCENT_BNB,
            MAX_BUY_PERCENT_BNB: envData.MAX_BUY_PERCENT_BNB,
            MIN_PERCENT_SELL: envData.MIN_PERCENT_SELL,
            MAX_PERCENT_SELL: envData.MAX_PERCENT_SELL,
            MIN_PERCENT_SELL_AMOUNT_AFTER_BUY: envData.MIN_PERCENT_SELL_AMOUNT_AFTER_BUY,
            MAX_PERCENT_SELL_AMOUNT_AFTER_BUY: envData.MAX_PERCENT_SELL_AMOUNT_AFTER_BUY,
            MIN_PER_CYCLE_TIME: envData.MIN_PER_CYCLE_TIME,
            MAX_PER_CYCLE_TIME: envData.MAX_PER_CYCLE_TIME,
            MIN_DELAY_BUY: envData.MIN_DELAY_BUY,
            MAX_DELAY_BUY: envData.MAX_DELAY_BUY,
            MIN_DELAY_SELL: envData.MIN_DELAY_SELL,
            MAX_DELAY_SELL: envData.MAX_DELAY_SELL,
            GAS_BUFFER_BNB: envData.GAS_BUFFER_BNB,
            CYCLE_LIMIT: envData.CYCLE_LIMIT,
            TOKEN_ADDRESS: envData.TOKEN_ADDRESS,
            RPC_URL: envData.RPC_URL,
            PRIVATE_KEY: envData.PRIVATE_KEY,
            WBNB_ADDRESS: envData.WBNB_ADDRESS,
            PANCAKE_ROUTER_ADDRESS: envData.PANCAKE_ROUTER_ADDRESS,
            USE_PANCAKE_AFTER_MIGRATION: envData.USE_PANCAKE_AFTER_MIGRATION,
            STEALTH_MODE: envData.STEALTH_MODE,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load env' });
    }
});

// Save .env values
app.post('/api/env', async (req, res) => {
    try {
        const envPath = '.env';
        const envContent = Object.entries(req.body)
            .filter(([key]) => req.body[key] !== undefined && req.body[key] !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        console.log('envContent:', envContent);
        if (!envContent.includes('RPC_URL=')) {
            console.log("RPC_URL is not set");
            return res.status(400).json({ error: 'RPC_URL is not set' });
        }
        if (!envContent.includes('PRIVATE_KEY=')) {
            console.log("PRIVATE_KEY is not set");
            return res.status(400).json({ error: 'PRIVATE_KEY is not set' });
        }

        // Token address is optional for distribution phase
        const tokenAddress = envContent.includes('TOKEN_ADDRESS=') ? envContent.split('TOKEN_ADDRESS=')[1].trim() : '';
        if (tokenAddress) {
            const tokenAddressTrimmed = tokenAddress.trim().slice(0, 42);
            if (await validatePubkey(tokenAddressTrimmed) === false) {
                console.log("TOKEN_ADDRESS is invalid");
                return res.status(400).json({ error: 'TOKEN_ADDRESS is invalid' });
            }
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
        res.json({ success: true, message: 'Env updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save env' });
    }
});

// Start bot (Phase 2 - Trading)
app.post('/api/start', async (req, res) => {
    try {
        console.log('Starting bot for trading...');
        // Check if already running by looking for actual node/ts-node processes with volume-bot
        exec('ps aux | grep "ts-node.*volume-bot" | grep -v grep | grep -v "ps aux"', (err, stdout) => {
            const isRunning = stdout && stdout.trim().length > 0;

            if (!isRunning) {
                // No process found, so we can start
                console.log('No existing bot process found, starting...');
                addBotLog('Bot starting for trading...');
                // Start bot in background - use --trading flag to explicitly run trading mode
                // This ensures UI buttons control behavior via flags, ignoring DISTRIBUTE_ONLY from .env
                const child = exec('ts-node src/volume-bot.ts --trading', { cwd: process.cwd() });
                child.stdout?.on('data', (data) => {
                    const logData = data.toString();
                    console.log('Bot:', logData);
                    addBotLog(logData);
                });
                child.stderr?.on('data', (data) => {
                    const logData = data.toString();
                    console.error('Bot error:', logData);
                    addBotLog(`ERROR: ${logData}`);
                });
                child.on('exit', (code) => {
                    addBotLog(`Bot exited with code ${code}`);
                });
                res.json({ success: true, message: 'Bot started for trading' });
            } else {
                // Process found, already running
                console.log('Bot is already running:', stdout.trim());
                res.status(400).json({ error: 'Bot is already running' });
            }
        });
    } catch (error) {
        console.error('Start error:', error);
        res.status(500).json({ error: 'Failed to start bot' });
    }
});

// Distribute BNB only (Phase 1)
app.post('/api/distribute', async (req, res) => {
    try {
        console.log('Starting BNB distribution...');
        // Check if already running
        exec('ps aux | grep "ts-node.*volume-bot" | grep -v grep | grep -v "ps aux"', (err, stdout) => {
            const isRunning = stdout && stdout.trim().length > 0;

            if (!isRunning) {
                console.log('Starting distribution...');
                addBotLog('Starting BNB distribution...');
                // Start bot in distribution-only mode using command line argument
                const child = exec('ts-node src/volume-bot.ts --distribute', { cwd: process.cwd() });
                child.stdout?.on('data', (data) => {
                    const logData = data.toString();
                    console.log('Distribution:', logData);
                    addBotLog(logData);
                });
                child.stderr?.on('data', (data) => {
                    const logData = data.toString();
                    console.error('Distribution error:', logData);
                    addBotLog(`ERROR: ${logData}`);
                });
                child.on('exit', (code) => {
                    addBotLog(`Distribution completed with code ${code}`);
                });
                res.json({ success: true, message: 'Distribution started' });
            } else {
                console.log('Bot is already running:', stdout.trim());
                res.status(400).json({ error: 'Bot is already running' });
            }
        });
    } catch (error) {
        console.error('Distribution error:', error);
        res.status(500).json({ error: 'Failed to start distribution' });
    }
});

// Stop bot (graceful shutdown)
app.post('/api/stop', async (req, res) => {
    try {
        // Check if running
        const { stdout } = await execAsync('ps aux | grep "ts-node.*volume-bot" | grep -v grep | grep -v "ps aux" || true');
        const isRunning = stdout.trim().length > 0;

        if (!isRunning) {
            addBotLog('Stop requested: bot already stopped');
            return res.json({ success: true, message: 'Bot already stopped' });
        }

        try {
            // Send SIGTERM for graceful shutdown (allows bot to save state)
            await execAsync('pkill -SIGTERM -f "ts-node.*volume-bot"');
            addBotLog('Bot stop signal sent (graceful shutdown)');
            return res.json({ success: true, message: 'Bot stop signal sent. State will be saved.' });
        } catch (e) {
            // Even if pkill errors, try pkill without signal
            try {
                await execAsync('pkill -f "ts-node.*volume-bot"');
                addBotLog('Bot stopped');
                return res.json({ success: true, message: 'Bot stopped' });
            } catch (e2) {
                addBotLog('Bot stop attempted (no process matched)');
                return res.json({ success: true, message: 'Bot stopped' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to stop bot' });
    }
});

// Gather
app.post('/api/gather', async (req, res) => {
    try {
        // Check if already running
        exec('ps aux | grep "ts-node.*gather" | grep -v grep | grep -v "ps aux"', (err, stdout) => {
            const isRunning = stdout && stdout.trim().length > 0;

            if (!isRunning) {
                console.log('Starting gather...');
                addBotLog('Starting gather process...');
                const child = exec('npm run gather', { cwd: process.cwd() });
                child.stdout?.on('data', (data) => {
                    const logData = data.toString();
                    console.log('Gather:', logData);
                    addBotLog(logData);
                });
                child.stderr?.on('data', (data) => {
                    const logData = data.toString();
                    console.error('Gather error:', logData);
                    addBotLog(`ERROR: ${logData}`);
                });
                child.on('close', (code) => {
                    const message = code === 0 ? 'Gather completed successfully' : `Gather completed with code ${code}`;
                    console.log(message);
                    addBotLog(message);
                });
                res.json({ success: true, message: 'Gather started' });
            } else {
                console.log('Gather is already running:', stdout.trim());
                res.status(400).json({ error: 'Gather is already running' });
            }
        });
    } catch (error) {
        console.error('Gather error:', error);
        addBotLog(`Failed to start gather: ${error}`);
        res.status(500).json({ error: 'Failed to start gather' });
    }
});

// Get bot status
app.get('/api/status', async (req, res) => {
    try {
        const { stdout } = await execAsync('ps aux | grep "ts-node.*volume-bot" | grep -v grep | grep -v "ps aux"');
        res.json({ running: stdout.trim().length > 0 });
    } catch (error) {
        res.json({ running: false });
    }
});

// Get bot state (for resuming cycles)
app.get('/api/state', async (req, res) => {
    try {
        const stateFile = 'bot-state.json';
        if (!fs.existsSync(stateFile)) {
            return res.json({ state: null });
        }
        const stateContent = fs.readFileSync(stateFile, 'utf8');
        const state = JSON.parse(stateContent);
        res.json({ state });
    } catch (error) {
        console.error('Failed to load bot state:', error);
        res.json({ state: null });
    }
});

// In-memory log storage
const botLogs: string[] = [];
const maxLogs = 500;

function addBotLog(message: string) {
    botLogs.push(`[${new Date().toISOString()}] ${message}`);
    if (botLogs.length > maxLogs) {
        botLogs.shift();
    }
}

// Get bot logs
app.get('/api/logs', (req, res) => {
    res.json({ logs: botLogs });
});

// Clear logs
app.post('/api/logs/clear', (req, res) => {
    botLogs.length = 0;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Web UI running on http://localhost:${PORT}`);
});
