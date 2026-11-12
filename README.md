# Forma — AI Health Coach

Forma is a responsive personal wellness dashboard for tracking meals, exercise, and weight. Its meal planner sends a user's goal and food preferences to Gemini and displays a concise seven-day plan.

## Pages and features

The site is a single-page app with four menu-linked sections:

- **Dashboard:** weight chart, daily intake summary, weekly exercise, and habit calendar
- **Meal management:** meal logging and Gemini-generated seven-day meal ideas
- **Exercise management:** exercise logging and a basic workout planner
- **Health report:** weekly summaries of weight, meals, and exercise

Health logs stay in browser local storage. Meal-planner inputs are sent to Gemini only after the user checks the consent box. The Gemini request uses `store: false`. The app also shows a basic meal-plan example while waiting for the API response.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Local API | Python standard library HTTP server |
| Deployed API | Vercel Python Function |
| Generative AI | Google Gemini Interactions API |
| Hosting | Vercel |

## Project structure

```text
Health-coach/
├── index.html
├── css/style.css
├── js/script.js
├── api/
│   ├── server.py       # Local development server
│   └── meal-plan.py    # Vercel serverless endpoint: /api/meal-plan
├── docs/
│   ├── service-plan.md
│   └── evidence/       # Submission screenshot instructions
└── vercel.json
```

## Run locally

1. Install Python 3.9 or newer.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a key from Google AI Studio.
3. Start the local server:

   ```bash
   python3 api/server.py
   ```

4. Open <http://127.0.0.1:8000>.

Never put the API key in HTML or JavaScript, and do not commit `.env`.

## Deploy to Vercel

1. Push this repository to GitHub and import it from the Vercel dashboard.
2. Keep the project root directory as `.`. The site files are served as static assets and `api/meal-plan.py` is deployed as `/api/meal-plan`.
3. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` for Production (and Preview if needed).
4. Redeploy, then test the meal planner on the deployed domain.

`vercel.json` sets a 60-second maximum duration for the Gemini function. Vercel's Hobby plan permits up to 60 seconds; see [Vercel Python Functions](https://vercel.com/docs/functions/runtimes/python).

### Deployment URL

Current preview deployment: <https://health-coach-8ryzilxcr-parkjs497562-9431.vercel.app>.

This preview URL currently requires Vercel Authentication, so it is not accessible to an external reviewer. Add the public production domain from the Vercel project's **Settings → Domains** here after configuring deployment protection for public production access.

## Environment variables

| Name | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | Yes | Server-side Gemini API key |
| `GEMINI_MODEL` | No | Override the default `gemini-3.5-flash-lite` model |
| `HOST` / `PORT` | Local only | Local server bind address (defaults to `127.0.0.1:8000`) |

## Service plan and evidence

See [docs/service-plan.md](docs/service-plan.md) for the target users, page structure, AI input/output, and failure behavior. Screenshot requirements and capture names are listed in [docs/evidence/README.md](docs/evidence/README.md).

## Safety note

Meal plans are general food ideas, not medical or nutrition prescriptions. Users must verify allergens and product labels. People with health conditions, pregnancy, medication use, or eating-disorder history should consult a qualified clinician or dietitian.
