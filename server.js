require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check for Cloud Run
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Gemini API proxy
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// PRE-BASED ANSWERS (PromptWars Optimization)
const PRE_BASED_ANSWERS = {
  'voting-age': {
    'ai_is_pro': [
      "If teenagers can work and pay taxes at 16, they deserve a say in how that money is spent. It's about 'no taxation without representation'!",
      "School civics classes are fresh in their minds. 16-year-olds are often more informed about current affairs than many busy adults.",
      "Engaging voters early builds a lifelong habit of democratic participation. Countries like Austria and Brazil already do this successfully!",
      "Modern 16-year-olds have unprecedented access to information via digital platforms, arguably making them more prepared than previous generations.",
      "Young people will live with the consequences of long-term policies (like climate change or debt) far longer than older voters. They should have a say now."
    ],
    'ai_is_con': [
      "18 is the legal age of adulthood for a reason. Voting requires a level of maturity and life experience that 16-year-olds are still developing.",
      "The brain's prefrontal cortex, responsible for complex decision-making, isn't fully formed at 16. We should wait for legal adulthood.",
      "School should be for learning, not political campaigning. Lowering the age could turn classrooms into battlegrounds for political parties.",
      "16-year-olds are often economically dependent on their parents, which could lead to their votes being unduly influenced by family pressure.",
      "Most global standards project 18 as the threshold for legal responsibility. Voting is the ultimate responsibility and should align with that."
    ]
  },
  'evm': {
    'ai_is_pro': [
      "EVMs in India are standalone machines, not connected to any network or the internet. This makes remote hacking physically impossible.",
      "The VVPAT system provides a physical paper trail that the voter can see. It's the ultimate 'trust but verify' mechanism for our democracy.",
      "Manual paper counting is prone to human error, booth capturing, and takes days. EVMs are faster, more accurate, and much more secure.",
      "Each EVM goes through a rigorous 'Mock Poll' in front of all party agents before the real voting begins to ensure zero tampering.",
      "The Election Commission uses a secure manufacturing process by two PSUs, ensuring that the hardware itself is never compromised."
    ],
    'ai_is_con': [
      "Any electronic device can be manipulated if someone has physical access to the chips or software. Paper is the only thing we truly 'see'.",
      "Many developed democracies like Germany and the Netherlands moved back to paper ballots because they didn't fully trust electronic systems.",
      "If a voter can't verify the code inside the machine, they are essentially taking a leap of faith. We need total transparency, not black boxes.",
      "The current VVPAT slip only stays visible for 7 seconds. We need a 100% manual count of all slips to ensure they actually match the electronic total.",
      "Electronic systems lack 'public auditability' where an average person can understand the process. Only tech experts can really verify an EVM."
    ]
  },
  'nota': {
    'ai_is_pro': [
      "If NOTA wins, it means the public has rejected all candidates. Forcing a re-election with new candidates is the only way to ensure true accountability.",
      "Currently, NOTA is just a 'protest' button with no teeth. Giving it power would force political parties to field better, cleaner candidates.",
      "Democracy is about the right to choose, and also the right to reject. A NOTA victory should be a legal mandate for fresh options.",
      "Low voter turnout is often due to bad candidates. If people knew NOTA could actually change the lineup, they'd be more likely to show up.",
      "Why should a candidate win just for being 'less bad' than the others? A NOTA majority proves the current slate is unacceptable."
    ],
    'ai_is_con': [
      "Re-elections are incredibly expensive and would stall governance for months. We need stability, not constant loops of voting.",
      "If NOTA keeps winning, the seat remains vacant. Who represents the people in the meantime? It creates a dangerous power vacuum.",
      "NOTA already serves its purpose by signaling voter dissatisfaction. We should focus on improving candidate selection through internal party reforms.",
      "A 'Right to Reject' could be misused by organized groups to consistently block elections, leading to constitutional crises.",
      "The existing NOTA option is enough for expression. Turning it into a 'power to disqualify' could be weaponized by political rivals."
    ]
  },
  'compulsory': {
    'ai_is_pro': [
      "Voting is a civic duty, just like paying taxes. If everyone is forced to vote, the government truly represents the entire population.",
      "Compulsory voting eliminates 'voter apathy' and forces parties to address the concerns of everyone, not just their motivated base.",
      "Australia has had compulsory voting since 1924 and boasts one of the most stable and representative democracies in the world.",
      "It reduces the influence of polarization, as politicians have to appeal to the sensible middle, not just the loud, extreme fringes.",
      "If voting is mandatory, the government must also ensure it's incredibly easy to do so, leading to better electoral infrastructure for all."
    ],
    'ai_is_con': [
      "The right to vote must include the right NOT to vote. Forced participation is a violation of personal liberty and freedom of expression.",
      "Compulsory voting leads to 'donkey voting' where people just randomly tick boxes to avoid a fine, which actually degrades the quality of the result.",
      "We should make people WANT to vote by providing better candidates and education, not by threatening them with legal penalties.",
      "Forcing uninterested or uninformed citizens to vote could actually lead to less rational and more easily manipulated election results.",
      "Democracy is about voluntary participation. Once you introduce coercion, you're moving away from the very spirit of freedom."
    ]
  },
  'social-media': {
    'ai_is_pro': [
      "Paid ads allow for 'micro-targeting' which manipulates specific groups with different, sometimes contradictory, messages. It's devious.",
      "The sheer amount of money spent on digital ads gives an unfair advantage to rich parties, drowning out smaller, grassroots voices.",
      "Online ads are the primary vehicle for deepfakes and misinformation. Banning paid political ads is the first step to cleaning up our feed.",
      "Platforms use opaque algorithms that prioritize sensationalism. Paying to boost these posts only amplifies the most divisive content.",
      "Voters should find their own information instead of being 'chased' by algorithms and ads based on their private browsing data."
    ],
    'ai_is_con': [
      "Social media is where young voters actually are. Banning ads there would make it harder for new parties to reach the youth cheaply.",
      "Why ban only online ads? If TV and newspapers can have political ads, banning them online is discriminatory and ineffective.",
      "The solution is better regulation and transparency labels, not a total ban. Voters are smart enough to judge information for themselves.",
      "Political ads are a form of political speech. Banning them could be seen as an infringement on the constitutional right to freedom of speech.",
      "Ads are often the only way for independent candidates to get their names out in a media landscape dominated by big established names."
    ]
  }
};

