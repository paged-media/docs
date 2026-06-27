import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { DifficultyLabel } from './difficulty-label';
import { ExampleEmbed } from './example-embed';
import { SupportBadge } from './support-badge';
import { StageRow } from './stage-row';
import { CapabilityMatrix } from './capability-matrix';
import { ConformanceTable } from './conformance-table';
import { StatusHeadline } from './status-headline';
import { ScriptingCatalog } from './scripting-catalog';
import { SdkCatalog } from './sdk-catalog';
import { SdkPlayground } from './sdk-playground';
import { ScriptingPlayground } from './scripting-playground';
import { FunctionPlayground } from './function-playground';
import { PathShowcase } from './path-showcase';
import { PathReference } from './path-reference';
import { ApiReferenceIndex } from './api-reference-index';
import { PluginCapabilities } from './plugin-capabilities';
import { RestApiReference } from './rest-api-reference';
import { ActivityFeed, RepoActivity } from './activity-feed';
import { Demo } from './demo';
import { LiveDemo } from './live-demo';
import { AttrTable } from './attr-table';
import { Callout, Note } from './callout';
import { GutenbergAside } from './gutenberg-aside';
import { RelatedAcrossPillars } from './related-across-pillars';
import { XRef } from './xref';
import { ComparisonMatrix, ComparisonVerdicts, ComparisonMethodology } from './comparison-matrix';
import { SoftwareApplicationLd } from './software-application-ld';
import { PackageGraph, CoordinateSpace, StyleCascade, StoryThreading } from '@/components/diagrams';
import { InteractiveFigure, ScriptingExecutionModel, RenderPipeline } from '@/components/diagrams/interactive';

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
    StageRow,
    CapabilityMatrix,
    ConformanceTable,
    StatusHeadline,
    ScriptingCatalog,
    SdkCatalog,
    SdkPlayground,
    ScriptingPlayground,
    FunctionPlayground,
    PathShowcase,
    PathReference,
    ApiReferenceIndex,
    PluginCapabilities,
    RestApiReference,
    ActivityFeed,
    RepoActivity,
    Demo,
    LiveDemo,
    AttrTable,
    // Brand Note replaces the Fumadocs Callout (and is also exposed as <Note>).
    Callout,
    Note,
    GutenbergAside,
    RelatedAcrossPillars,
    XRef,
    ComparisonMatrix,
    ComparisonVerdicts,
    ComparisonMethodology,
    SoftwareApplicationLd,
    PackageGraph,
    CoordinateSpace,
    StyleCascade,
    StoryThreading,
    InteractiveFigure,
    ScriptingExecutionModel,
    RenderPipeline,
    DynamicCodeBlock,
    ...extra,
  };
}
