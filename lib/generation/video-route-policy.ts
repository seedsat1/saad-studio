const BLOCKED_VIDEO_ROUTE_PATTERN = /(?:^|[\/_-])spicy(?:$|[\/_-])/i;

export const BLOCKED_VIDEO_ROUTE_CODE = "blocked_unsafe_video_route";

export class BlockedVideoRouteError extends Error {
  readonly code = BLOCKED_VIDEO_ROUTE_CODE;
  readonly status = 400;

  constructor() {
    super("This video model route is not available.");
    this.name = "BlockedVideoRouteError";
  }
}

export function isBlockedVideoRoute(route: unknown): boolean {
  return typeof route === "string" && BLOCKED_VIDEO_ROUTE_PATTERN.test(route.trim());
}

export function assertVideoRouteAllowed(route: unknown): asserts route is string {
  if (isBlockedVideoRoute(route)) {
    throw new BlockedVideoRouteError();
  }
}
