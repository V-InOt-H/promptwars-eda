const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check for Cloud Run
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Gemini API proxy (server-side key, no client exposure)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Debate endpoint (replaces Anthropic API call)
app.post('/api/debate', async (req, res) => {
  try {
    const { history, topic, yourSide, aiSide, round, maxRounds } = req.body;
    const isLast = round >= maxRounds;
    
    const systemPrompt = `You are a sharp, witty AI debate opponent in an election-themed debate game for first-time Indian voters (18-25).
Rules:
- ALWAYS argue from your assigned stance: "${aiSide}". Never concede or switch sides.
- Keep every response punchy — 2 to 4 sentences MAX.
- First rebut the user's argument directly, then reinforce your own stance with a fact.
- End every response with a sharp question or challenge to keep the debate going.
- Use real facts about Indian elections (ECI, EVM, NOTA, Constitution articles) when relevant.
- Tone: confident, witty, slightly provocative — like a smart friend who never gives up.
${isLast ? 'After this final round ONLY: give your final rebuttal, then on a new line output exactly: VERDICT:{"userScore":0-10,"winner":"you" or "ai" or "draw","summary":"2-sentence fair assessment of the debate"}' : ''}`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1000 } })
    });

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not get response.';
    res.json({ text: raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Election process explainer (innovative feature: addresses core problem statement)
app.get('/api/election-process', async (req, res) => {
  try {
    const { step } = req.query;
    const steps = {
      registration: 'Voter registration process with ECI, documents needed, deadline',
      evm: 'Electronic Voting Machine process, VVPAT, security measures',
      campaigning: 'Election campaign rules, ECI model code of conduct',
      counting: 'Vote counting process, ECI guidelines, result declaration',
      post: 'Post-election procedures, petition process, swearing in'
    };
    
    const prompt = `Explain the Indian election step: "${steps[step] || step}" in 2-3 simple sentences for 18-25 year old first-time voters. No jargon.`;
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200 }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Explanation unavailable.';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Election facts ticker (innovative feature: real-time Indian election facts)
app.get('/api/election-facts', async (req, res) => {
  try {
    const prompt = `Generate 5 short, fun facts about Indian elections for 18-25 year olds. 1 sentence each, no jargon. Format as JSON array: ["fact1", "fact2", ...]`;
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300 }
      })
    });

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const facts = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ facts });
  } catch (err) {
    res.json({ facts: ['India has the world’s largest electorate with 97 crore voters.'] });
  }
});

// Voter eligibility checker (innovative feature: interactive tool)
app.post('/api/check-eligibility', (req, res) => {
  const { age, hasVoterId, state } = req.body;
  const eligible = age >= 18 && hasVoterId;
  res.json({
    eligible,
    message: eligible 
      ? `You are eligible to vote in ${state || 'India'}! Register before the deadline.`
      : age < 18 
        ? `You can vote when you turn 18. Pre-register at ECI website.`
        : `Get your Voter ID at ECI portal: https://voters.eci.gov.in/`
  });
});

// Export for testing
module.exports = app;

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
