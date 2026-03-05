import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import readmeContent from '@/docs/README.md?raw';

export function DocsTab() {
  return (
    <div className="rounded-lg bg-level-2 border border-level-3 p-4 max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-semibold text-accent mb-4">Documentation</h2>
      <article className="prose prose-sm max-w-none prose-headings:text-level-5 prose-p:text-level-5 prose-li:text-level-5 prose-code:text-xs prose-code:bg-level-1 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {readmeContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}

