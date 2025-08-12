import { EventEmitter } from 'events';
import { SrfRequest, SrfResponse, SrfDialog } from './types';
import Srf from './srf';
/**
 * Class representing a SIP Dialog.
 *
 * Note that instances of this class are not created directly by your code;
 * rather they are returned from the {@link Srf#createUAC}, {@link Srf#createUAS}, and {@link Srf#createB2BUA}
 * @class
 * @extends EventEmitter
 */
declare class Dialog extends EventEmitter implements SrfDialog {
    srf: Srf;
    type: 'uac' | 'uas';
    req: SrfRequest;
    res: SrfResponse;
    sent: SrfResponse;
    auth: any;
    agent: any;
    onHold: boolean;
    connected: boolean;
    queuedRequests: {
        req: SrfRequest;
        res: SrfResponse;
    }[];
    _queueRequests: boolean;
    _reinvitesInProgress: {
        count: number;
        admitOne: any[];
    };
    sip: {
        callId: string;
        localTag: string;
        remoteTag: string;
    };
    local: {
        uri: string;
        sdp: string;
        contact: string;
    };
    remote: {
        uri: string;
        sdp: string;
    };
    subscriptions: string[];
    _emitter: any;
    _state: any;
    _promiseTxnInProgress: any;
    other: SrfDialog;
    /**
     * Constructor that is called internally by Srf when generating a Dialog instance.
     * @param {Srf} srf - Srf instance that created this dialog
     * @param {string} type - type of SIP dialog: 'uac', or 'uas'
     * @param {Dialog~Options} opts
     */
    constructor(srf: Srf, type: 'uac' | 'uas', opts: {
        req: SrfRequest;
        res: SrfResponse;
        sent: SrfResponse;
        auth: any;
    });
    get id(): string;
    get dialogType(): 'uac' | 'uas';
    get subscribeEvent(): string | null;
    get socket(): any;
    set stateEmitter(opts: {
        emitter: any;
        state: any;
    });
    set queueRequests(enqueue: boolean);
    toJSON(): any;
    toString(): string;
    getCountOfSubscriptions(): number;
    addSubscription(req: SrfRequest): number;
    removeSubscription(uri: string, event: string): number;
    /**
     * destroy the sip dialog by generating a BYE request (in the case of INVITE dialog),
     * or NOTIFY (in the case of SUBSCRIBE)
     * @param {Object} [opts] configuration options
     * @param {Object} [opts.headers] SIP headers to add to the outgoing BYE or NOTIFY
     * @param {Object|Function} [opts.auth] sip credentials to use if challenged,
     * or a function invoked with (req, res) and returning (err, username, password) where req is the
     * request that was sent and res is the response that included the digest challenge
     * @param {string} [opts.auth.username] sip username
     * @param {string} [opts.auth.password] sip password
     * @param {function} [callback] if provided, callback with signature <code>(err, msg)</code>
     * that provides the BYE or NOTIFY message that was sent to terminate the dialog
     * @return {Promise|Dialog} if no callback is supplied, otherwise a reference to the Dialog
     */
    destroy(opts?: {
        headers: Record<string, string>;
    }, callback?: (err: any, msg: SrfRequest) => void): Promise<void>;
    _destroy(opts?: any, callback?: (err: Error | null, msg?: SrfRequest) => void): void;
    /**
     * modify the dialog session by changing attributes of the media connection
     * @param  {string} sdp - 'hold', 'unhold', or a session description protocol
     * @param  {function} [callback] - callback invoked with signature <code>(err)</code> when operation has completed
     * @return {Promise|Dialog} if no callback is supplied, otherwise the function returns a reference to the Dialog
     */
    modify(sdp: string, opts?: {
        noAck: boolean;
    }): Promise<string>;
    modify(opts: {
        noAck: boolean;
    }): Promise<string>;
    modify(sdp: string, opts: {
        noAck: boolean;
    }, callback: (err: any, msg: SrfResponse) => void): void;
    modify(opts: {
        noAck: boolean;
    }, callback: (err: any, resp?: string, resAck?: (sdp: string) => void) => void): void;
    _modify(sdp?: string, opts?: any, callback?: (err: Error | null, res?: SrfResponse, ack?: (sdp: string) => void) => void): void;
    /**
     * send a request within a dialog.
     * Note that you may also call <code>request.info(..)</code> as a shortcut
     * to send an INFO message, <code>request.notify(..)</code>
     * to send a NOTIFY, etc..
     * @param {Object} [opts]
     * @param {string} opts.method - SIP method to use for the request
     * @param {Object} [opts.headers] - SIP headers to apply to the request
     * @param {string} [opts.body] - body of the SIP request
     * @param {Object|Function} [opts.auth] sip credentials to use if challenged,
     * or a function invoked with (req, res) and returning (err, username, password) where req is the
     * request that was sent and res is the response that included the digest challenge
     * @param {string} [opts.auth.username] sip username
     * @param {string} [opts.auth.password] sip password
     * @param {function} [callback]  - callback invoked with signature <code>(err, req)</code>
     * when operation has completed
     * @return {Promise|Dialog} if no callback is supplied a Promise that resolves to the response received,
     * otherwise the function returns a reference to the Dialog
     */
    request(opts: any): Promise<SrfResponse>;
    request(opts: any, callback: (err: Error | null, res?: SrfResponse) => void): void;
    handle(req: SrfRequest, res: SrfResponse): void;
}
export default Dialog;
/**
 * a <code>destroy</code> event is triggered when the Dialog is torn down from the far end
 * @event Dialog#destroy
 * @param {Object} msg - incoming BYE request message
 */
/**
 * a <code>modify</code> event is triggered when the far end modifies the session by sending a re-INVITE.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK with the current local SDP
 * will be automatically generated.
 *
 * @event Dialog#modify
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 * @memberOf Dialog
 */
/**
 * a <code>refresh</code> event is triggered when the far end sends a session refresh.
 * There is no need for the application to respond to this event; this is purely
 * a notification.
 * @event Dialog#refresh
 * @param {Object} msg - incoming re-INVITE request message
 */
/**
 * an <code>info</code> event is triggered when the far end sends an INFO message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#info
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
/**
 * a <code>notify</code> event is triggered when the far end sends a NOTIFY message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#notify
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
/**
 * an <code>options</code> event is triggered when the far end sends an OPTIONS message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#options
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
/**
 * an <code>update</code> event is triggered when the far end sends an UPDATE message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#update
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
/**
 * a <code>refer</code> event is triggered when the far end sends a REFER message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#refer
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
/**
 * a <code>message</code> event is triggered when the far end sends a MESSAGE message.
 * When an application adds a handler for this event it must generate
 * the SIP response by calling <code>res.send</code> on the provided drachtio response object.
 * When no handler is found for this event a 200 OK will be automatically generated.
 * @event Dialog#message
 * @param {Object} req - drachtio request object
 * @param {Object} res - drachtio response object
 */
