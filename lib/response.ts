import { EventEmitter } from 'events';
import delegate from 'delegates';
import status_codes from 'sip-status';
import only from 'only';
import { noop } from 'node-noop';
import assert from 'assert';
import Debug from 'debug';
const debug = Debug('drachtio:response');
import SipMessage from './sip-parser/message';
import { SrfRequest, SrfResponse } from './types';
import DrachtioAgent from './drachtio-agent';

class Response extends EventEmitter implements SrfResponse {
  _agent: DrachtioAgent;
  msg: SipMessage;
  finished: boolean;
  _req: SrfRequest;
  source: 'network' | 'application';
  source_address: string;
  source_port: string;
  protocol: string;
  stackTime: string;
  stackTxnId: string;
  stackDialogId: string;
  status: number;
  socket: any;
  srf: any;
  headers: import("./types").SipMessageHeaders;
  reason: string;
  body: string;
  payload: object[];
  raw: string;
  calledNumber: string;
  callingNumber: string;
  type: "request" | "response";

  constructor(agent?: DrachtioAgent) {
    super();
    this._agent = agent!;
    this.msg = new SipMessage();
    this.finished = false;
    this._req = undefined as any;
    this.source = undefined as any;
    this.source_address = '';
    this.source_port = '5060';
    this.protocol = '';
    this.stackTime = '';
    this.stackTxnId = '';
    this.stackDialogId = '';
    this.status = 0;
    this.srf = undefined;
    this.headers = {};
    this.reason = '';
    this.body = '';
    this.payload = [];
    this.raw = '';
    this.calledNumber = '';
    this.callingNumber = '';
    this.type = 'response';
  }

  get req(): SrfRequest {
    return this._req;
  }
  set req(req: SrfRequest) {
    this._req = req;

    //copy over the dialog-specific headers from the associated request
    ['call-id', 'cseq', 'from', 'to'].forEach((hdr) => {
      if (req.has(hdr) && !(this as any).has(hdr)) { (this as any).msg.set(hdr, req.get(hdr)); }
    });
  }

  get agent(): DrachtioAgent {
    return this._agent;
  }

  set agent(agent: DrachtioAgent) {
    debug('setting agent');
    this._agent = agent;
  }

  set meta(meta: any) {
    this.source = meta.source;
    this.source_address = meta.address;
    this.source_port = meta.port ? meta.port.toString() : '5060';
    this.protocol = meta.protocol;
    this.stackTime = meta.time;
    this.stackTxnId = meta.transactionId;
    this.stackDialogId = meta.dialogId;
  }

  get meta(): any {
    return {
      source: this.source,
      source_address: this.source_address,
      source_port: this.source_port,
      protocol: this.protocol,
      time: this.stackTime,
      transactionId: this.stackTxnId,
      dialogId: this.stackDialogId
    };
  }

  set statusCode(code: number) {
    this.status = code;
  }
  get statusCode(): number {
    return this.status;
  }

  get finalResponseSent(): boolean {
    return this.finished;
  }
  get headersSent(): boolean {
    return this.finished;
  }

  send(status: number, opts?: object, cb?: () => void): void;
  send(status: number, reason?: string, opts?: object, cb?: () => void): void;
  send(status: number, reason?: string, opts?: object, cb?: (err: any, msg: SipMessage) => void): void;
  send(status: number, ...args: any[]): void {
    let [reason, opts, callback] = args;
    if (typeof status !== 'number' || !(status in status_codes)) {
      throw new Error('Response#send: status is required and must be a valid sip response code');
    }

    if (typeof reason === 'function') {
      // i.e. res.send(180, fn)
      callback = reason;
      reason = undefined;
    }
    else if (typeof reason === 'object') {
      //i.e. res.send(180, {}, fn)
      callback = opts;
      opts = reason;
      reason = undefined;
    }

    if (this.headersSent) {
      // would like to throw an error here, but this may break applications
      // that have been doing so unknowingly (and basically harmlessly since the server discards).
      debug('Response#send: headersSent');
      if (callback) callback(new Error('Response#send: final response already sent'));
      return;
    }

    opts = opts || {};

    (this.msg as any).status = this.status = status;
    (this.msg as any).reason = reason || status_codes[status];

    // allow app to set the tag in To header
    debug(`Res#send opts ${JSON.stringify(opts)}`);
    if (opts.headers && (opts.headers.to || opts.headers['To'])) {
      const to = opts.headers.to || opts.headers['To'];
      delete opts.headers.to;
      delete opts.headers['To'];
      debug(`app wants to set To on response ${to}`);
      const arr = /tag=(.*)/.exec(to);
      if (arr) {
        const tag = arr[1];
        debug(`app is setting tag on To: ${tag}`);
        if ((this.msg as any).headers.to && !(this.msg as any).headers.to.includes('tag=')) {
          (this.msg as any).headers.to += `;tag=${tag}`;
        }
      }
    }

    debug(`Response#send: msg: ${JSON.stringify(this.msg)}`);
    this._agent.sendResponse(this as any, opts, callback, undefined);

    if (status >= 200) {
      this.finished = true;
      this.emit('end', { status: (this.msg as any).status, reason: (this.msg as any).reason });
    }
  }

  sendAck(dialogId: string, opts: any, callback: any): void {
    this._agent.sendAck('ACK', dialogId, this.req as any, this as any, opts, callback);
  }
  sendPrack(dialogId: string, opts: any, callback: any): void {
    const rack = `${this.get('rseq').toString()} ${this.req.get('cseq')}`;
    opts = opts || {};
    opts.headers = opts.headers || {};
    Object.assign(opts.headers, { 'RAck': rack });
    this._agent.sendAck('PRACK', dialogId, this.req as any, this as any, opts, callback);
  }
  toJSON(): any {
    return only(this, 'msg source source_address source_port protocol stackTime stackDialogId stackTxnId');
  }

  // for compatibility with expressjs res object so we can use passport etc and other frameworks
  removeHeader(hdrName: string): void {
    noop();
  }
  getHeader(hdrName: string): any {
    return this.msg.get(hdrName);
  }
  setHeader(hdrName: string, hdrValue: any): SipMessage {
    return this.msg.set(hdrName, hdrValue);
  }

  get(hdrName: string): any {
    return this.msg.get(hdrName);
  }

  end(data?: any, encoding?: string, callback?: () => void): void {
    assert(!this.finished, 'call to Response#end after response is finished');

    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    else if (typeof data === 'function') {
      callback = data;
      encoding = undefined;
      data = undefined;
    }
    callback = callback || noop;

    this.send(this.status, undefined, data, () => {
      callback!();
    });
    this.finished = true;
  }

  // end compatibility
  getHeaderName(name: string): string | undefined {
    return (this.msg as any).getHeaderName(name);
  }
  has(name: string): boolean {
    return this.msg.has(name);
  }
  getParsedHeader(name: string): any {
    return this.msg.getParsedHeader(name);
  }
  set(name: string, value: string): void {
    this.msg.set(name, value);
  }
}

export default Response;

delegate(Response.prototype, 'msg')
  .method('get')
  .method('has')
  .method('getHeaderName')
  .method('getParsedHeader')
  .method('set')
  .access('headers')
  .access('body')
  .access('payload')
  .access('status')
  .access('reason')
  .getter('raw')
  .getter('type') ;
