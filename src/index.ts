#!/usr/bin/env bun

import { Command } from 'commander';
import { askCommand } from './commands/ask';
import { quizCommand } from './commands/quiz';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('lllm')
  .description('Life Long Learning Model - AI-powered learning assistant')
  .version('0.1.0');

// Register commands
program.addCommand(askCommand);
program.addCommand(quizCommand);
program.addCommand(configCommand);

program.parse();
