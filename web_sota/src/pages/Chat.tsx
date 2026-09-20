import { Download, Eraser, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ChatMessage, getSkillContent, llmChat, llmChatStream } from "../lib/api";
import { useLlmStore } from "../stores/llm";

const HISTORY_KEY = "disk-chat-history";
const HISTORY_CAP = 100;

interface Personalities {
  [name: string]: string;
}

const PERSONALITIES: Personalities = {
  Default: "You are a helpful assistant for disk usage analysis.",
  Reclaimer:
    "You are a terse storage-ops assistant. Answer in short bullet lists. Always quantify GB/MB. Never suggest deleting anything without explicit confirmation.",
  Explorer:
    "You are a verbose, curious analyst. Explain what the numbers mean, why drives fill up, and how the tools (dua-cli, czkawka) work under the hood.",
  "DJ Librarian":
    "You are an assistant for DJs managing huge music libraries. Relate every answer to keeping a music collection lean: duplicates, lossless vs MP3 sizes, backup hygiene.",
  Custom: "",
};

const EXAMPLE_PROMPTS = [
  "Which drive should I clean first?",
  "How do I find files bigger than 10 GB on D:\\?",
  "Explain what a snapshot diff tells me",
  "How do duplicates waste space in backup libraries?",
  "Plan a reclamation pass over D:\\ and E:\\",
  "What should I check before deleting large files?",
];

interface UiMessage extends ChatMessage {
  streaming?: boolean;
}

function loadHistory(): UiMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UiMessage[];
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_CAP) : [];
  } catch {
    return [];
  }
}

export default function Chat() {
  const { selectedProvider, selectedModel, providers, probe, probing } = useLlmStore();
  const [messages, setMessages] = useState<UiMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [personality, setPersonality] = useState("Default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [skillPreprompt, setSkillPreprompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [useStream, setUseStream] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void probe();
    getSkillContent("disk-usage")
      .then((data) => {
        if (data.success && data.content) setSkillPreprompt(data.content.slice(0, 4000));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch {
      /* ignore */
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeProvider = providers.find((p) => p.id === selectedProvider);
  const providerOk = activeProvider?.detected ?? false;

  const systemPrompt = () => {
    const persona = personality === "Custom" ? customPrompt : PERSONALITIES[personality];
    return [skillPreprompt && `Skill context:\n${skillPreprompt}`, persona].filter(Boolean).join("\n\n");
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError("");
    const next: UiMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    const payload = next.map(({ role, content }) => ({ role, content }));

    if (useStream) {
      const controller = new AbortController();
      abortRef.current = controller;
      let assistant = "";
      setMessages([...next, { role: "assistant", content: "", streaming: true }]);
      try {
        for await (const delta of llmChatStream(
          selectedProvider,
          selectedModel,
          payload,
          systemPrompt(),
          controller.signal,
        )) {
          assistant += delta;
          setMessages([...next, { role: "assistant", content: assistant, streaming: true }]);
        }
        setMessages([...next, { role: "assistant", content: assistant }]);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setMessages([...next, { role: "assistant", content: assistant || "(stopped)" }]);
        } else {
          // Fall back to non-streaming once
          try {
            const res = await llmChat(selectedProvider, selectedModel, payload, systemPrompt());
            if (res.success && res.reply) setMessages([...next, { role: "assistant", content: res.reply }]);
            else setError(res.error || "Chat failed");
          } catch (e2) {
            setError(e2 instanceof Error ? e2.message : "Chat failed");
          }
        }
      } finally {
        setSending(false);
        abortRef.current = null;
      }
      return;
    }

    try {
      const res = await llmChat(selectedProvider, selectedModel, payload, systemPrompt());
      if (res.success && res.reply) setMessages([...next, { role: "assistant", content: res.reply }]);
      else setError(res.error || "Chat failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setSending(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const exportTxt = () => {
    const blob = new Blob([messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "disk-chat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div data-testid="chat-page" className="space-y-4 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-zinc-100">Chat</h2>

      <div
        className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
        data-testid="chat-controls"
      >
        <span
          className={`w-2 h-2 rounded-full ${providerOk ? "bg-green-500" : "bg-yellow-500"}`}
          title={providerOk ? "LLM reachable" : "No local LLM detected"}
        />
        <span className="text-sm text-zinc-300" data-testid="chat-provider-status">
          {probing
            ? "Probing..."
            : providerOk
              ? `${selectedProvider}${selectedModel ? ` / ${selectedModel}` : ""}`
              : "No local LLM — start Ollama or LM Studio"}
        </span>
        <select
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100"
          data-testid="personality-select"
          aria-label="Personality"
        >
          {Object.keys(PERSONALITIES).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-zinc-300">
          <input type="checkbox" checked={useStream} onChange={(e) => setUseStream(e.target.checked)} />
          Stream
        </label>
        <div className="flex-1" />
        <button
          onClick={exportTxt}
          disabled={messages.length === 0}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg text-sm"
          data-testid="chat-export"
        >
          <Download className="h-4 w-4 inline mr-1" />
          Export
        </button>
        <button
          onClick={clear}
          disabled={messages.length === 0}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg text-sm"
          data-testid="chat-clear"
        >
          <Eraser className="h-4 w-4 inline mr-1" />
          Clear
        </button>
      </div>

      {personality === "Custom" && (
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom personality instructions..."
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500"
          rows={2}
        />
      )}

      <div
        className="flex-1 overflow-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 min-h-[240px]"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-zinc-200 mb-1">Ask about your drives, duplicates, or snapshots.</p>
            <p className="text-sm text-zinc-400 mb-4">
              Answers come from your local LLM — nothing leaves this machine.
            </p>
            <div className="flex flex-wrap justify-center gap-2" data-testid="example-prompts">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => void send(ex)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-amber-600/20 text-amber-100" : "bg-zinc-800 text-zinc-100"}`}
          >
            {m.content}
            {m.streaming && <span className="animate-pulse">▍</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2" data-testid="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send(input)}
          placeholder="Ask about disk usage..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500"
          data-testid="chat-input"
        />
        {sending && useStream ? (
          <button
            onClick={stop}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => void send(input)}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-xl text-sm font-medium"
            data-testid="chat-send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
