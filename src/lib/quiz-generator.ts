import { claude } from './claude';

export interface QuizQuestion {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedKeyPoints: string[];
}

export async function generateQuestion(topicContent: string): Promise<QuizQuestion> {
  const prompt = `You are a quiz generator for technical learning.

Based on the following learning content, generate ONE open-ended question that tests understanding.

Content:
${topicContent}

Generate a question that:
1. Tests conceptual understanding (not just memorization)
2. Is open-ended (requires explanation, not just yes/no)
3. Has a clear difficulty level

Respond ONLY with valid JSON in this format:
{
  "question": "Explain...",
  "difficulty": "easy|medium|hard",
  "expectedKeyPoints": ["point1", "point2", "point3"]
}

JSON:`;

  const response = await claude.chat([{ role: 'user', content: prompt }], {
    temperature: 0.7,
    maxTokens: 500
  });

  try {
    // Remove markdown code fences if present
    const cleaned = response.trim().replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse question:', response);
    throw new Error('Failed to generate question');
  }
}

export async function critiqueAnswer(
  question: string,
  expectedKeyPoints: string[],
  userAnswer: string,
  attemptNumber: number
): Promise<{ isCorrect: boolean; feedback: string; hint?: string }> {
  const prompt = `You are evaluating a student's answer to a technical question.

Question: ${question}

Expected key points to cover:
${expectedKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Student's answer (accumulated across attempts):
"${userAnswer}"

This is attempt #${attemptNumber} (max 3 attempts).

Evaluate the answer and respond with valid JSON:
{
  "isCorrect": true/false,
  "feedback": "feedback text - see rules below",
  "hint": "if incorrect and attempts < 3, provide a specific hint for what to focus on"
}

Rules:
- If the answer covers most key points (70%+), mark as correct
- For CORRECT answers: Provide encouraging detailed feedback on what was good
- For INCORRECT answers (attempts 1-2): Set feedback to empty string "". Only provide a hint.
- For INCORRECT answers (attempt 3): Provide the complete explanation of the answer in feedback
- Hints should be specific and guide without giving away the answer

JSON:`;

  const response = await claude.chat([{ role: 'user', content: prompt }], {
    temperature: 0.3,
    maxTokens: 800
  });

  try {
    // Remove markdown code fences if present
    const cleaned = response.trim().replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const result = JSON.parse(cleaned);

    // If it's the 3rd attempt and still incorrect, don't provide more hints
    if (attemptNumber >= 3 && !result.isCorrect) {
      result.hint = undefined;
    }

    return result;
  } catch (error) {
    console.error('Failed to parse critique:', response);
    throw new Error('Failed to critique answer');
  }
}
