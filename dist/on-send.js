"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = onSend;
const sip_status_1 = __importDefault(require("sip-status"));
/**
 * Execute a listener when a response is about to be sent.
 *
 * @param {Object} res
 * @return {Function} listener
 * @api public
 */
function onSend(res, listener) {
    if (!res) {
        throw new TypeError('argument res is required');
    }
    if (typeof listener !== 'function') {
        throw new TypeError('argument listener must be a function');
    }
    res.send = createSend(res.send, listener);
}
;
function createSend(prevSend, listener) {
    let fired = false;
    return function send(...args) {
        if (!fired) {
            fired = true;
            const newArgs = normalizeSendArgs.apply(this, args);
            listener.apply(this, newArgs);
        }
        prevSend.apply(this, args);
    };
}
function normalizeSendArgs(...args) {
    const newArgs = [];
    for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'function') {
            break;
        }
        if (typeof args[i] === 'number') {
            newArgs.push(args[i]);
        }
        else if (typeof args[i] === 'string') {
            newArgs.push(args[i]);
        }
        else if (typeof args[i] === 'object') {
            if (newArgs.length === 0) {
                newArgs.push(this.status);
                newArgs.push(sip_status_1.default[this.status]);
            }
            else if (newArgs.length === 1) {
                newArgs.push(sip_status_1.default[this.status]);
            }
            newArgs.push(args[i]);
        }
    }
    if (0 === newArgs.length) {
        newArgs.push(this.status);
    }
    if (1 === newArgs.length) {
        newArgs.push(sip_status_1.default[newArgs[0]]);
    }
    if (2 === newArgs.length) {
        newArgs.push({});
    }
    return newArgs;
}
//# sourceMappingURL=on-send.js.map