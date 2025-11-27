import { Command } from "commander"
import * as readline from "readline"
import { listTopics, getTopicContent, loadMetadata } from "../lib/topics"
import { generateQuestion, critiqueAnswer } from "../lib/quiz-generator"

export const quizCommand = new Command("quiz")
  .description("Test your knowledge with AI-generated quizzes")
  .action(async () => {
    console.log("Welcome to LLLM Quiz Mode!\n")

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    try {
      // List available topics
      const topics = await listTopics()

      if (topics.length === 0) {
        console.log('No topics found. Use "lllm ask" to learn something first!')
        rl.close()
        return
      }

      const metadata = await loadMetadata()

      console.log("Available topics:")
      topics.forEach((topic, idx) => {
        const info = metadata.topics[topic]
        if (!info) {
          throw new Error(`Topic not found: ${topic}`)
        }
        console.log(
          `  ${idx + 1}. ${info.displayName} (${info.questionCount} Q&As)`
        )
      })
      console.log(`  ${topics.length + 1}. All topics\n`)

      const choice = await new Promise<string>((resolve) => {
        rl.question(`Select a topic (1-${topics.length + 1}): `, (answer) => {
          resolve(answer.trim())
        })
      })

      const choiceNum = parseInt(choice)

      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > topics.length + 1) {
        console.log("Invalid choice")
        rl.close()
        return
      }

      const selectedTopics =
        choiceNum === topics.length + 1 ? topics : [topics[choiceNum - 1]]

      console.log(
        '\nStarting quiz! (Type "exit" to quit, "skip" for new question)\n'
      )

      let totalCorrect = 0
      let totalAsked = 0

      const askNextQuestion = async () => {
        // Pick a random topic
        const randomTopic =
          selectedTopics[Math.floor(Math.random() * selectedTopics.length)]

        try {
          if (!randomTopic) {
            throw new Error("No topic selected")
          }

          // Get topic content
          const content = await getTopicContent(randomTopic)

          // Generate question
          const quizQuestion = await generateQuestion(content)

          const topicInfo = metadata.topics[randomTopic]
          if (!topicInfo) {
            throw new Error("Topic not found")
          }
          console.log(`\n${"=".repeat(60)}`)
          console.log(`Topic: ${topicInfo.displayName}`)
          console.log(`Difficulty: ${quizQuestion.difficulty.toUpperCase()}`)
          console.log(`${"=".repeat(60)}\n`)
          console.log(`Question: ${quizQuestion.question}\n`)

          totalAsked++
          let attemptNumber = 0
          let isCorrect = false
          let accumulatedAnswer = "" // Accumulate answers across attempts

          const attemptAnswer = async (): Promise<void> => {
            attemptNumber++

            const answer = await new Promise<string>((resolve) => {
              rl.question("Your answer: ", (ans) => {
                resolve(ans.trim())
              })
            })

            if (answer.toLowerCase() === "exit") {
              console.log(`\n\nQuiz complete!`)
              console.log(
                `Score: ${totalCorrect}/${totalAsked} (${Math.round(
                  (totalCorrect / totalAsked) * 100
                )}%)`
              )
              rl.close()
              return
            }

            if (answer.toLowerCase() === "skip") {
              console.log("\n⏭ Skipping to next question...\n")
              askNextQuestion()
              return
            }

            if (!answer) {
              console.log("Please provide an answer.\n")
              return attemptAnswer()
            }

            // Accumulate the answer
            if (accumulatedAnswer) {
              accumulatedAnswer += " " + answer
            } else {
              accumulatedAnswer = answer
            }

            console.log("\nEvaluating...\n")

            const critique = await critiqueAnswer(
              quizQuestion.question,
              quizQuestion.expectedKeyPoints,
              accumulatedAnswer, // Pass accumulated answer
              attemptNumber
            )

            // Only show feedback if it's not empty
            if (critique.feedback) {
              console.log(critique.feedback)
              console.log()
            }

            if (critique.isCorrect) {
              console.log("✓ Correct!\n")
              totalCorrect++
              isCorrect = true

              // Ask if they want to continue
              const continueAnswer = await new Promise<string>((resolve) => {
                rl.question("Continue to next question? (yes/no): ", (ans) => {
                  resolve(ans.trim().toLowerCase())
                })
              })

              if (
                continueAnswer === "yes" ||
                continueAnswer === "y" ||
                continueAnswer === ""
              ) {
                askNextQuestion()
              } else {
                console.log(`\n\nQuiz complete!`)
                console.log(
                  `Score: ${totalCorrect}/${totalAsked} (${Math.round(
                    (totalCorrect / totalAsked) * 100
                  )}%)`
                )
                rl.close()
              }
            } else {
              if (attemptNumber < 3 && critique.hint) {
                console.log(`Hint: ${critique.hint}\n`)
                console.log(`Attempt ${attemptNumber + 1}/3:\n`)
                return attemptAnswer()
              } else {
                console.log("✗ Moving on to next question.\n")

                // Ask if they want to continue
                const continueAnswer = await new Promise<string>((resolve) => {
                  rl.question(
                    "Continue to next question? (yes/no): ",
                    (ans) => {
                      resolve(ans.trim().toLowerCase())
                    }
                  )
                })

                if (
                  continueAnswer === "yes" ||
                  continueAnswer === "y" ||
                  continueAnswer === ""
                ) {
                  askNextQuestion()
                } else {
                  console.log(`\n\nQuiz complete!`)
                  console.log(
                    `Score: ${totalCorrect}/${totalAsked} (${Math.round(
                      (totalCorrect / totalAsked) * 100
                    )}%)`
                  )
                  rl.close()
                }
              }
            }
          }

          await attemptAnswer()
        } catch (error: any) {
          console.error("Error generating question:", error.message)
          rl.close()
        }
      }

      await askNextQuestion()
    } catch (error: any) {
      console.error("Error:", error.message)
      rl.close()
    }
  })
