"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const only_1 = __importDefault(require("only"));
const parser = __importStar(require("./parser"));
class SipMessage {
    constructor(msg) {
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
                this.raw = msg;
                const obj = parser.parseSipMessage(msg, true);
                if (!obj)
                    throw new Error('failed to parse sip message');
                msg = obj;
            }
            Object.assign(this.headers, msg.headers || {});
            Object.assign(this, (0, only_1.default)(msg, 'body method version status reason uri payload'));
        }
    }
    get calledNumber() {
        const user = this.uri.match(/sips?:(.*?)@/);
        if (user && user.length > 1) {
            return user[1].split(';')[0];
        }
        return '';
    }
    get callingNumber() {
        const header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from');
        const user = header.match(/sips?:(.*?)@/);
        if (user && user.length > 1) {
            return user[1].split(';')[0];
        }
        return '';
    }
    get callingName() {
        const header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from');
        const user = header.match(/^\"(.+)\"\s*<sips?:.+@/);
        if (user && user.length > 1) {
            return user[1];
        }
        return '';
    }
    get canFormDialog() {
        return ('INVITE' === this.method || 'SUBSCRIBE' === this.method) && !this.get('to').tag;
    }
    getHeaderName(hdr) {
        const hdrLowerCase = hdr.toLowerCase();
        return Object.keys(this.headers).find((h) => h.toLowerCase() === hdrLowerCase);
    }
    set(hdr, value) {
        const hdrs = {};
        if (typeof hdr === 'string')
            hdrs[hdr] = value;
        else {
            Object.assign(hdrs, hdr);
        }
        Object.keys(hdrs).forEach((key) => {
            const name = parser.getHeaderName(key);
            const newValue = hdrs[key];
            let v = '';
            if (name in this.headers) {
                v += this.headers[name];
                v += ',';
            }
            v += newValue;
            this.headers[name] = v;
        });
        return this;
    }
    get(hdr) {
        const headerName = this.getHeaderName(parser.getHeaderName(hdr));
        if (headerName) {
            return this.headers[headerName];
        }
    }
    has(hdr) {
        return !!this.getHeaderName(hdr);
    }
    getParsedHeader(hdr) {
        const v = this.get(hdr);
        if (!v) {
            throw new Error('header not available');
        }
        const fn = parser.getParser(hdr.toLowerCase());
        return fn({ s: v, i: 0 });
    }
    toString() {
        return parser.stringifySipMessage(this);
    }
}
SipMessage.parseUri = parser.parseUri;
exports.default = SipMessage;
//# sourceMappingURL=message.js.map