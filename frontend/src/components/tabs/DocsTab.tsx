import readmeContent from '@/docs/README.md?raw';

export function DocsTab() {
  return (
    <div className="rounded-lg bg-level-2 border border-level-3 p-4 max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-semibold text-accent mb-4">Documentation</h2>
      <article className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-level-5">
          {readmeContent}
        </pre>
      </article>
    </div>
  );
}


