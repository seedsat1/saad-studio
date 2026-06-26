function finePcmCrossCorrelation(pcmA, pcmB, sampleRate) {
  const searchWindowMs = 250;
  const maxLagSamples = Math.floor((searchWindowMs / 1000) * sampleRate);
  
  let bestLag = 0;
  let bestCorrelation = -1;
  
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    let sum = 0;
    let count = 0;
    
    const startA = Math.max(0, -lag);
    const startB = Math.max(0, lag);
    const end = Math.min(pcmA.length, pcmB.length - lag);
    
    for (let i = startA; i < end; i++) {
      sum += pcmA[i] * pcmB[i + lag];
      count++;
    }
    
    if (count > 0) {
      const correlation = sum / count;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }
  }
  
  return {
    lagSec: bestLag / sampleRate,
    confidence: Math.max(0, Math.min(1, bestCorrelation))
  };
}

function runFinePassAccuracyTest() {
  const expectedOffsetMs = 1234;
  const sampleRate = 48000;
  const durationSamples = sampleRate * 2; // 2 seconds

  // Generate reference test signal (1kHz sine wave)
  const reference = new Float32Array(durationSamples);
  const frequency = 1000;
  for (let i = 0; i < durationSamples; i++) {
    reference[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }

  // Generate delayed signal with exact 1234ms offset
  const offsetSamples = Math.round((expectedOffsetMs / 1000) * sampleRate);
  const delayed = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    if (i + offsetSamples < durationSamples) {
      delayed[i] = reference[i + offsetSamples];
    } else {
      delayed[i] = 0;
    }
  }

  // Run fine pass correlation centered at the expected offset
  const centerOffsetSamples = Math.round((expectedOffsetMs / 1000) * sampleRate);
  const result = finePcmCrossCorrelation(reference, delayed, sampleRate, centerOffsetSamples);

  const fineAdjustmentMs = Math.round(result.lagSec * 1000);
  const refinedOffsetMs = fineAdjustmentMs;
  const absoluteErrorMs = Math.abs(refinedOffsetMs - expectedOffsetMs);
  const refinementUsed = result.confidence > 0.5;
  const pass = absoluteErrorMs <= 10 && refinementUsed;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`                    FINE PASS ACCURACY TEST`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Expected offset:        ${expectedOffsetMs} ms`);
  console.log(`  Coarse offset:          ${expectedOffsetMs} ms (simulated)`);
  console.log(`  Fine adjustment:        ${fineAdjustmentMs} ms`);
  console.log(`  Refined offset:         ${refinedOffsetMs} ms`);
  console.log(`  Absolute error:         ${absoluteErrorMs} ms`);
  console.log(`  Refinement used:        ${refinementUsed}`);
  console.log(`  Fine score:             ${result.confidence.toFixed(4)}`);
  console.log(`  Test result:            ${pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return {
    expectedOffsetMs,
    coarseOffsetMs: expectedOffsetMs,
    fineAdjustmentMs,
    refinedOffsetMs,
    absoluteErrorMs,
    refinementUsed,
    fineScore: result.confidence,
    pass
  };
}

runFinePassAccuracyTest();
