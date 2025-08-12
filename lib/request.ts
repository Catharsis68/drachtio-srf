import { EventEmitter } from 'events';
import delegate from 'delegates';
import assert from 'assert';
import { noop } from 'node-noop';
import Debug from 'debug';
const debug = Debug('drachtio:request');
import SipMessage from './sip-parser/message';
import { SrfRequest, SrfResponse } from './types';
import DrachtioAgent from './drachtio-agent';

class Request extends EventEmitter implements SrfRequest {
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
  registration?: { type: "unregister" | "register"; expires: number; contact: import("./types").AOR[]; aor: string; } | undefined;
  callingName?: string | undefined;
  payload: object[];
  raw: string;
  calledNumber: string;
  callingNumber: string;
  type: "request" | "response";
  body: string;
  headers: import("./types").SipMessageHeaders;

  constructor(msg: SipMessage, meta: any) {
    super();
    this.msg = msg;
    this.meta = meta;
    this._res = undefined;
    this._agent = undefined as any;
    this.source = undefined as any;
    this.source_address = '';
    this.source_port = '5060';
    this.protocol = '';
    this.stackTime = '';
    this.stackTxnId = '';
    this.stackDialogId = '';
    this.server = undefined;
    this.receivedOn = '';
    this.socket = undefined;
    this.uri = '';
    this._passport = undefined;
    this.session = undefined;
    this.canceled = false;
    this._dialogState = {};
    this.method = '' as any;
    this.branch = '';
    this.callId = '';
    this.from = '';
    this.to = '';
    this.sdp = '';
    this.srf = undefined;
    this.payload = [];
    this.raw = '';
    this.calledNumber = '';
    this.callingNumber = '';
    this.type = 'request';
    this.body = '';
    this.headers = {};

    if (msg) {
      assert(msg instanceof SipMessage);
      this.msg = msg;
      this.meta = meta;
    }
  }

  get res(): any {
    return this._res;
  }
  set res(res: any) {
    this._res = res;
  }

  get isNewInvite(): boolean {
    const to = (this as any).getParsedHeader('to');
    return (this as any).method === 'INVITE' && !('tag' in to.params);
  }

  get url(): string {
    return this.uri;
  }

  set agent(agent: DrachtioAgent) {
    this._agent = agent;
  }
  get agent(): DrachtioAgent {
    return this._agent;
  }

