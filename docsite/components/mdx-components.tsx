import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="doc-h1">{children}</h1>,
    h2: ({ children }) => <h2 className="doc-h2">{children}</h2>,
    h3: ({ children }) => <h3 className="doc-h3">{children}</h3>,
    pre: ({ children }) => <pre className="doc-pre">{children}</pre>,
    code: ({ children, className }) => (
      <code className={`doc-code ${className || ""}`}>{children}</code>
    ),
    table: ({ children }) => (
      <div className="doc-table-wrapper">
        <table className="doc-table">{children}</table>
      </div>
    ),
    a: ({ href, children }) => (
      <a href={href} className="doc-link">
        {children}
      </a>
    ),
    ...components,
  };
}
