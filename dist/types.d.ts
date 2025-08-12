import { Socket } from 'net';
import { EventEmitter } from 'events';
export type SipMethod = 'ACK' | 'BYE' | 'CANCEL' | 'INFO' | 'INVITE' | 'MESSAGE' | 'NOTIFY' | 'OPTIONS' | 'PRACK' | 'PUBLISH' | 'REFER' | 'REGISTER' | 'SUBSCRIBE' | 'UPDATE';
export type SipMessageHeaders = Record<string, string>;
export type AOR = {
    name: string;
    uri: string;
    params?: Record<string, any>;
};
export type Via = {
    version: string;
    protocol: string;
    host: string;
    port: string;
};
export interface SrfConfig {
    apiSecret?: string;
    host?: string;
    port?: number;
    secret?: string;
    tags?: string[];
}
export interface ParseUriResult {
    family?: 'ipv6' | 'ipv4';
    scheme: 'sip' | 'sips' | 'tel';
    user?: string;
    password?: string;
    host?: string;
    port?: string;
    params: Record<string, string | null>;
    headers: Record<string, string>;
    context?: string;
}
export interface SipMessage {
    type: "request" | "response";
    body: string;
    payload: object[];
    source: "network" | "application";
    source_address: string;
    source_port: string;
    protocol: string;
    stackTime: string;
    calledNumber: string;
    callingNumber: string;
    raw: string;
    get(name: string): string;
    has(name: string): boolean;
    set(name: string, value: string): void;
    getParsedHeader(name: "contact" | "Contact"): Array<AOR>;
    getParsedHeader(name: "via" | "Via"): Array<Via>;
    getParsedHeader(name: "To" | "to" | "From" | "from" | "refer-to" | "referred-by" | "p-asserted-identity" | "remote-party-id"): AOR;
    getParsedHeader(name: string): any;
}
export interface SrfRequest extends SipMessage {
    method: SipMethod;
    readonly isNewInvite: boolean;
    stackDialogId?: string;
    canceled: boolean;
    _dialogState: any;
    cancel(opts?: {
        headers?: Record<string, string>;
    }, callback?: (err: any, req: SrfRequest) => void): void;
    on(event: 'response', callback: (res: SrfResponse, ack: (opts?: {
        body: string;
    }) => void) => void): this;
    on(event: 'cancel', callback: (res: SrfRequest) => void): this;
    on(event: 'update', callback: (req: SrfRequest, res: SrfResponse) => void): this;
    proxy(opts: ProxyRequestOptions, callback: (err: any, results: any) => void): void;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    auth: any;
    stackTxnId: string;
    branch: string;
    callId: string;
    from: string;
    headers: Record<string, string>;
    msg: any;
    sdp: string;
    srf: any;
    to: string;
    uri: string;
    registration?: {
        type: "unregister" | "register";
        expires: number;
        contact: Array<AOR>;
        aor: string;
    };
    getHeaderName(hdr: string): string | undefined;
    get(name: string): string;
    socket: Socket;
    callingName?: string;
}
export interface ProxyRequestOptions {
    forking?: 'sequential' | 'simultaneous';
    remainInDialog?: boolean;
    recordRoute?: boolean;
    provisionalTimeout?: string;
    finalTimeout?: string;
    followRedirects?: boolean;
    destination?: string | string[];
}
export interface SrfResponse extends SipMessage {
    srf: any;
    headers: SipMessageHeaders;
    status: number;
    statusCode: number;
    reason: string;
    finalResponseSent: boolean;
    req: SrfRequest;
    agent: any;
    socket: any;
    send(status: number, opts?: object, cb?: () => void): void;
    send(status: number, reason?: string, opts?: object, cb?: () => void): void;
    send(status: number, reason?: string, opts?: object, cb?: (err: any, msg: SipMessage) => void): void;
    end(): void;
    get(name: string): string;
    getHeaderName(hdr: string): string | undefined;
}
export interface SrfDialog extends EventEmitter {
    id: string;
    dialogType: 'uac' | 'uas';
    sip: {
        callId: string;
        localTag: string;
        remoteTag: string;
    };
    onHold: boolean;
    other: SrfDialog;
    type: "uac" | "uas";
    local: {
        uri: string;
        sdp: string;
    };
    remote: {
        uri: string;
        sdp: string;
    };
    req: SrfRequest;
    res: SrfResponse;
    sent: SrfResponse;
    stateEmitter: any;
    queueRequests: boolean;
    destroy(opts?: {
        headers: Record<string, string>;
    }, callback?: (err: any, msg: SrfRequest) => void): Promise<void>;
    modify(sdp: string, opts?: {
        noAck: boolean;
    }): Promise<string>;
    modify(opts: {
        noAck: boolean;
    }): Promise<string>;
    modify(sdp: string, opts?: {
        noAck: boolean;
    }, callback?: (err: any, msg: SrfResponse) => void): void;
    modify(opts: {
        noAck: boolean;
    }, callback?: (err: any, resp?: string, resAck?: (sdp: string) => void) => void): void;
    on(messageType: "ack", callback: (msg: SrfRequest) => void): this;
    on(messageType: "destroy", callback: (msg: SrfRequest) => void): this;
    on(messageType: "info", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "message", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "modify", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "notify", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "options", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "refer", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "refresh", callback: (msg: SrfRequest) => void): this;
    on(messageType: "update", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    on(messageType: "modify", callback: (req: SrfRequest, res: SrfResponse) => void): this;
    once(messageType: string, callback: (msg: any) => void): this;
    listeners(messageType: string): any[];
    request(opts?: SrfRequest): Promise<SrfResponse>;
    request(opts: SrfRequest, callback?: (err: any, msg: SrfResponse) => void): void;
    handle(req: SrfRequest, res: SrfResponse, next: () => void): void;
}
export interface CreateUASOptions {
    localSdp?: string | ((sdp?: string) => string | Promise<string>);
    headers?: SipMessageHeaders;
    body?: string | ((sdp?: string) => string | Promise<string>);
    dialogStateEmitter?: EventEmitter;
}
export interface CreateUACOptions {
    headers?: SipMessageHeaders;
    uri?: string;
    noAck?: boolean;
    localSdp?: string;
    proxy?: string;
    auth?: {
        username: string;
        password: string;
    };
    method?: SipMethod;
    callingNumber?: string;
    callingName?: string;
    calledNumber?: string;
    followRedirects?: boolean;
    keepUriOnRedirect?: boolean;
    dialogStateEmitter?: EventEmitter;
    _socket?: Socket;
    cbRequest?: (req: SrfRequest) => void;
    cbProvisional?: (res: SrfResponse) => void;
}
export interface CreateB2BUAOptions {
    headers?: SipMessageHeaders;
    responseHeaders?: SipMessageHeaders | ((uacRes: SipMessageHeaders, headers: SipMessageHeaders) => SipMessageHeaders | null);
    localSdpA?: string | ((sdp: string, res: SrfResponse) => string | Promise<string>);
    localSdpB?: string | ((sdp: string, res?: SrfResponse) => string | Promise<string>);
    proxyRequestHeaders?: string[];
    proxyResponseHeaders?: string[];
    passFailure?: boolean;
    passProvisionalResponses?: boolean;
    proxy?: string;
    auth?: {
        username: string;
        password: string;
    };
    uri?: string;
    noAck?: boolean;
    localSdp?: string;
    dialogStateEmitter?: EventEmitter;
    _socket?: Socket;
    method?: SipMethod;
    callingNumber?: string;
    callingName?: string;
    calledNumber?: string;
}
export interface ConnectApp extends EventEmitter {
    (req: SrfRequest, res: SrfResponse, next: () => void): void;
    method: string;
    stack: any[];
    params: Record<string, any>;
    _cachedEvents: any[];
    routedMethods: Record<string, boolean>;
    locals: Record<string, any>;
    client?: any;
    handle: (req: SrfRequest, res: SrfResponse, next: () => void) => void;
    use: (...args: any[]) => void;
    on: (event: string, listener: (...args: any[]) => void) => this;
    [key: string]: any;
}
