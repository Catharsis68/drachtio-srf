import only from 'only';
import * as parser from './parser';
import { SipMessage as SipMessageInterface } from '../types';

class SipMessage implements SipMessageInterface {
  headers: any;
  body: string;
  method: any;
  version: any;
  status: any;
  reason: any;
  uri: any;
  payload: object[];
  raw: string;
  type: "request" | "response";
  source: "network" | "application";
  source_address: string;
  source_port: string;
  protocol: string;
  stackTime: string;

  constructor(msg?: any) {
    this.headers = {};
    this.body = '';
    this.method = '';
    this.version = '';
    this.status = 0;
    this.reason = '';
    this.uri = '';
    this.payload = [];
    this.raw = '';
    this.type = 'request';
    this.source = 'network';
    this.source_address = '';
    this.source_port = '';
    this.protocol = '';
    this.stackTime = '';


    if (msg) {
      if (typeof msg === 'string') {
        this.raw = msg ;
        const obj = parser.parseSipMessage(msg, true) ;
        if (!obj) throw new Error('failed to parse sip message');
        msg = obj;
      }
      Object.assign(this.headers, msg.headers || {});
      Object.assign(this, only(msg, 'body method version status reason uri payload'));
    }
  }

  get calledNumber() {
    const user = this.uri.match(/sips?:(.*?)@/) ;
    if (user && user.length > 1) {
      return user[1].split(';')[0] ;
    }
    return '' ;
  }

  get callingNumber() {
    const header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from') ;
    const user  = header.match(/sips?:(.*?)@/) ;
    if (user && user.length > 1) {
      return user[1].split(';')[0] ;
    }
    return '' ;
  }

  get callingName() {
    const header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from') ;
    const user  = header.match(/^\"(.+)\"\s*<sips?:.+@/);
    if (user && user.length > 1) {
      return user[1];
    }
    return '';
  }

  get canFormDialog() {
    return ('INVITE' === this.method || 'SUBSCRIBE' === this.method) && !this.get('to').tag ;
  }

  getHeaderName(hdr: string) {
    const hdrLowerCase = hdr.toLowerCase();
    return Object.keys(this.headers).find((h) => h.toLowerCase() === hdrLowerCase);
  }

  set(hdr: any, value?: any) {
    const hdrs: any = {} ;
    if (typeof hdr === 'string') hdrs[hdr] = value ;
    else {
      Object.assign(hdrs, hdr);
    }

    Object.keys(hdrs).forEach((key) => {
      const name = parser.getHeaderName(key) ;
      const newValue = hdrs[key] ;
      let v = '' ;
      if (name in this.headers) {
        v += this.headers[name] ;
        v += ',' ;
      }
      v += newValue ;
      this.headers[name] = v;
    });

    return this ;
  }

  get(hdr: string) {
    const headerName = this.getHeaderName(parser.getHeaderName(hdr));
    if (headerName) {
      return this.headers[headerName];
    }
  }

  has(hdr: string) {
    return !!this.getHeaderName(hdr);
  }

  getParsedHeader(hdr: string) {
    const v = this.get(hdr);

    if (!v) {
      throw new Error('header not available');
    }

    const fn = parser.getParser(hdr.toLowerCase()) ;
    return fn({s:v, i:0}) ;
  }

  toString() {
    return parser.stringifySipMessage(this) ;
  }

  static parseUri = parser.parseUri;
}

export default SipMessage;
