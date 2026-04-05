declare module 'fetch-to-node' {
  import type { IncomingMessage, ServerResponse } from 'node:http';

  /** Convert a web-standard Request into a Node.js IncomingMessage/ServerResponse pair. */
  export function toReqRes(request: Request): {
    req: IncomingMessage;
    res: ServerResponse;
  };

  /** Convert the populated Node.js ServerResponse back into a web-standard Response. */
  export function toFetchResponse(res: ServerResponse): Promise<Response>;
}
