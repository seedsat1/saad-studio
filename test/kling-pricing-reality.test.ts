import { describe, it, expect } from 'vitest';
import { getVideoCreditsByRoute } from '@/lib/credit-pricing';
import { getGenerationCostSync } from '@/lib/pricing';
import { DEFAULT_MODELS } from '@/lib/pricing-models';
import { resolveCanonicalProviderTariff } from '@/lib/provider-tariff-registry';

describe('Kling 3.0 & Turbo Pricing Reality & Margin Contract', () => {
  it('1. verifies Kling 3.0 Standard pricing matches WaveSpeed Silver rate with 40% margin', () => {
    // WaveSpeed Silver rate: $0.399 / 5s = $0.0798/s
    // Credits per second: $0.0798 * 56 = 4.47 cr/s
    // 5s: 22.35 cr (approx 22.4 cr)
    // 10s: 44.7 cr
    const cost5s = getGenerationCostSync('kling-3.0/video', 5, 1, 'std');
    expect(cost5s).toBe(22.35);

    const cost10s = getGenerationCostSync('kling-3.0/video', 10, 1, 'std');
    expect(cost10s).toBe(44.7);

    // Verify credit-pricing fallback matches
    const credit5s = getVideoCreditsByRoute('kwaivgi/kling-v3.0-std/image-to-video', { duration: 5 });
    expect(credit5s).toBe(22.35);
  });

  it('2. verifies Kling 3.0 Pro pricing matches WaveSpeed Pro rate ($0.1064/s * 56 = 5.96 cr/s)', () => {
    // 5s Pro: $0.532 * 56 = 29.792 -> 29.8 cr
    const cost5sPro = getGenerationCostSync('kling-3.0/video', 5, 1, 'pro');
    expect(cost5sPro).toBe(29.8);

    const cost10sPro = getGenerationCostSync('kling-3.0/video', 10, 1, 'pro');
    expect(cost10sPro).toBe(59.6);

    const credit5sPro = getVideoCreditsByRoute('kwaivgi/kling-v3.0-pro/image-to-video', { duration: 5, quality: 'pro' });
    expect(credit5sPro).toBe(29.8);
  });

  it('3. verifies Kling 3.0 4K pricing matches WaveSpeed 4K rate (5.0x multiplier)', () => {
    // 5s 4K: 22.35 * 5 = 111.75 cr
    const cost5s4k = getGenerationCostSync('kling-3.0/video', 5, 1, '4k');
    expect(cost5s4k).toBe(111.75);

    const credit5s4k = getVideoCreditsByRoute('kwaivgi/kling-v3.0-std/image-to-video', { duration: 5, quality: '4k' });
    expect(credit5s4k).toBe(111.75);
  });

  it('4. verifies Kling Motion Control pricing matches WaveSpeed MC rates', () => {
    // Pro: $0.1596/s * 56 = 8.94 cr/s -> 5s = 44.7 cr
    const cost5sPro = getGenerationCostSync('kling-3.0/motion-control', 5, 1, 'pro');
    expect(cost5sPro).toBe(44.7);

    // Std: $0.1197/s * 56 = 6.70 cr/s -> 5s = 33.5 cr
    const cost5sStd = getGenerationCostSync('kling-3.0/motion-control', 5, 1, 'std');
    expect(cost5sStd).toBe(33.5);
  });

  it('5. verifies Kling V3 Turbo pricing matches WaveSpeed Turbo rates', () => {
    // Std: $0.02128/s * 56 = 1.19 cr/s -> 5s = 5.95 cr (approx 6.0 cr)
    const cost5sTurbo = getGenerationCostSync('kling_v3_turbo', 5, 1);
    expect(cost5sTurbo).toBe(5.95);

    const creditTurboStd = getVideoCreditsByRoute('kwaivgi/kling-v3-turbo-std/image-to-video', { duration: 5 });
    expect(creditTurboStd).toBe(5.95);

    // Pro: $0.0266/s * 56 = 1.49 cr/s -> 5s = 7.45 cr
    const creditTurboPro = getVideoCreditsByRoute('kwaivgi/kling-v3-turbo-pro/image-to-video', { duration: 5 });
    expect(creditTurboPro).toBe(7.45);
  });

  it('6. verifies WaveSpeed provider operating cost tariff estimation for Kling 3.0', () => {
    const wsTariff = resolveCanonicalProviderTariff({
      modelRef: 'kwaivgi/kling-v3.0-std/image-to-video',
      providerName: 'WaveSpeed',
      durationSec: 5,
    });

    expect(wsTariff.source).toBe('estimated');
    expect(wsTariff.providerName).toBe('WaveSpeed');
    expect(wsTariff.usd).toBe(0.399); // Exactly matches the user invoice screenshot!
    expect(wsTariff.provenance?.verificationStatus).toBe('VERIFIED_CURRENT');
  });

  it('7. verifies PricingConstitution DEFAULT_MODELS holds exact WaveSpeed rates', () => {
    const kling30 = DEFAULT_MODELS.find(m => m.id === 'kling30');
    expect(kling30).toBeDefined();
    expect(kling30?.provider).toBe('wavespeed');
    expect(kling30?.waveUsd).toBe(0.0798);
    expect(kling30?.userCreditsRate).toBe(4.47);
    expect(kling30?.kieCredits).toBe(14.0);
  });
});
