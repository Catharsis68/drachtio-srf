"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
/**
 * Class representing a SIP non-success response to a transaction
 * @extends {Error}
 */
class SipError extends Error {
    /**
     * Create a SipError object
     *
     * @constructor
     * @param  {number}  status SIP final status
     * @param  {string} [reason] reason for failure; if not provided
     * the standard reason associated with the provided SIP status is used
     */
    constructor(status, reason) {
        super();
        assert_1.default.ok(typeof status === 'number', 'first argument to SipError must be number');
        assert_1.default.ok(typeof reason === 'string' || typeof reason === 'undefined', 'second argument to SipError, if provided, must be a string');
        this.name = 'SipError';
        this.status = status;
        if (reason)
            this.reason = reason;
        this.message = 'Sip non-success response: ' + this.status;
        Error.captureStackTrace(this, SipError);
    }
}
exports.default = SipError;
//# sourceMappingURL=sip_error.js.map