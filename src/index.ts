#!/usr/bin/env bun

import dotenv from "dotenv"
import path from "path"
import { Command } from "commander"
import { askCommand } from "./commands/ask"
import { quizCommand } from "./commands/quiz"
import { configCommand } from "./commands/config"

// Load .env file from project root
const projectRoot = path.resolve(import.meta.dir, "..")
dotenv.config({ path: path.resolve(projectRoot, ".env"), quiet: true })

const program = new Command()

program
  .name("lllm")
  .description("Life Long Learning Model - AI-powered learning assistant")
  .version("0.1.0")

// Register commands
program.addCommand(askCommand)
program.addCommand(quizCommand)
program.addCommand(configCommand)

program.parse()
