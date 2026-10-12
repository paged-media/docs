import defaultComponents from 'fumadocs-ui/mdx';
import type { ComponentProps } from 'react';
import { resolveHref } from '@/lib/site';
import type { MDXComponents } from 'mdx/types';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { DifficultyLabel } from './difficulty-label';
import { ExampleEmbed } from './example-embed';
import { SupportBadge } from './support-badge';
import { StageRow } from './stage-row';
import { Fact } from './fact';
import { CapabilityMatrix } from './capability-matrix';
import { ConformanceTable } from './conformance-table';
import { StatusHeadline } from './status-headline';
import { ScriptingCatalog } from './scripting-catalog';
import { CliReference } from './cli-reference';
import { SdkCatalog } from './sdk-catalog';
import { SdkPlayground } from './sdk-playground';
import { IdmlInspector } from './idml-inspector';
import { ScriptingPlayground } from './scripting-playground';
import { FunctionPlayground } from './function-playground';
import { PathShowcase } from './path-showcase';
import { PathReference } from './path-reference';
import { ApiReferenceIndex } from './api-reference-index';
import { SurfaceReach } from './surface-reach';
import { PluginCapabilities } from './plugin-capabilities';
import { RestApiReference } from './rest-api-reference';
import { ActivityFeed, RepoActivity } from './activity-feed';
import { LiveDemo } from './live-demo';
import { AttrTable } from './attr-table';
import { ElementReference, ElementIndex } from './element-reference';
import { Callout, Note } from './callout';
import { GutenbergAside } from './gutenberg-aside';
import { RelatedAcrossPillars } from './related-across-pillars';
import { XRef } from './xref';
import { ComparisonMatrix, ComparisonVerdicts, ComparisonMethodology, CompareSnapshot } from './comparison-matrix';
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
  const A = defaultComponents.a;
  return {
    ...defaultComponents,
    // Markdown links are written site-neutral (`/docs/idml/…`); resolve them
    // for this build (lib/site.ts).
    a: ({ href, ...props }: ComponentProps<'a'>) => <A href={href ? resolveHref(href) : href} {...props} />,
    RawView,
    AnnotatedView,
    TreeView,
    DifficultyLabel,
    ExampleEmbed,
    SupportBadge,
    StageRow,
    Fact,
    CapabilityMatrix,
    ConformanceTable,
    StatusHeadline,
    ScriptingCatalog,
    CliReference,
    SdkCatalog,
    SdkPlayground,
    IdmlInspector,
    ScriptingPlayground,
    FunctionPlayground,
    PathShowcase,
    PathReference,
    ApiReferenceIndex,
    SurfaceReach,
    PluginCapabilities,
    RestApiReference,
    ActivityFeed,
    RepoActivity,
    LiveDemo,
    AttrTable,
    ElementReference,
    ElementIndex,
    // Brand Note replaces the Fumadocs Callout (and is also exposed as <Note>).
    Callout,
    Note,
    GutenbergAside,
    RelatedAcrossPillars,
    XRef,
    ComparisonMatrix,
    CompareSnapshot,
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
