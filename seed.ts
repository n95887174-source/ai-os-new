import { keyService } from "./src/services/KeyService";
import { eventBus, EVENTS } from "./src/core/events";

const keys = [
  { provider: "gemini", key: "placeholder-gemini-1", label: "Gemini 1" },
  { provider: "gemini", key: "placeholder-gemini-2", label: "Gemini 2" },
  { provider: "openrouter", key: "placeholder-openrouter-1", label: "OpenRouter 1" },
  { provider: "openrouter", key: "placeholder-openrouter-2", label: "OpenRouter 2" },
  { provider: "groq", key: "placeholder-groq-1", label: "Groq 1" },
  { provider: "groq", key: "placeholder-groq-2", label: "Groq 2" },
  { provider: "groq", key: "placeholder-groq-3", label: "Groq 3" }
];

async function seed() {
  for (const k of keys) {
    try {
      await keyService.addKey({ provider: k.provider, key: k.key, label: k.label, status: "active", isDefault: false });
      console.log("Added", k.label);
    } catch(e) {
      console.error(e);
    }
  }
}
seed();