// Debate endpoint (Optimized with Pre-based answers)
app.post('/api/debate', async (req, res) => {
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

        const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            { role: 'user', parts: [{ text: "Evaluate this debate and give the verdict." }] }
        ];

        try {
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 500 } })
            });
            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    const { step } = req.query;
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

    if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza')) {
        return res.json({ text: preExplanations[step] || "This is a key part of the Indian election process ensuring every vote counts." });
    }

    const prompt = `Explain the Indian election step: "${steps[step] || step}" in 2 simple sentences for 18-25 year olds.`;
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || preExplanations[step];
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Election facts ticker
app.get('/api/election-facts', async (req, res) => {
  try {
    const defaultFacts = [
        "India's 2024 election had 97 crore registered voters—more than the population of USA & EU combined!",
        "The first election in 1951 took 4 months to complete; now it's much faster with EVMs.",
        "A polling booth is once set up for a single voter in a forest in Gujarat to ensure no one is left behind.",
        "NOTA (None of the Above) was introduced in India in 2013 following a Supreme Court order.",
        "Over 55 lakh EVMs and VVPATs are utilized across 10 lakh+ polling stations in a general election."
    ];
    res.json({ facts: defaultFacts });
  } catch (err) {
    res.json({ facts: ['India is the world’s largest democracy.'] });
  }
});

// Voter eligibility checker
app.post('/api/check-eligibility', (req, res) => {
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

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
