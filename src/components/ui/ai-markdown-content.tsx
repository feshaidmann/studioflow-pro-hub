import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface AIMarkdownContentProps {
  content: string;
  className?: string;
}

export function AIMarkdownContent({ content, className }: AIMarkdownContentProps) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 pl-4 list-disc last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-0.5">{children}</li>,
          h1: ({ children }) => <h1 className="font-semibold text-base mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="font-semibold text-sm mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="font-semibold text-xs mb-1">{children}</h4>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) {
              return (
                <code className={cn("block bg-secondary/40 p-2 rounded-md text-[11px] font-mono overflow-x-auto my-2", codeClass)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-secondary/60 px-1 rounded text-[11px] font-mono" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-2 last:mb-0 overflow-x-auto">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground mb-2 last:mb-0">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/50 font-semibold text-left">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
