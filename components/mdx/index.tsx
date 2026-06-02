import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { DifficultyLabel } from './difficulty-label';
import { ExampleEmbed } from './example-embed';
import { SupportBadge } from './support-badge';
import { AttrTable } from './attr-table';
import { Callout, Note } from './callout';
import { GutenbergAside } from './gutenberg-aside';
import { PackageGraph, CoordinateSpace, StyleCascade, StoryThreading } from '@/components/diagrams';

/**
 * Custom components available in every MDX page. `ExampleEmbed` is the one
 * authors reach for most; the individual views are exposed too for one-off use.
 * `DynamicCodeBlock` highlights arbitrary `code`/`lang` with Shiki at runtime —
 * for snippets whose content isn't known at authoring time (the static fenced
 * code blocks keep using build-time Shiki via rehype).
 */
export function getMDXComponents(extra?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    RawView,
    AnnotatedView,
    TreeView,
    DifficultyLabel,
    ExampleEmbed,
    SupportBadge,
    AttrTable,
    // Brand Note replaces the Fumadocs Callout (and is also exposed as <Note>).
    Callout,
    Note,
    GutenbergAside,
    PackageGraph,
    CoordinateSpace,
    StyleCascade,
    StoryThreading,
    DynamicCodeBlock,
    ...extra,
  };
}
