import { requestChatCompletion } from "./openai-compatible.ts";
import { loadAiSettings } from "../settings/ai-settings-storage.ts";
import {
  DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT,
  DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT,
  type PromptOptimizeFormat,
  type PromptOptimizerPrompts
} from "../../shared/prompt-workbench-storage.ts";

type PromptOptimizationMessage = {
  role: "system" | "user";
  content: string;
};

type PromptOptimizationRequest = {
  input: string;
  format: PromptOptimizeFormat;
  optimizerPrompts: PromptOptimizerPrompts;
};

type PromptOptimizationMessages = {
  messages: PromptOptimizationMessage[];
  options: {
    temperature: number;
    maxTokens: number;
  };
};

export { DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT, DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT };

const STRICT_PLANNING_FORMAT_RULES = `
The Markdown table must use this exact header:
| 项目 | 当前判断 | 需要你补充/修改 |
| -- | -- | -- |

Rows must cover: 目标, 输入材料, 期望输出, 边界限制, 技术路线, 验收标准, 风险点, 仍需确认.
Each 当前判断 cell must mark the source status as one of: Provided, Suggested, Missing, Confirm.
`.trim();

export function buildPromptOptimizationMessages(request: PromptOptimizationRequest): PromptOptimizationMessages {
  const input = request.input.trim();
  const baseSystemPrompt =
    request.format === "strict-planning"
      ? `${request.optimizerPrompts.strictPlanning}\n\n${STRICT_PLANNING_FORMAT_RULES}`
      : request.optimizerPrompts.simplePolish;

  return {
    messages: [
      {
        role: "system",
        content: baseSystemPrompt
      },
      {
        role: "user",
        content: input
      }
    ],
    options: {
      temperature: request.format === "strict-planning" ? 0.1 : 0.2,
      maxTokens: request.format === "strict-planning" ? 1800 : 1200
    }
  };
}

export function sanitizePromptOptimizerError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .slice(0, 900);
}

export async function optimizePromptInput(request: PromptOptimizationRequest): Promise<string> {
  const settings = await loadAiSettings();
  const built = buildPromptOptimizationMessages(request);
  return requestChatCompletion(settings, built.messages, built.options);
}
