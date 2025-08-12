/**
 * Class representing a SIP non-success response to a transaction
 * @extends {Error}
 */
declare class SipError extends Error {
    status: number;
    reason?: string;
    /**
     * Create a SipError object
     *
     * @constructor
     * @param  {number}  status SIP final status
     * @param  {string} [reason] reason for failure; if not provided
     * the standard reason associated with the provided SIP status is used
     */
    constructor(status: number, reason?: string);
}
export default SipError;
