"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const delegates_1 = __importDefault(require("delegates"));
const sip_status_1 = __importDefault(require("sip-status"));
const only_1 = __importDefault(require("only"));
const node_noop_1 = require("node-noop");
const assert_1 = __importDefault(require("assert"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('drachtio:response');
const message_1 = __importDefault(require("./sip-parser/message"));
class Response extends events_1.EventEmitter {
    constructor(agent) {
        super();
        this._agent = agent;
        this.msg = new message_1.default();
        this.finished = false;
        this._req = undefined;
        this.source = undefined;
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
    get req() {
        return this._req;
    }
    set req(req) {
        this._req = req;
        //copy over the dialog-specific headers from the associated request
        ['call-id', 'cseq', 'from', 'to'].forEach((hdr) => {
            if (req.has(hdr) && !this.has(hdr)) {
                this.msg.set(hdr, req.get(hdr));
            }
        });
    }
    get agent() {
        return this._agent;
    }
    set agent(agent) {
        debug('setting agent');
        this._agent = agent;
    }
    set meta(meta) {
        this.source = meta.source;
        this.source_address = meta.address;
        this.source_port = meta.port ? meta.port.toString() : '5060';
        this.protocol = meta.protocol;
        this.stackTime = meta.time;
        this.stackTxnId = meta.transactionId;
        this.stackDialogId = meta.dialogId;
    }
    get meta() {
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
    set statusCode(code) {
        this.status = code;
    }
    get statusCode() {
        return this.status;
    }
    get finalResponseSent() {
        return this.finished;
    }
    get headersSent() {
        return this.finished;
    }
    send(status, ...args) {
        let [reason, opts, callback] = args;
        if (typeof status !== 'number' || !(status in sip_status_1.default)) {
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
            if (callback)
                callback(new Error('Response#send: final response already sent'));
            return;
        }
        opts = opts || {};
        this.msg.status = this.status = status;
        this.msg.reason = reason || sip_status_1.default[status];
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
                if (this.msg.headers.to && !this.msg.headers.to.includes('tag=')) {
                    this.msg.headers.to += `;tag=${tag}`;
                }
            }
        }
        debug(`Response#send: msg: ${JSON.stringify(this.msg)}`);
        this._agent.sendResponse(this, opts, callback, undefined);
        if (status >= 200) {
            this.finished = true;
            this.emit('end', { status: this.msg.status, reason: this.msg.reason });
        }
    }
    sendAck(dialogId, opts, callback) {
        this._agent.sendAck('ACK', dialogId, this.req, this, opts, callback);
    }
    sendPrack(dialogId, opts, callback) {
        const rack = `${this.get('rseq').toString()} ${this.req.get('cseq')}`;
        opts = opts || {};
        opts.headers = opts.headers || {};
        Object.assign(opts.headers, { 'RAck': rack });
        this._agent.sendAck('PRACK', dialogId, this.req, this, opts, callback);
    }
    toJSON() {
        return (0, only_1.default)(this, 'msg source source_address source_port protocol stackTime stackDialogId stackTxnId');
    }
    // for compatibility with expressjs res object so we can use passport etc and other frameworks
    removeHeader(hdrName) {
        (0, node_noop_1.noop)();
    }
    getHeader(hdrName) {
        return this.msg.get(hdrName);
    }
    setHeader(hdrName, hdrValue) {
        return this.msg.set(hdrName, hdrValue);
    }
    get(hdrName) {
        return this.msg.get(hdrName);
    }
    end(data, encoding, callback) {
        (0, assert_1.default)(!this.finished, 'call to Response#end after response is finished');
        if (typeof encoding === 'function') {
            callback = encoding;
            encoding = undefined;
        }
        else if (typeof data === 'function') {
            callback = data;
            encoding = undefined;
            data = undefined;
        }
        callback = callback || node_noop_1.noop;
        this.send(this.status, undefined, data, () => {
            callback();
        });
        this.finished = true;
    }
    // end compatibility
    getHeaderName(name) {
        return this.msg.getHeaderName(name);
    }
    has(name) {
        return this.msg.has(name);
    }
    getParsedHeader(name) {
        return this.msg.getParsedHeader(name);
    }
    set(name, value) {
        this.msg.set(name, value);
    }
}
exports.default = Response;
(0, delegates_1.default)(Response.prototype, 'msg')
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
    .getter('type');
//# sourceMappingURL=response.js.map