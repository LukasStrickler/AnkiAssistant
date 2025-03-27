# AnkiAssistant 🃏
A smart tool to generate and export Anki-style flashcards using AI, with a user-friendly review workflow to ensure quality and accuracy.

## 🎯 Core Features
- **AI-Powered Card Generation**: Leverage Large Language Models (LLMs) to create flashcards from user input.
- **Interactive Review Interface**: Preview, edit, and approve cards before saving to maintain control over content.
- **Multi-Format Export**: Export cards in formats compatible with popular flashcard platforms.
- **Real-Time Validation**: Catch errors early with instant feedback during card creation.

## 🛠️ Tech Stack
Here's a concise overview of AnkiAssistant's tech stack, with links to each technology:
- **Web-Framework**: [Next.js](https://nextjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Backend**: [tRPC](https://trpc.io/), Next.js API Routes
- **Database**: [Drizzle ORM](https://orm.drizzle.team/), [Turso](https://turso.tech/) (SQLite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [ShadCN UI](https://ui.shadcn.com/)
- **Authentication**: [Auth.js](https://authjs.dev/)
- **AI Integration**: [OpenAI API](https://openai.com/api/), [Ollama](https://ollama.com/) (local LLM)
- **AI Model Training/Tuning**: [Python](https://www.python.org/), [PyTorch](https://pytorch.org/), [Hugging Face](https://huggingface.co/), [Jupyter Notebooks](https://jupyter.org/)
- **Deployment**: [Vercel](https://vercel.com/)
- **Tooling**: [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) 

## 📋 Project Structure
```bash
AnkiAssistant/
├── models/          # Model Development (Python)
│   ├── mdFiles/    # Educational markdown content
│   ├── runs/       # Model run outputs and generated cards
│   ├── CardMakerFin.py  # Card generation script
│   ├── dataset.json     # Training data for card generation
│   ├── decks.json      # Available flashcard decks (hard coded)
│   └── CONTRIBUTING.md  # Model contribution guidelines
│
└── web/             # Webpage (TypeScript)
    ├── src/             # Source code
    │   ├── app/             # Next.js App Router
    │   ├── components/      # UI Components
    │   ├── hooks/           # Custom React hooks
    │   ├── lib/             # Utility functions and libraries
    │   ├── server/          # Backend server code
    │   ├── stores/          # State management
    │   ├── styles/          # Global styles
    │   ├── trpc/            # tRPC setup
    │   └── types/           # TypeScript type definitions
    │
    ├── public/          # Static assets
    ├── docs/            # Documentation
    ├── .env             # Local environment variables
    ├── .env.example     # Example environment variables
    ├── package.json     # Dependencies and scripts
    └── README.md        # Web-specific documentation
```
## 🚀 Getting Started
To set up and run AnkiAssistant locally, follow these steps:

### **1. Clone the Repository**
```bash
git clone https://github.com/LukasStrickler/AnkiAssistant.git
cd AnkiAssistant
```

### **2. Install Dependencies**
Navigate to the `web` directory and install the required dependencies:
```bash
cd web
npm install
```

### **3. Set Up Environment Variables**
Copy the `.env.example` file and fill out all required variables:
```bash
cp .env.example .env
```

### **4. Start the Development Server**
Run the following command to start the development server:
```bash
npm run dev
```

### **5. Open in Browser**
The application will be available at `http://localhost:3000`. Navigate to this URL to access the app.


## 🗺️ Roadmap
- **Customizable Templates**: Define card structures and styling to match your learning needs.


## 💬 Support
- For bug reports, please [create an issue](https://github.com/LukasStrickler/AnkiAssistant/issues) and add the `#bug` label
- For feature requests, please [create an issue](https://github.com/LukasStrickler/AnkiAssistant/issues) and add the `#featureRequest` label

## 🤝 Contributing
We welcome contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Development Areas
- **Frontend Development** - See [`/web/CONTRIBUTING.md`](web/CONTRIBUTING.md)
- **AI/Models Development** - See [`/models/CONTRIBUTING.md`](models/CONTRIBUTING.md)

### Key Guidelines
1. **Separate Pull Requests**: Keep frontend and AI/model changes in different PRs
2. **Testing Requirements**:
   - Frontend: Include UI & Unit tests
   - AI Models: Include model validation tests and benchmarks
3. **Documentation**: Update relevant docs for any new features

## 📄 License
This project is licensed under the "Business Source License 1.1" - see the [LICENSE](LICENSE) file for details.