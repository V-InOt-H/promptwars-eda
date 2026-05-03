import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import morgan from 'morgan';
import winston from 'winston';
import { body, validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PRE_BASED_ANSWERS, PRE_BASED_PROCESS } from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Professional Logging ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Environment Validation
if (!process.env.GEMINI_API_KEY) {
  logger.error('CRITICAL: GEMINI_API_KEY is missing from environment variables.');
  process.exit(1);
}

// Middleware
app.use(morgan('combined'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { policy: 'none' }
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// Initialize Cache and Generative AI
const cache = new NodeCache({ stdTTL: 86400 });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

/**
 * Health check endpoint for monitoring system status.
 */
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/**
 * API route for the AI Debate Arena.
 * Handles user input, looks up pre-based answers, and generates final AI verdicts.
 */
app.post('/api/debate', [
  body('history').isArray(),
  body('topic').isString().notEmpty().trim().escape(),
  body('yourSide').isString().notEmpty().trim().escape(),
  body('aiSide').isString().notEmpty().trim().escape(),
  body('round').isInt({ min: 1 }),
  body('maxRounds').isInt({ min: 1, max: 10 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { history, topic: topicLabel, yourSide, aiSide, round, maxRounds } = req.body;
    const isLast = round >= maxRounds;
    
    // Find the topic ID by matching the label
    const topicId = Object.keys(PRE_BASED_ANSWERS).find(id => {
       const labels = {
         'voting-age': 'Lower voting age to 16?',
         'evm': 'Are EVMs fully trustworthy?',
         'nota': 'NOTA should trigger re-election?',
         'compulsory': 'Should voting be compulsory?',
         'social-media': 'Ban paid political online ads?'
       };
       return labels[id] === topicLabel;
    });

    const isPro = aiSide.toLowerCase().includes('yes') || aiSide.toLowerCase().includes('secure') || aiSide.toLowerCase().includes('mandatory') || aiSide.toLowerCase().includes('reliable') || (topicId === 'nota' && aiSide.includes('fresh'));
    const sideKey = isPro ? 'ai_is_pro' : 'ai_is_con';

    let displayResponse = "";
    
    // Pre-based logic for speed and efficiency
    if (round <= maxRounds) {
        const pool = PRE_BASED_ANSWERS[topicId]?.[sideKey] || ["I disagree with your point. My stance is more logical for the future of India."];
        displayResponse = pool[(round - 1) % pool.length];
        const intros = ["Interesting point, but ", "I hear you, however ", "That's a common misconception. ", "Actually, ", "Let's look at the facts: "];
        displayResponse = intros[Math.floor(Math.random() * intros.length)] + displayResponse;
    }

    // FINAL ROUND ONLY: Use Gemini for the Verdict
    if (isLast) {
        const systemPrompt = `You are a sharp, witty AI judge.
Based on the debate history, provide a final rebuttal and output exactly: VERDICT:{"userScore":0-10,"winner":"you" or "ai" or "draw","summary":"2-sentence fair assessment"}`;

        let promptText = systemPrompt + "\n\n--- Debate History ---\n";
        history.forEach(msg => {
            promptText += `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}\n`;
        });
        promptText += "\nEvaluate this debate and give the verdict.";

        try {
            const result = await model.generateContent(promptText);
            const aiText = result.response.text();
            if (aiText.includes('VERDICT:')) {
                displayResponse += "\n\n" + aiText;
            } else {
                displayResponse += `\n\nVERDICT:{"userScore":7,"winner":"draw","summary":"Both sides made strong points about ${topicLabel}. A very balanced debate!"}`;
            }
        } catch (e) {
            logger.warn('AI Verdict Generation failed, using fallback.', { error: e.message });
            displayResponse += `\n\nVERDICT:{"userScore":8,"winner":"you","summary":"You argued with great passion! While we differ, your perspective is vital for our democracy."}`;
        }
    }

    res.json({ text: displayResponse });

  } catch (err) {
    next(err);
  }
});

/**
 * Route for explaining parts of the Indian election process.
 * Utilizes caching for high performance.
 */
app.get('/api/election-process', async (req, res, next) => {
  try {
    let { step } = req.query;
    if (!step || typeof step !== 'string') step = 'registration';
    
    // 1. Static pre-based answers for common steps
    if (PRE_BASED_PROCESS[step]) {
      return res.json({ text: PRE_BASED_PROCESS[step] });
    }

    // 2. Cache for dynamic steps
    const cacheKey = `process_${step}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) return res.json({ text: cachedResponse });

    const stepsMap = {
      registration: 'Voter registration process with ECI, documents needed, deadline',
      evm: 'Electronic Voting Machine process, VVPAT, security measures',
      campaigning: 'Election campaign rules, ECI model code of conduct',
      counting: 'Vote counting process, ECI guidelines, result declaration',
      post: 'Post-election procedures, petition process, swearing in'
    };

    const prompt = `Explain the Indian election step: "${stepsMap[step] || step}" in 2 simple sentences for 18-25 year olds.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    cache.set(cacheKey, text);
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

/**
 * API route for the election facts ticker.
 */
app.get('/api/election-facts', async (req, res, next) => {
  try {
    const cacheKey = 'election_facts';
    const cachedFacts = cache.get(cacheKey);
    if (cachedFacts) return res.json({ facts: cachedFacts });

    const defaultFacts = [
        "India's 2024 election had 97 crore registered voters—more than the population of USA & EU combined!",
        "The first election in 1951 took 4 months to complete; now it's much faster with EVMs.",
        "A polling booth is once set up for a single voter in a forest in Gujarat to ensure no one is left behind.",
        "NOTA (None of the Above) was introduced in India in 2013 following a Supreme Court order.",
        "Over 55 lakh EVMs and VVPATs are utilized across 10 lakh+ polling stations in a general election."
    ];
    
    cache.set(cacheKey, defaultFacts);
    res.json({ facts: defaultFacts });
  } catch (err) {
    next(err);
  }
});

/**
 * Eligibility checker endpoint.
 */
app.post('/api/check-eligibility', [
    body('age').isInt({ min: 10, max: 120 }),
    body('hasVoterId').isBoolean(),
    body('state').optional().isString().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { age, hasVoterId, state } = req.body;
  const eligible = age >= 18 && hasVoterId;
  res.json({
    eligible,
    message: eligible 
      ? `You are eligible to vote in ${state || 'India'}! Ensure your name is in the electoral roll.`
      : age < 18 
        ? `You'll be a hero when you turn 18! Pre-register at the ECI website now.`
        : `Almost there! Just apply for your Voter ID at https://voters.eci.gov.in/`
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  logger.error('Unhandled Application Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app;
