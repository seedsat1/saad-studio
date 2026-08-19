import { describe, it, expect } from "vitest";
import { isMp3Buffer, transcodeToMp3, validateAndNormalizeCloneAudio } from "@/lib/server/audio-transcode";
import { getRegistry, saveRegistry } from "@/lib/voice-registry";

describe("Audio Suite Hardening & MP3 Guarantee", () => {
  it("correctly identifies MP3 buffer vs non-MP3 buffer", () => {
    const fakeMp3Header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
    expect(isMp3Buffer(fakeMp3Header)).toBe(true);

    const fakeMpegSync = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
    expect(isMp3Buffer(fakeMpegSync)).toBe(true);

    const fakeWav = Buffer.from("RIFF1234WAVEfmt ");
    expect(isMp3Buffer(fakeWav)).toBe(false);
  });

  it("transcodes a generated PCM/WAV buffer to a valid MP3 buffer via FFmpeg", async () => {
    // Create a 0.1-second 44.1kHz sine-wave PCM WAV
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * 0.1);
    const pcm = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.floor(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 30000);
      pcm.writeInt16LE(sample, i * 2);
    }

    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    const wavBuffer = Buffer.concat([header, pcm]);
    expect(isMp3Buffer(wavBuffer)).toBe(false);

    const mp3Buffer = await transcodeToMp3(wavBuffer, { bitrate: "192k", sampleRate: 44100, channels: 2 });
    expect(mp3Buffer.length).toBeGreaterThan(0);
    expect(isMp3Buffer(mp3Buffer)).toBe(true);
  }, 25000);

  it("validates and normalizes audio for Voice Cloning", async () => {
    const pcm = Buffer.alloc(44100 * 0.2 * 2);
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(44100, 24);
    header.writeUInt32LE(44100 * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    const wavBuffer = Buffer.concat([header, pcm]);
    const res = await validateAndNormalizeCloneAudio(wavBuffer);
    expect(res.format).toBe("mp3");
    expect(res.buffer.length).toBeGreaterThan(0);
    expect(isMp3Buffer(res.buffer)).toBe(true);
  });

  it("supports deterministic persistent voice preview registry", () => {
    const reg = getRegistry();
    const testKey = "voice-preview:test:voice_123:en";
    reg[testKey] = "/api/media/audio/sample_test_voice_123_en.mp3";
    saveRegistry(reg);

    const readBack = getRegistry();
    expect(readBack[testKey]).toBe("/api/media/audio/sample_test_voice_123_en.mp3");
  });
});
