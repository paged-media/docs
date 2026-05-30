import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { DifficultyLabel } from './difficulty-label';
import { ExampleEmbed } from './example-embed';
import { SupportBadge } from './support-badge';
import { AttrTable } from './attr-table';
import { PackageGraph, CoordinateSpace, StyleCascade, StoryThreading } from '@/components/diagrams';

/**
 * Custom components available in every MDX page. `ExampleEmbed` is the one
 * authors reach for most; the individual views are exposed too for one-off use.
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
    PackageGraph,
    CoordinateSpace,
    StyleCascade,
    StoryThreading,
    ...extra,
  };
}
