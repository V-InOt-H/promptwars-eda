require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PRE_BASED_ANSWERS } = require('./data.js');

const app = express();

// Initialize Cache and Generative AI
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Security and Efficiency Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));
app.use(cors());
app.use(compression());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10kb' })); // Limit body payload to 10kb
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Health check for Cloud Run
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Debate endpoint (Optimized with Pre-based answers & Validation)
app.post('/api/debate', [
  body('history').isArray(),
  body('topic').isString().notEmpty().trim().escape(),
  body('yourSide').isString().notEmpty().trim().escape(),
  body('aiSide').isString().notEmpty().trim().escape(),
  body('round').isInt({ min: 1 }),
  body('maxRounds').isInt({ min: 1, max: 10 }),
], async (req, res) => {
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
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // OPTIMIZATION: If API Key is missing or user wants "Pre-based" answers
    if (!GEMINI_API_KEY || round <= maxRounds) {
        const pool = PRE_BASED_ANSWERS[topicId]?.[sideKey] || ["I disagree with your point. My stance is more logical for the future of India."];
        // Pick based on round or random
        displayResponse = pool[(round - 1) % pool.length];
        
        // Add a bit of personality
        const intros = ["Interesting point, but ", "I hear you, however ", "That's a common misconception. ", "Actually, ", "Let's look at the facts: "];
        displayResponse = intros[Math.floor(Math.random() * intros.length)] + displayResponse;
        
        // Add a challenge question
        const questions = [" Don't you think?", " How do you justify your view then?", " Isn't that a bit shortsighted?", " What about the long-term impact?"];
        displayResponse += questions[Math.floor(Math.random() * questions.length)];
    }

    // FINAL ROUND ONLY: Use Gemini for the Verdict (if API key exists)
    if (isLast && GEMINI_API_KEY && GEMINI_API_KEY.startsWith('AIza')) {
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
            displayResponse += `\n\nVERDICT:{"userScore":8,"winner":"you","summary":"You argued with great passion! While we differ, your perspective is vital for our democracy."}`;
        }
    } else if (isLast) {
        // Mock Verdict if no API key
        displayResponse += `\n\nVERDICT:{"userScore":8,"winner":"you","summary":"You argued with great passion! While we differ, your perspective is vital for our democracy to thrive."}`;
    }

    res.json({ text: displayResponse });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Election process explainer
app.get('/api/election-process', async (req, res) => {
  try {
    let { step } = req.query;
    if (!step || typeof step !== 'string') {
        step = 'registration';
    }
    
    // Check cache
    const cacheKey = `process_${step}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
        return res.json({ text: cachedResponse });
    }

    const steps = {
      registration: 'Voter registration process with ECI, documents needed, deadline',
      evm: 'Electronic Voting Machine process, VVPAT, security measures',
      campaigning: 'Election campaign rules, ECI model code of conduct',
      counting: 'Vote counting process, ECI guidelines, result declaration',
      post: 'Post-election procedures, petition process, swearing in'
    };
    
    // Quick pre-based explanations for speed
    const preExplanations = {
      registration: "Register via the NVSP portal or Voter Helpline App. You'll need an age proof (like Aadhaar) and residence proof. It's the first step to your democratic power!",
      evm: "EVMs are standalone machines. You press a button, a 'beep' sounds, and the VVPAT prints a slip for 7 seconds so you can verify your vote. Secure and foolproof!",
      campaigning: "Parties must follow the Model Code of Conduct (MCC). No hate speech or bribing. 48 hours before voting, all loud campaigning must stop (silence period).",
      counting: "Happens in secure zones monitored by CCTV and all party agents. Every EVM's seal is checked before counting. Accuracy is the top priority.",
      post: "The party with the majority (272+ seats in Lok Sabha) is invited to form the government. The PM and cabinet are then sworn in by the President."
    };

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza')) {
        const text = preExplanations[step] || "This is a key part of the Indian election process ensuring every vote counts.";
        // cache pre-explanation
        cache.set(cacheKey, text);
        return res.json({ text });
    }

    const prompt = `Explain the Indian election step: "${steps[step] || step}" in 2 simple sentences for 18-25 year olds.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Set cache
    cache.set(cacheKey, text);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Election facts ticker
app.get('/api/election-facts', async (req, res) => {
  try {
    const cacheKey = 'election_facts';
    const cachedFacts = cache.get(cacheKey);
    if (cachedFacts) {
        return res.json({ facts: cachedFacts });
    }

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
    res.json({ facts: ['India is the world’s largest democracy.'] });
  }
});

// Voter eligibility checker
app.post('/api/check-eligibility', [
    body('age').isInt({ min: 10, max: 120 }),
    body('hasVoterId').isBoolean(),
    body('state').optional().isString().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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

module.exports = app;
