# NesAI Nova

A digital library of past exam papers, memos, and study notes, paired with a
Socratic AI tutor for High School and University students.

## Development

You need Node.js (or Bun) installed.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Copy `.env.example` to `.env` and fill in the required values for local development.
For a Netlify deployment, add the same values in the site's environment-variable
settings; never commit a populated `.env` file.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase
