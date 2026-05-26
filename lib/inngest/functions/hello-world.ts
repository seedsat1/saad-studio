import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    triggers: [{ event: "test/hello.world" }],
  },
  async ({ event, step }) => {
    const greeted = await step.run("compose-greeting", async () => {
      return `Hello, ${event.data?.name ?? "world"}!`;
    });

    await step.sleep("wait-a-moment", "2s");

    return {
      message: greeted,
      receivedAt: new Date().toISOString(),
      eventId: event.id,
    };
  },
);
