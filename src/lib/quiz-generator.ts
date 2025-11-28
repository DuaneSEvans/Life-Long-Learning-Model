import { claude } from "./claude"

export interface QuizQuestion {
  question: string
  difficulty: "easy" | "medium" | "hard"
  expectedKeyPoints: string[]
}

export async function generateQuestion(
  topicContent: string
): Promise<QuizQuestion> {
  const prompt = `You are a quiz generator for technical learning.

Based on the following learning content, generate ONE open-ended question that tests understanding. 
You are allowed to deviate from the content *slightly* as long as it is on topic and the question is merely an extension of the same concept. 

Content:
${topicContent}

About 50% of questions should be easy, 35% should be medium, and 15% should be hard.

Difficulty definitions:
- EASY: Tests recall and basic understanding. Asks about a single concept directly from
  the content. 1-2 key points to cover. Example: "What is X and why is it used?"
- MEDIUM: Tests ability to connect concepts or analyze a scenario. Combines 2-3 concepts
  from the content. 3-4 key points to cover. Example: "How does X solve problem Y?"
- HARD: Tests synthesis of multiple complex concepts, trade-off analysis, or problem-solving.
  Requires deep understanding of 3+ concepts and their interactions. 4+ key points to cover.
  Example: "Compare approaches X and Y for scenario Z, considering trade-offs."

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

JSON:`

  const response = await claude.chat([{ role: "user", content: prompt }], {
    temperature: 0.7,
    maxTokens: 500,
  })

  try {
    // Remove markdown code fences if present
    const cleaned = response
      .trim()
      .replace(/^```json?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
    return JSON.parse(cleaned)
  } catch (error) {
    console.error("Failed to parse question:", response)
    throw new Error("Failed to generate question")
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
${expectedKeyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Student's answer (accumulated across attempts):
"${userAnswer}"

This is attempt #${attemptNumber} (max 3 attempts).

Evaluate the answer and respond with valid JSON:
{
  "isCorrect": true/false,
  "feedback": "feedback text - see rules below",
  "hint": "if incorrect and attempts < 3, provide a specific hint for what to focus on"
}

Rules for evaluation:
- A key point is "COVERED" if the student demonstrates understanding of the concept.
  They don't need exact terminology, but must show they understand the idea.
  Simply mentioning a term without explanation does NOT count as covered.
- If the answer covers 60%+ of key points with this standard, mark as correct.
  Example: If there are 5 key points and the student explains 3 clearly, that's 60% (pass).
  If they mention all 5 but only explain 2, that's 40% (fail).
- IMPORTANT: While the accumulated answer text is provided, for attempts 2-3 you must
  consider whether meaningful new understanding was added. If the student gives up
  (e.g. "I don't know") or adds nothing new, mark as INCORRECT regardless of
  accumulated text.

Example of a PASSING answer (covers core concepts without excessive detail):
Question: "Explain how implementing a CDN would solve slow load times, and describe
what happens differently in the request flow when a user in Australia accesses a
New York-based website."
PASSING answer: "Without a CDN, the Australian user's request must go all the way to
NY and back which is slow due to latency. With a CDN, the user's request first goes
to the CDN and checks the cache there. On first time, it will cache miss and have to
go to NY (slow) but then the 2nd time, as long as the cache is within its TTL, the
CDN will return to the user. The host server in NY is never hit in this scenario!"
Why this passes: It explains the problem, the solution, and the different request flow.
It doesn't need to explain DNS routing or network propagation delays unless those are
explicitly in the key points.

Rules for feedback:
- For CORRECT answers: Provide encouraging detailed feedback on what was good
- For INCORRECT answers (attempts 1-2): Set feedback to empty string "". Only provide a hint.
- For INCORRECT answers (attempt 3): Provide the complete explanation of the answer in feedback
- Hints should guide toward the MISSING key points needed to reach the 60% threshold.
  Do NOT ask for low-level details (like specific protocol messages) unless those details
  are themselves key points. Focus hints on concepts, not minutiae.

JSON:`

  const response = await claude.chat([{ role: "user", content: prompt }], {
    temperature: 0.3,
    maxTokens: 800,
  })

  try {
    // Remove markdown code fences if present
    const cleaned = response
      .trim()
      .replace(/^```json?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
    const result = JSON.parse(cleaned)

    // If it's the 3rd attempt and still incorrect, don't provide more hints
    if (attemptNumber >= 3 && !result.isCorrect) {
      result.hint = undefined
    }

    return result
  } catch (error) {
    console.error("Failed to parse critique:", response)
    throw new Error("Failed to critique answer")
  }
}
