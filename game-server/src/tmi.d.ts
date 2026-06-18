declare module "tmi.js" {
  import { EventEmitter } from "node:events";

  export interface ChatUserstate {
    "display-name"?: string;
    username?: string;
    mod?: boolean;
    badges?: Record<string, string>;
  }

  export interface ClientOptions {
    options?: { debug?: boolean };
    connection?: { secure?: boolean; reconnect?: boolean };
    identity?: { username: string; password: string };
    channels?: string[];
  }

  export class Client extends EventEmitter {
    constructor(opts: ClientOptions);
    connect(): Promise<[string, number]>;
    disconnect(): void;
    on(event: "connected", listener: () => void): this;
    on(
      event: "message",
      listener: (
        channel: string,
        tags: ChatUserstate,
        message: string,
        self: boolean,
      ) => void,
    ): this;
    on(event: "disconnected", listener: (reason: string) => void): this;
  }
}