  /**
 * Cancel a request that was sent by the application
 * @param {Object} [opts.headers] optional headers to attach to the CANCEL request
 * @param  {Request~cancelCallback} callback - invoked with cancel operation completes
 */
  cancel(opts?: any, callback?: (err: Error, req: SrfRequest) => void): void {
    opts = opts || {};
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    if (!this._agent || this.source !== 'application') {
      throw new Error('Request#cancel can only be used for uac Request');
    }
    this._agent.request(
      this.socket,
      this.uri,
      Object.assign(
        {
          method: 'CANCEL',
          stackTxnId: this.stackTxnId
        }, opts
      ),
      callback!
    );
  }
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
  proxy(opts: any, callback?: (err: Error | null, results?: any) => void): Promise<any> | this {
    if (this.source !== 'network') {
      throw new Error('Request#proxy can only be used for incoming requests');
    }
    opts = opts || {};

    const destination = opts.destination || this.uri;
    if (typeof destination === 'string') { opts.destination = [destination]; }

    Object.assign(opts, {
      stackTxnId: this.stackTxnId,
      remainInDialog: opts.remainInDialog || opts.path || opts.recordRoute || false,
      provisionalTimeout: opts.provisionalTimeout || '',
      finalTimeout: opts.finalTimeout || '',
      followRedirects: opts.followRedirects || false,
      simultaneous: opts.forking === 'simultaneous',
      fullResponse: true
    });

    //normalize sip uris
    opts.destination.forEach((value: string, index: number, array: string[]) => {
      const token = value.split(':');
      if (token[0] !== 'sip' && token[0] !== 'tel') {
        array[index] = 'sip:' + value;
      }
    });

    const result: any = {
      connected: false,
      responses: []
    };

    const __x = (cb: (err: Error | null, results?: any) => void) => {
      this._agent.proxy(this as any, opts, (token: string[], rawMsg: string, meta: any) => {
        if ('NOK' === token[0]) {
          return cb(new Error(token[1]));
        }
        if ('done' === token[1]) {
          result.connected = (200 === result.finalStatus);
          return cb(null, result);
        }
        else {
          //add a new response to the array
          const address = meta.address;
          const port = +meta.port;
          const msg = new SipMessage(rawMsg);
          const obj = {
            time: meta.time,
            status: (msg as any).status,
            msg: msg
          };
          let len = result.responses.length;
          if (len === 0 || address !== result.responses[len - 1].address || port === result.responses[len - 1].port) {
            result.responses.push({
              address: address,
              port: port,
              msgs: []
            });
            len++;
          }
          result.responses[len - 1].msgs.push(obj);
          result.finalStatus = (msg as any).status;
          result.finalResponse = obj;
        }
      });
    };

    if (callback) {
      __x(callback);
      return this;
    }

    return new Promise((resolve, reject) => {
      __x((err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

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

  // for compatibility with passport
  logIn(user: any, options: any, done: (err?: Error) => void): void {
    if (typeof options === 'function') {
      done = options;
      options = {};
    }
    options = options || {};
    done = done || noop;

    let property = 'user';
    if (this._passport && this._passport.instance) {
      property = this._passport.instance._userProperty || 'user';
    }
    const session = (options.session === undefined) ? true : options.session;

    (this as any)[property] = user;
    if (session) {
      if (!this._passport) { throw new Error('passport.initialize() middleware not in use'); }
      if (typeof done !== 'function') { throw new Error('req#login requires a callback function'); }

      this._passport.instance.serializeUser(user, this, (err: Error, obj: any) => {
        if (err) { (this as any)[property] = null; return done(err); }
        if (!this._passport.session) {
          this._passport.session = {};
        }
        this._passport.session.user = obj;
        this.session = this.session || {};
        this.session[this._passport.instance._key] = this._passport.session;
        done();
      });
    } else {
      done();
    }
  }

  // Terminate an existing login session.
  logOut(): void {
    let property = 'user';
    if (this._passport && this._passport.instance) {
      property = this._passport.instance._userProperty || 'user';
    }

    (this as any)[property] = null;
    if (this._passport && this._passport.session) {
      delete this._passport.session.user;
    }
  }
  // Test if request is authenticated.
  isAuthenticated(): boolean {
    let property = 'user';
    if (this._passport && this._passport.instance) {
      property = this._passport.instance._userProperty || 'user';
    }

    return ((this as any)[property]) ? true : false;
  }

  // Test if request is unauthenticated.
  isUnauthenticated(): boolean {
    return !this.isAuthenticated();
  }
  get(name: string): string {
    return this.msg.get(name);
  }
  has(name: string): boolean {
    return this.msg.has(name);
  }
  getHeaderName(name: string): string | undefined {
    return (this.msg as any).getHeaderName(name);
  }
  getParsedHeader(name: string): any {
    return this.msg.getParsedHeader(name);
  }
  set(name: string, value: string): void {
    this.msg.set(name, value);
  }
}

export default Request;

delegate(Request.prototype, 'msg')
  .method('get')
  .method('has')
  .method('getHeaderName')
  .method('getParsedHeader')
  .method('set')
  .access('method')
  .access('uri')
  .access('headers')
  .access('body')
  .access('payload')
  .getter('type')
  .getter('raw')
  .getter('callingNumber')
  .getter('callingName')
  .getter('calledNumber')
  .getter('canFormDialog') ;

/**
 * response event triggered when a Request sent by the application receives a response from the network
 * @event Endpoint#destroy
 * @param {Response} res - SIP response received as a result of sending a SIP request
 */
