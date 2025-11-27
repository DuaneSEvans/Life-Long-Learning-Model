# LLLM - Life Long Learning Model

An AI-powered CLI learning assistant that helps you learn, retain, and test your knowledge using Claude.

## Features

- **Ask Mode**: Interactive Q&A with Claude, automatically organized by topic
- **Quiz Mode**: Test your knowledge with AI-generated open-ended questions
- **Smart Topic Detection**: Automatically categorizes your questions or asks for clarification
- **Adaptive Feedback**: Get hints and detailed critiques on your quiz answers
- **Progress Tracking**: (Coming soon) Track your learning progress over time

## Installation

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Link the CLI globally:

```bash
bun link
```

4. Set your Anthropic API key:

```bash
mkdir -p ~/.lllm
echo "ANTHROPIC_API_KEY=your-api-key-here" > ~/.lllm/.env
```

## Usage

### Ask Mode

Ask questions and learn interactively. Your conversations are automatically saved and organized by topic.

```bash
lllm ask
```

Example session:

```
> What is a channel in Go?
[Topic: golang]

[Claude's response with streaming...]

> What does panic mean in Go?
[Topic: golang]

[Claude's response...]
```

### Quiz Mode

Test your knowledge on topics you've learned about.

```bash
lllm quiz
```

Features:

- Choose specific topics or quiz on all topics
- Open-ended questions with difficulty ratings
- Up to 3 attempts per question with hints
- Detailed feedback on your answers

### Configuration

View your current configuration:

```bash
lllm config
```

Your API key is stored in `~/.lllm/.env`. To set it up:

1. Create the directory: `mkdir -p ~/.lllm`
2. Create the file: `echo "ANTHROPIC_API_KEY=your-key" > ~/.lllm/.env`
3. Get your API key from: https://console.anthropic.com/settings/keys

Note: A `.env.example` file is provided in the project for reference.

## How It Works

1. **Learning**: When you ask questions in ask mode, Claude responds and saves the Q&A to topic-specific markdown files in `src/.storage/.topics/`

2. **Topic Detection**: The system intelligently determines which topic your question belongs to. If ambiguous, it will ask for clarification.

3. **Quizzing**: Quiz mode reads your saved learning materials and generates contextual questions to test your understanding.

4. **Adaptive Feedback**: When answering quiz questions, you get:
   - Immediate feedback on correctness
   - Hints if your answer is incomplete (up to 3 attempts)
   - Detailed explanations of what you missed

## Project Structure

```
lllm/
├── src/
│   ├── commands/
│   │   ├── ask.ts      # Ask mode implementation
│   │   ├── quiz.ts     # Quiz mode implementation
│   │   └── config.ts   # Configuration management
│   ├── lib/
│   │   ├── claude.ts         # Claude API wrapper
│   │   ├── topics.ts         # Topic management
│   │   ├── quiz-generator.ts # Quiz generation
│   │   └── config.ts         # Config utilities
│   ├── .storage/
│   │   ├── .topics/           # Markdown files per topic
│   │   ├── .metadata.json    # Topic metadata
│   │   └── progress.json     # Quiz progress (future)
│   └── index.ts        # CLI entry point
└── package.json
```

## Future Enhancements

- [ ] Full progress tracking implementation
- [ ] Spaced repetition reminders
- [ ] Export to Anki flashcards
- [ ] Web interface
- [ ] Multiple AI model support
- [ ] Collaborative learning mode

## Development

Run without linking:

```bash
bun run src/index.ts <command>
```

Build for distribution:

```bash
bun build
```

## Tech Stack

- **Runtime**: Bun
- **CLI Framework**: Commander.js
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Language**: TypeScript

## License

MIT

---

Built with Claude Code 🤖
