"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

type CodeOutputRendererProps = {
  content: string;
};

type CodeBlockProps = {
  code: string;
  language?: string;
};

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const languageLabel = language && language.length > 0 ? language : "code";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[#2d313a] bg-[#111215]">
      <div className="flex items-center justify-between border-b border-[#2d313a] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {languageLabel}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-md border border-[#2d313a] bg-[#18191e] px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-[#14b8a6] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]/70"
          aria-label="Copy code block"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        wrapLongLines
        showLineNumbers
        customStyle={{
          margin: 0,
          padding: "14px 16px",
          borderRadius: 0,
          background: "#0b0f19",
          fontSize: "0.8rem",
          lineHeight: "1.65",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mt-2 text-base font-semibold text-slate-100">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-2 text-base font-semibold text-slate-100">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 text-sm font-semibold text-slate-100">{children}</h4>,
  p: ({ children }) => <p className="text-sm leading-relaxed text-slate-200">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-sm text-slate-200">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-200">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-[#2d313a] pl-3 text-sm text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[#2d313a]" />,
  table: ({ children }) => (
    <div className="my-4 overflow-auto rounded-lg border border-[#2d313a]">
      <table className="w-full border-collapse text-sm text-slate-200">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[#2d313a] bg-[#111215] px-3 py-2 text-left font-semibold text-slate-100">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-[#24262d] px-3 py-2 align-top">{children}</td>,
  code: ({ className, children }) => {
    const match = /language-([a-zA-Z0-9_-]+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");
    const isInline = !match && !code.includes("\n");

    if (isInline) {
      return (
        <code className="rounded bg-[#111215] px-1.5 py-0.5 font-mono text-[0.8em] text-[#8de6b6]">
          {children}
        </code>
      );
    }

    return <CodeBlock code={code} language={match?.[1]} />;
  },
};

export function CodeOutputRenderer({ content }: CodeOutputRendererProps) {
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
