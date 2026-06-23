/**
 * <SdkPlayground example="two-page-spread" /> — an interactive SDK demo.
 *
 * Server side, it assembles the named example to bytes (the SAME bytes the CI
 * gate validates), exactly like <ExampleEmbed>'s live slot. Client side,
 * <SdkPlaygroundClient> boots the published @paged-media/idml-viewer over those
 * bytes and exposes the real camera/navigation/layout API as a toolbar plus a
 * live events log. So the SDK pages are operable, not just readable.
 *
 * Multi-page examples (e.g. two-page-spread) best show page navigation.
 */
import { assembleExampleBase64 } from '@/lib/assemble-example';
import { SdkPlaygroundClient } from './sdk-playground-client';

export function SdkPlayground({ example = 'two-page-spread', height }: { example?: string; height?: number }) {
  let idmlBase64: string | undefined;
  try {
    idmlBase64 = assembleExampleBase64(example);
  } catch {
    idmlBase64 = undefined;
  }
  return <SdkPlaygroundClient idmlBase64={idmlBase64} height={height} />;
}
