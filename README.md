# Election Debate Arena + Process Assistant
PromptWars Challenge 2 Submission: Interactive election assistant for first-time Indian voters (18-25)

## Features
1. **Debate Arena**: 3-round AI debate on 5 election topics, powered by Google Gemini (Antigravity)
2. **Election Process Explainer**: Step-by-step interactive guide to Indian election process with AI-simplified explanations
3. **Voter Eligibility Checker**: Instant tool to check voting eligibility
4. **Election Facts Ticker**: Live scrolling facts about Indian elections
5. **Accessibility**: ARIA labels, keyboard navigation, screen reader friendly
6. **Security**: Server-side API key management, input validation, XSS protection

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.0 Flash (Google Antigravity)
- **Deployment**: Google Cloud Run
- **Testing**: Jest, Supertest

## Google Services Used
- Google Gemini API (Antigravity) for debate logic, election process explanations, facts generation
- Google Cloud Run for deployment
- Google Cloud Logging (optional, enabled by default on Cloud Run)

## Setup Instructions
1. Clone repo: `git clone https://github.com/<your-username>/election-debate-arena.git`
2. Install dependencies: `npm install`
3. Create `.env` file with: `GEMINI_API_KEY=your_gemini_api_key_here`
4. Start server: `npm start` (runs on port 8080 by default)
5. Run tests: `npm test`

## Deployment to Cloud Run
```bash
gcloud run deploy election-debate \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY=$GEMINI_API_KEY \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1
```

## Repo Size
<10MB (excludes node_modules, .env via .gitignore)
