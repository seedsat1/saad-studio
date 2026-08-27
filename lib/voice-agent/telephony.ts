export type OutboundCallRequest = {
  taskId: string;
  userId: string;
  to: string;
  introScript: string;
  recordCall: boolean;
};

export type TelephonyCallResult = {
  provider: "mock";
  providerCallId: string;
  status: "completed";
  durationSec: number;
  transcript: Array<{ speaker: "agent" | "callee"; text: string; offsetSec: number }>;
};

export interface TelephonyProvider {
  startOutboundCall(input: OutboundCallRequest): Promise<TelephonyCallResult>;
  endCall(providerCallId: string): Promise<{ ended: true; providerCallId: string }>;
  transferToHuman(providerCallId: string): Promise<{ transferred: true; providerCallId: string }>;
}

export class MockTelephonyProvider implements TelephonyProvider {
  async startOutboundCall(input: OutboundCallRequest): Promise<TelephonyCallResult> {
    return {
      provider: "mock",
      providerCallId: `mock_${input.taskId}`,
      status: "completed",
      durationSec: 68,
      transcript: [
        { speaker: "agent", offsetSec: 0, text: input.introScript },
        { speaker: "callee", offsetSec: 12, text: "تم استلام الطلب. سأنتظر رسالة التأكيد داخل المنصة." },
        { speaker: "agent", offsetSec: 42, text: "شكراً لك. سأرسل ملخص المكالمة لصاحب المهمة الآن." },
      ],
    };
  }

  async endCall(providerCallId: string) {
    return { ended: true as const, providerCallId };
  }

  async transferToHuman(providerCallId: string) {
    return { transferred: true as const, providerCallId };
  }
}

export function createTelephonyProvider(): TelephonyProvider {
  return new MockTelephonyProvider();
}
