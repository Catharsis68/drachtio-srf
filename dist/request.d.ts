import { EventEmitter } from 'events';
import SipMessage from './sip-parser/message';
import { SrfRequest } from './types';
import DrachtioAgent from './drachtio-agent';
declare class Request extends EventEmitter implements SrfRequest {
    msg: SipMessage;
    meta: any;
    _res: any;
    _agent: DrachtioAgent;
    source: 'network' | 'application';
    source_address: string;
    source_port: string;
    protocol: string;
    stackTime: string;
    stackTxnId: string;
    stackDialogId: string;
    server: any;
    receivedOn: string;
    socket: any;
    uri: string;
    _passport: any;
    session: any;
    auth: any;
    canceled: boolean;
    _dialogState: any;
    method: import("./types").SipMethod;
    branch: string;
    callId: string;
    from: string;
    to: string;
    sdp: string;
    srf: any;
    registration?: {
        type: "unregister" | "register";
        expires: number;
        contact: import("./types").AOR[];
        aor: string;
    } | undefined;
    callingName?: string | undefined;
    payload: object[];
    raw: string;
    calledNumber: string;
    callingNumber: string;
    type: "request" | "response";
    body: string;
    headers: import("./types").SipMessageHeaders;
    constructor(msg: SipMessage, meta: any);
    get res(): any;
    set res(res: any);
    get isNewInvite(): boolean;
    get url(): string;
    set agent(agent: DrachtioAgent);
    get agent(): DrachtioAgent;
    /**
   * Cancel a request that was sent by the application
   * @param {Object} [opts.headers] optional headers to attach to the CANCEL request
   * @param  {Request~cancelCallback} callback - invoked with cancel operation completes
   */
    cancel(opts?: any, callback?: (err: Error, req: SrfRequest) => void): void;
    /**
    * This callback is invoked when the application has sent a CANCEL for a request.
    * @callback Request~cancelCallback
    * @param {Error} err - if an error occurred while attempting to send the cancel
    * @param {Request} req - the cancel request that was sent
    */
    /**
    * Proxy an incoming request
    * @param  {Request~proxyOptions} opts - options governing the proxy operation
    * @param  {Request~proxyCallback} [callback] - callback invoked when proxy operation completes
    * @returns {Promise|Request} returns a Promise if not callback is supplied, otherwise the Request object
    */
    proxy(opts: any, callback?: (err: Error | null, results?: any) => void): Promise<any> | this;
    /**
    * Options governing a proxy operation
    * @typedef {Object} Request~proxyOptions
    * @property {string|Array} destination - an ordered list of one or more SIP URIs to proxy the request to
    * @property {boolean} [remainInDialog=false] - if true add a Record-Route header and emain in the SIP dialog
    * after the INVITE transaction.
    * @property {boolean} [followRedirects=false] - if true respond to 3XX redirect responses by generating
    * a new INVITE to the SIP URI in the Contact header of the response
    * @property {string} [forking=sequential] - 'simultaneous' or 'sequential'; dicates whether the proxy waits
    * for a failure response from one target before trying the next, or forks the request to all targets simultaneously
    * @property {string} [provisionalTimeout] - amount of time to wait for a 100 Trying response from a target before
    * trying the next target; valid syntax is '2s' or '1500ms' for example
    * @property {string} [finalTimeout] - amount of time to wait for a final response from a target before trying
    * the next target; syntax is as described above for provisionalTimeout
    */
    /**
    * This callback is invoked when proxy operation has completed.
    * @callback Request~proxyCallback
    * @param {Error} err - if an error occurred while attempting to proxy the request
    * @param {Request~proxyResults} results - results summarizing the proxy operation
    */
    logIn(user: any, options: any, done: (err?: Error) => void): void;
    logOut(): void;
    isAuthenticated(): boolean;
    isUnauthenticated(): boolean;
    get(name: string): string;
    has(name: string): boolean;
    getHeaderName(name: string): string | undefined;
    getParsedHeader(name: string): any;
    set(name: string, value: string): void;
}
export default Request;
/**
 * response event triggered when a Request sent by the application receives a response from the network
 * @event Endpoint#destroy
 * @param {Response} res - SIP response received as a result of sending a SIP request
 */
