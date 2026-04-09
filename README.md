# Mystery Trail

Create your own real-world mystery game in minutes.

`Mystery Trail` is a mobile-first scavenger hunt builder for families, creators, teachers, and event organizers. Build a route, hide clues, use QR codes, passcodes, or GPS checkpoints, and turn any place into an interactive adventure.

Planned live demo: `https://mysterytrailgames.atlogic.eu/`

## Why It Stands Out

- It is not just a holiday mini-game. It is a reusable game engine for real-world adventures.
- It works for birthdays, classrooms, team challenges, family events, city walks, and creative treasure hunts.
- It supports multiple verification styles: QR, passcodes, and GPS.
- It mixes digital game flow with physical movement, clues, and tasks.

## What You Can Build

- Custom mystery routes with multiple steps
- Riddles, hidden hints, and extra hint penalties
- QR checkpoints
- Passcode-based checkpoints for no-printer scenarios
- GPS-based checkpoints with distance validation
- Time limits and extra time windows
- Photo tasks, audio tasks, and end-of-game evaluation
- Polish and English game flows

## How It Works

1. Create a game route in the creator panel.
2. Choose how players unlock each step: QR, passcode, or GPS.
3. Add riddles, tasks, optional hints, and scoring rules.
4. Share the game code or link.
5. Let players explore, solve, and reach the final goal.

## Great For

- Family adventures
- Birthday mystery games
- Outdoor events
- Schools and workshops
- Interactive city or park trails
- Makers building playful real-world experiences

## Tech Stack

- React
- TypeScript
- Vite
- Firebase Auth
- Firestore
- QR scanning
- GPS checkpoint validation
- Cloudflare Pages

## Local Development

```bash
npm install
npm run dev
```

## Firebase Setup

If you want to run your own copy, create your own Firebase project and configure:

- Firestore Database
- Firebase Authentication
- Firestore security rules from `firestore.rules`

This repository uses a public client-side Firebase config, which is normal for Firebase web apps. Access control is enforced by Firebase security rules.

## Security Notes

- Local env files are ignored in git to avoid accidental commits.
- Firebase access is enforced by server-side rules.
- This repository is prepared as a public demo / showcase version, not as a high-risk enterprise platform.

## Why This Repo Exists

I wanted to build a flexible adventure game creator that can go beyond Easter and become a reusable mystery trail platform for many kinds of events.

If this project inspires your own game, event, or real-world interactive experience, consider starring the repo.

## License

MIT
