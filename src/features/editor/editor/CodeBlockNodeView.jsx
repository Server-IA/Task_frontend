import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { CopyButton } from '../components/MarkdownView'

/**
 * Bloque de código en el editor: como en la lectura, con el lenguaje (editable) y «Copiar» arriba.
 * @param {import('@tiptap/react').ReactNodeViewProps} props
 */
export function CodeBlockNodeView({ node, updateAttributes, editor }) {
  return (
    <NodeViewWrapper as="figure" className="tf-md-code">
      <figcaption contentEditable={false} className="flex items-center justify-between gap-2 border-b py-1 pr-2 pl-3">
        <input
          value={node.attrs.language ?? ''}
          onChange={(event) => updateAttributes({ language: event.target.value.replace(/\s/g, '').slice(0, 20) || null })}
          placeholder="lenguaje"
          aria-label="Lenguaje del código"
          disabled={!editor.isEditable}
          className="w-28 bg-transparent font-mono text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <CopyButton text={node.textContent} />
      </figcaption>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
