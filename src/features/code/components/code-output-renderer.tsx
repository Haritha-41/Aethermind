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
    <div className="my-4 overflow-hidden rounded-[14px] border border-[#E6E6E1] shadow-[0_6px_20px_-14px_rgba(20,20,18,0.2)]">
      <div className="flex items-center justify-between border-b border-[#ECECE8] bg-[#F7F7F4] px-[14px] py-[10px]">
        <div className="flex items-center gap-2">
          <span className="h-[11px] w-[11px] rounded-full bg-[#F0625C]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#F5BE4F]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#5BC264]" />
          <span className="ml-2 font-mono text-[12px] font-semibold text-[#8C8C84]">{languageLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex items-center gap-[6px] rounded-lg border border-[#E6E6E1] bg-white px-[10px] py-[5px] text-[12px] font-semibold text-[#6E6E68] hover:bg-[#F6F6F3]"
          aria-label="Copy code block"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
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
          background: "#1C1C1A",
          fontSize: "0.8rem",
          lineHeight: "1.7",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mt-2 text-base font-semibold text-[#1B1B18]">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-2 text-base font-semibold text-[#1B1B18]">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 text-sm font-semibold text-[#1B1B18]">{children}</h4>,
  p: ({ children }) => <p className="text-[14px] leading-relaxed text-[#2A2A26]">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-[14px] text-[#2A2A26]">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-[14px] text-[#2A2A26]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-[#E6E6E1] pl-3 text-[14px] text-[#6E6E68]">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-[#ECECE8]" />,
  table: ({ children }) => (
    <div className="my-4 overflow-auto rounded-lg border border-[#ECECE8]">
      <table className="w-full border-collapse text-[14px] text-[#2A2A26]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[#ECECE8] bg-[#FBFBF9] px-3 py-2 text-left font-semibold text-[#1B1B18]">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-[#F1F1ED] px-3 py-2 align-top">{children}</td>,
  code: ({ className, children }) => {
    const match = /language-([a-zA-Z0-9_-]+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");
    const isInline = !match && !code.includes("\n");

    if (isInline) {
      return (
        <code className="rounded bg-[#F1F1ED] px-1.5 py-0.5 font-mono text-[0.8em] text-[#0E9F77]">
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
