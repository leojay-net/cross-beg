# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/532d8830-0fa4-494b-a609-5aa4c0fc6d00

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/532d8830-0fa4-494b-a609-5aa4c0fc6d00) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Configuration

This frontend requires a running CrossBeg relayer service. The relayer URLs can be configured using environment variables:

```sh
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your relayer URLs
# For development (default):
VITE_RELAYER_URL=http://localhost:3001
VITE_RELAYER_WS_URL=ws://localhost:3001

# For production:
# VITE_RELAYER_URL=https://your-relayer-domain.com
# VITE_RELAYER_WS_URL=wss://your-relayer-domain.com
```

The relayer service should be running on port 3001 by default. See the relayer documentation for setup instructions.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/532d8830-0fa4-494b-a609-5aa4c0fc6d00) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
