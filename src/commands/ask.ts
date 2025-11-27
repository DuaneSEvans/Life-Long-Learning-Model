import { Command } from "commander"
import * as readline from "readline"
import { claude, type Message } from "../lib/claude"
import { detectTopic, saveQuestionAnswer } from "../lib/topics"

export const askCommand = new Command("ask")
  .description("Ask questions and learn with Claude")
  .action(async () => {
    console.log("Welcome to LLLM Ask Mode!")
    console.log('Type your question (or "exit" to quit)\n')

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const conversationHistory: Message[] = []

    const askQuestion = () => {
      rl.question("> ", async (question) => {
        if (question.trim().toLowerCase() === "exit") {
          console.log("\nGoodbye!")
          rl.close()
          return
        }

        if (!question.trim()) {
          askQuestion()
          return
        }

        try {
          // Detect topic
          const topicResponse = await detectTopic(question, conversationHistory)

          let finalTopic: string

          // Check if clarification is needed
          if (topicResponse.startsWith("CLARIFY:")) {
            const options = topicResponse
              .replace("CLARIFY:", "")
              .trim()
              .split(",")
              .map((o) => o.trim())

            console.log(`\nI'm not sure about the topic. Did you mean:`)
            options.forEach((opt, idx) => console.log(`  ${idx + 1}. ${opt}`))
            console.log(`  ${options.length + 1}. Other (specify)`)

            const choice = await new Promise<string>((resolve) => {
              rl.question(
                "\nChoose (1-" + (options.length + 1) + "): ",
                (answer) => {
                  resolve(answer.trim())
                }
              )
            })

            const choiceNum = parseInt(choice)
            if (choiceNum > 0 && choiceNum <= options.length) {
              finalTopic = options[choiceNum - 1]!
            } else {
              const customTopic = await new Promise<string>((resolve) => {
                rl.question("Enter topic name: ", (answer) => {
                  resolve(answer.trim())
                })
              })
              finalTopic = customTopic
            }
          } else {
            finalTopic = topicResponse
          }

          console.log(`\n[Topic: ${finalTopic}]\n`)

          // Get Claude's response with streaming
          conversationHistory.push({ role: "user", content: question })

          let answer = ""

          const systemPrompt = `You are a concise learning assistant. Follow these rules:
1. Keep responses to a maximum of 10 sentences
2. Always provide tangible, concrete examples
3. End your response by asking if the user would like to explore related topics (suggest 2-3 specific follow-up topics)

Be clear, practical, and encourage continued learning.`

          await claude.chat(conversationHistory, {
            stream: true,
            system: systemPrompt,
            onStream: {
              onText: (text) => {
                process.stdout.write(text)
              },
              onComplete: async (fullText) => {
                answer = fullText
                conversationHistory.push({
                  role: "assistant",
                  content: fullText,
                })

                // Save to topic file
                await saveQuestionAnswer(finalTopic, question, answer)

                console.log("\n\n---\n")
                askQuestion()
              },
              onError: (error) => {
                console.error("\n\nError:", error.message)
                askQuestion()
              },
            },
          })
        } catch (error: any) {
          console.error("Error:", error.message)
          askQuestion()
        }
      })
    }

    askQuestion()
  })
