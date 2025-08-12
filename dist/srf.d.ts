import Dialog from './dialog';
import { EventEmitter as Emitter } from 'events';
import * as parser from './sip-parser/parser';
import SipError from './sip_error';
import { Socket } from 'net';
import { SrfConfig, SrfRequest, SrfResponse, SrfDialog, CreateUASOptions, CreateUACOptions, CreateB2BUAOptions, ProxyRequestOptions } from './types';
declare enum DialogState {
    Trying = "trying",
    Proceeding = "proceeding",
    Early = "early",
    Confirmed = "confirmed",
    Terminated = "terminated",
    Rejected = "rejected",
    Cancelled = "cancelled"
}
declare enum DialogDirection {
    Initiator = "initiator",
    Recipient = "recipient"
}
/**
 * Applications create an instance of Srf in order to create and manage SIP [Dialogs]{@link Dialog}
 * and SIP transactions.  An application may have one or more Srf instances, although for most cases a single
 * instance is sufficient.
 */
declare class Srf extends Emitter {
    private _dialogs;
    private _tags;
    _app: any;
    /**
     * Creates an instance of an signaling resource framework.
     * @param {string|Array} tag a string or array of strings, representing tag values for this application.
     * Tags can be used in conjunction with a call routing web callback to direct requests to particular applications.
     */
    constructor(app?: string | string[] | any);
    on(event: string, fn: (...args: any[]) => void): any;
    get app(): any;
    connect(opts: SrfConfig, callback?: (err: any, hostport?: string) => void): any;
    listen(opts: SrfConfig, callback?: (err: any) => void): any;
    dialog(opts?: any): (req: SrfRequest, res: SrfResponse, next: () => void) => void;
    /**
     * create a SIP dialog, acting as a UAS (user agent server); i.e.
     * respond to an incoming SIP INVITE with a 200 OK
     * (or to a SUBSCRIBE request with a 202 Accepted).
     *
     * Note that the {@link Dialog} is generated (i.e. the callback invoked / the Promise resolved)
     * at the moment that the 200 OK is sent back towards the requestor, not when the ACK is subsequently received.
     * @param  {Object} req the incoming sip request object
     * @param  {Object} res the sip response object
     * @param  {Object} opts configuration options
     * @param {string} opts.localSdp the local session description protocol to include in the SIP response
     * @param {Object} [opts.headers] SIP headers to include on the SIP response to the INVITE
     * @param  {function} [callback] if provided, callback with signature <code>(err, dialog)</code>
     * @return {Srf|Promise} if a callback is supplied, a reference to the Srf instance.
     * <br/>If no callback is supplied, then a Promise that is resolved
     * with the [sip dialog]{@link Dialog} that is created.
     *
     * @example <caption>returning a Promise</caption>
     * const Srf = require('drachtio-srf');
     * const srf = new Srf();
     *
     * srf.invite((req, res) => {
     *   const mySdp; // populated somehow with SDP we want to answer in 200 OK
     *   srf.createUas(req, res, {localSdp: mySdp})
     *     .then((uas) => {
     *       console.log(`dialog established, remote uri is ${uas.remote.uri}`);
     *       uas.on('destroy', () => {
     *         console.log('caller hung up');
     *       });
     *     })
     *     .catch((err) => {
     *       console.log(`Error establishing dialog: ${err}`);
     *     });
     * });
     * @example <caption>using callback</caption>
     * const Srf = require('drachtio-srf');
     * const srf = new Srf();
     *
     * srf.invite((req, res) => {
     *   const mySdp; // populated somehow with SDP we want to offer in 200 OK
     *   srf.createUas(req, res, {localSdp: mySdp},
     *     (err, uas) => {
     *       if (err) {
     *         return console.log(`Error establishing dialog: ${err}`);
     *       }
     *       console.log(`dialog established, local tag is ${uas.sip.localTag}`);
     *       uas.on('destroy', () => {
     *         console.log('caller hung up');
     *       });
     *     });
     * });
     * @example <caption>specifying standard or custom headers</caption>
     * srf.createUas(req, res, {
     *     localSdp: mySdp,
     *     headers: {
     *       'User-Agent': 'drachtio/iechyd-da',
     *       'X-Linked-UUID': '1e2587c'
     *     }
     *   }).then((uas) => { ..});
     */
    createUAS(req: SrfRequest, res: SrfResponse, opts?: CreateUASOptions, callback?: (err: Error | null, dialog?: SrfDialog) => void): Promise<SrfDialog> | this;
    /**
    * create a SIP dialog, acting as a UAC (user agent client)
    *
    * @param  {string}   uri -  request uri to send to
    * @param  {Object}  opts   configuration options
    * @param  {Object}  [opts.headers] SIP headers to include on the SIP INVITE request
    * @param  {string}  opts.localSdp the local session description protocol to include in the SIP INVITE request
    * @param  {string}  [opts.proxy] send the request through an outbound proxy,
    * specified as full sip uri or address[:port]
    * @param  {Object|Function}  opts.auth sip credentials to use if challenged,
    * or a function invoked with (req, res) and returning (err, username, password) where req is the
    * request that was sent and res is the response that included the digest challenge
    * @param  {string}  opts.auth.username sip username
    * @param  {string}  opts.auth.password sip password
    * @param  {Object} [progressCallbacks] callbacks providing call progress notification
    * @param {Function} [progressCallbacks.cbRequest] - callback that provides request sent over the wire,
    * with signature (req)
    * @param {Function} [progressCallbacks.cbProvisional] - callback that provides a provisional response
    * with signature (provisionalRes)
    * @param  {function} [callback] if provided, callback with signature <code>(err, dialog)</code>
    * @return {Srf|Promise} if a callback is supplied, a reference to the Srf instance.
    * <br/>If no callback is supplied, then a Promise that is resolved
    * with the [sip dialog]{@link Dialog} that is created.
    * @example <caption>returning a Promise</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * const mySdp; // populated somehow with SDP we want to offer
    * srf.createUac('sip:1234@10.10.100.1', {localSdp: mySdp})
    *   .then((uac) => {
    *     console.log(`dialog established, call-id is ${uac.sip.callId}`);
    *     uac.on('destroy', () => {
    *       console.log('called party hung up');
    *     });
    *   })
    *   .catch((err) => {
    *     console.log(`INVITE rejected with status: ${err.status}`);
    *   });
    * });
    * @example <caption>Using a callback</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * const mySdp; // populated somehow with SDP we want to offer
    * srf.createUac('sip:1234@10.10.100.1', {localSdp: mySdp},
    *    (err, uac) => {
    *      if (err) {
    *        return console.log(`INVITE rejected with status: ${err.status}`);
    *      }
    *     uac.on('destroy', () => {
    *       console.log('called party hung up');
    *     });
    *   });
    * @example <caption>Canceling a request by using a progress callback</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * const mySdp; // populated somehow with SDP we want to offer
    * let inviteSent;
    * srf.createUAC('sip:1234@10.10.100.1', {localSdp: mySdp},
    *   {
    *     cbRequest: (reqSent) => { inviteSent = req; }
    *   })
    *   .then((uac) => {
    *     // unexpected, in this case
    *     console.log('dialog established before we could cancel');
    *   })
    *   .catch((err) => {
    *     assert(err.status === 487); // expected sip response to a CANCEL
    *   });
    * });
    *
    * // cancel the request after 0.5s
    * setTimeout(() => {
    *   inviteSent.cancel();
    * }, 500);
    */
    createUAC(uri: string | CreateUACOptions, opts?: CreateUACOptions, progressCallbacks?: {
        cbRequest?: (req: SrfRequest) => void;
        cbProvisional?: (res: SrfResponse) => void;
    }, callback?: (err: Error | null, dialog?: SrfDialog) => void): Promise<SrfDialog> | this;
    /**
    * create back-to-back dialogs; i.e. act as a back-to-back user agent (B2BUA), creating a
    * pair of dialogs {uas, uac} -- a UAS dialog facing the caller or A party, and a UAC dialog
    * facing the callee or B party such that media flows between them
    * @param  {Object}  req  - incoming sip request object
    * @param  {Object}  res  - incoming sip response object
    * @param  {string}  uri - sip uri or IP address[:port] to send the UAC INVITE to
    * @param  {Object}  opts -   configuration options
    * @param {Object} [opts.headers] SIP headers to include on the SIP INVITE request to the B party
    * @param {Object} [opts.responseHeaders] SIP headers to include on responses to the A party.
    * Either an object containing SIP headers, or a function returning an object may be provided.
    * If a function is provided, it will be called with the signature (uacRes, headers),
    * where 'uacRes' is the response received from the B party, and 'headers' are the SIP headers
    * that have currently been set for the response.
    * @param {string|function} [opts.localSdpA] the local session description protocol
    * to offer in the response to the SIP INVITE request on the A leg; either a string or a function
    * may be provided. If a function is
    * provided, it will be invoked with two parameters (sdp, res) correspnding to the SDP received from the B
    * party, and the sip response object received on the response from B.
    * The function must return either the SDP (as a string)
    * or a Promise that resolves to the SDP. If no value is provided (neither string nor function), then the SDP
    * returned by the B party in the provisional/final response on the UAC leg will be
    * sent back to the A party in the answer.
    * @param {string} [opts.localSdpB] the local session description protocol to offer in the SIP INVITE
    * request on the B leg
    * @param {Array} [opts.proxyRequestHeaders] an array of header names which, if they appear in the INVITE request
    * on the A leg, should be included unchanged on the generated B leg INVITE
    * @param {Array} [opts.proxyResponseHeaders] an array of header names which, if they appear
    * in the response to the outgoing INVITE, should be included unchanged on the generated response to the A leg
    * @param {Boolean} [opts.passFailure=true] specifies whether to pass a failure returned from B leg back to the A leg
    * @param {Boolean} [opts.passProvisionalResponses=true] specifies whether to pass provisional responses
    * from B leg back to the A leg
    * @param  {string}  [opts.proxy] send the request through an outbound proxy,
    * specified as full sip uri or address[:port]
    * @param  {Object|Function}  opts.auth sip credentials to use if challenged,
    * or a function invoked with (req, res) and returning (err, username, password) where req is the
    * request that was sent and res is the response that included the digest challenge
    * @param  {string}  opts.auth.username sip username
    * @param  {string}  opts.auth.password sip password
    * @param  {Object} [progressCallbacks] callbacks providing call progress notification
    * @param {Function} [progressCallbacks.cbRequest] - callback that provides request sent over the wire,
    * with signature (req)
    * @param {Function} [progressCallbacks.cbProvisional] - callback that provides a provisional response
    * with signature (provisionalRes)
    * @param {Function} [progressCallbacks.cbFinalizedUac] - callback that provides the UAC dialog as soon as
    * the 200 OK is received from the B party.  Since the UAC dialog is also returned when the B2B has been completely
    * constructed, this is mainly useful if there is some need to be notified as soon as the B party answers.
    * The callback signature is (uac).
    * @param  {function} [callback] if provided, callback with signature <code>(err, {uas, uac})</code>
    * @return {Srf|Promise} if a callback is supplied, a reference to the Srf instance.
    * <br/>If no callback is supplied, then a Promise that is resolved
    * with the [sip dialog]{@link Dialog} that is created.
    * @example <caption>simple B2BUA</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * srf.invite((req, res) => {
    *   srf.createB2BUA('sip:1234@10.10.100.1', req, res, {localSdpB: req.body})
    *     .then(({uas, uac}) => {
    *       console.log('call connected');
    *
    *       // when one side terminates, hang up the other
    *       uas.on('destroy', () => { uac.destroy(); });
    *       uac.on('destroy', () => { uas.destroy(); });
    *     })
    *     .catch((err) => {
    *       console.log(`call failed to connect: ${err}`);
    *     });
    * });
    * @example <caption>use opts.passFailure to attempt a fallback URI on failure</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * function endCall(dlg1, dlg2) {
    *   dlg1.on('destroy', () => {dlg2.destroy();})
    *   dlg2.on('destroy', () => {dlg1.destroy();})
    * }
    * srf.invite((req, res) => {
    *   srf.createB2BUA('sip:1234@10.10.100.1', req, res, {localSdpB: req.body, passFailure: false})
    *     .then({uas, uac} => {
    *       console.log('call connected to primary destination');
    *       endcall(uas, uac);
    *     })
    *     .catch((err) => {
    *       // try backup if we got a sip non-success response and the caller did not hang up
    *       if (err instanceof Srf.SipError && err.status !== 487) {
    *           console.log(`failed connecting to primary, will try backup: ${err}`);
    *           srf.createB2BUA('sip:1234@10.10.100.2', req, res, {
    *             localSdpB: req.body}
    *           })
    *             .then({uas, uac} => {
    *               console.log('call connected to backup destination');
    *               endcall(uas.uac);
    *             })
    *             catch((err) => {
    *               console.log(`failed connecting to backup uri: ${err}`);
    *             });
    *       }
    *     });
    * });
    * @example <caption>B2BUA with media proxy using rtpengine</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    * const rtpengine = require('rtpengine-client').Client
    *
    * // helper functions
    *
    * // clean up and free rtpengine resources when either side hangs up
    * function endCall(dlg1, dlg2, details) {
    *   [dlg1, dlg2].each((dlg) => {
    *     dlg.on('destroy', () => {(dlg === dlg1 ? dlg2 : dlg1).destroy();});
    *     rtpengine.delete(details);
    *   });
    * }
    *
    * // function returning a Promise that resolves with the SDP to offer A leg in 18x/200 answer
    * function getSdpA(details, remoteSdp, res) {
    *   return rtpengine.answer(Object.assign(details, {
    *     'sdp': remoteSdp,
    *     'to-tag': res.getParsedHeader('To').params.tag
    *    }))
    *     .then((response) => {
    *       if (response.result !== 'ok') throw new Error(`Error calling answer: ${response['error-reason']}`);
    *       return response.sdp;
    *    })
    * }
    *
    * // handle incoming invite
    * srf.invite((req, res) => {
    *   const from = req.getParsedHeader('From');
    *   const details = {'call-id': req.get('Call-Id'), 'from-tag': from.params.tag};
    *
    *   rtpengine.offer(Object.assign(details, {'sdp': req.body})
    *     .then((rtpResponse) => {
    *       if (rtpResponse && rtpResponse.result === 'ok') return rtpResponse.sdp;
    *       throw new Error('rtpengine failure');
    *     })
    *     .then((sdpB) => {
    *       return srf.createB2BUA('sip:1234@10.10.100.1', req, res, {
    *         localSdpB: sdpB,
    *         localSdpA: getSdpA.bind(null, details)
    *       });
    *     })
    *     .then({uas, uac} => {
    *       console.log('call connected with media proxy');
    *       endcall(uas, uac, details);
    *     })
    *     .catch((err) => {
    *       console.log(`Error proxying call with media: ${err}`);
    *     });
    * });

    */
    createB2BUA(req: SrfRequest, res: SrfResponse, uri: string | CreateB2BUAOptions, opts?: CreateB2BUAOptions, progressCallbacks?: {
        cbRequest?: (req: SrfRequest) => void;
        cbProvisional?: (res: SrfResponse) => void;
        cbFinalizedUac?: (uac: SrfDialog) => void;
    }, callback?: (err: Error | null, dialogs?: {
        uas: SrfDialog;
        uac: SrfDialog;
    }) => void): Promise<{
        uas: SrfDialog;
        uac: SrfDialog;
    }> | this;
    /**
    * proxy an incoming request
    * @param  {Request}   req - drachtio request object representing an incoming SIP request
    * @param {String|Array} [destination] -  an IP address[:port], or list of same, to proxy the request to
    * @param  {Object}   [opts] - configuration options for the proxy operation
    * @param {String} [opts.forking=sequential] - when multiple destinations are provided,
    * this option governs whether they are attempted sequentially or in parallel.
    * Valid values are 'sequential' or 'parallel'
    * @param {Boolean} [opts.remainInDialog=false] - if true, add Record-Route header and
    * remain in the SIP dialog (i.e. receiving futher SIP messaging for the dialog,
    * including the terminating BYE request).
    * Alias: `recordRoute`.
    * @param {String} [opts.provisionalTimeout] - timeout after which to attempt the next destination
    * if no 100 Trying response has been received.  Examples of valid syntax for this property is '1500ms', or '2s'
      * @param {String} [opts.finalTimeout] - timeout, in milliseconds, after which to cancel
      * the current request and attempt the next destination if no final response has been received.
      * Syntax is the same as for the provisionalTimeout property.
    * @param {Boolean} [opts.followRedirects=false] - if true, handle 3XX redirect responses by
    * generating a new request as per the Contact header; otherwise, proxy the 3XX response
    * back upstream without generating a new response
    * @param  {function} [callback] - callback invoked when proxy operation completes, signature (err, results)
    * where `results` is a JSON object describing the individual sip call attempts and results
    * @returns {Srf|Promise} returns a Promise if no callback is supplied, otherwise the Srf object
    * @example <caption>simple proxy</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * srf.invite((req, res) => {
    *   srf.proxyRequest(req, 'sip.example.com');
    * });
    *
    * @example <caption>proxy with options</caption>
    * const Srf = require('drachtio-srf');
    * const srf = new Srf();
    *
    * srf.invite((req, res) => {
    *   srf.proxyRequest(req, ['sip.example1.com', 'sip.example2.com'], {
    *     recordRoute: true,
    *     followRedirects: true,
    *     provisionalTimeout: '2s'
    *   }).then((results) => {
    *     console.log(JSON.stringify(result)); // {finalStatus: 200, finalResponse:{..}, responses: [..]}
    *   });
    * });
    */
    proxyRequest(req: SrfRequest, destination?: string | string[], opts?: ProxyRequestOptions, callback?: (err: Error | null, results?: any) => void): Promise<any> | this;
    /**
     * Send an outbound request outside of a Dialog.
     * @param {String} uri - request-uri
     * @param {Object} opts - options
     * @param {String} method SIP method for the request
     * @param {Object} [opts.headers] SIP headers to include on the request
     * @param {String} [body] body to include with the request
     * @param {Object} [opts.auth] authentication to use if challenged
     * @param {String} [opts.auth.username] sip username
     * @param {String} [opts.auth.password] sip password
     * @param  {function} [callback] - callback invoked when request is sent, signature (err, requestSent)
    * where `requestSent` is a SipRequest sent out over the wire
    * @returns {Srf|Promise} returns a Promise if no callback is supplied, otherwise the Srf object
     */
    request(socket: Socket | string | undefined, uri?: string | any, opts?: any, callback?: (err: Error | null, req?: SrfRequest) => void): Promise<SrfRequest> | this;
    /**
     * Returns an existing dialog for a given dialog id, if it exists
     * @param {String} stackDialogId dialog id
     */
    findDialogById(stackDialogId: string): SrfDialog | undefined;
    /**
     * Returns an existing dialog for a given sip call-id and from tag, if it exists
     * @param {String} callId SIP Call-ID
     * @param {String} tag SIP From tag
     */
    findDialogByCallIDAndFromTag(callId: string, tag: string): SrfDialog | undefined;
    addDialog(dialog: SrfDialog): void;
    removeDialog(dialog: SrfDialog): void;
    unregisterForMessages(sipVerb: string): void;
    reregisterForMessages(sipVerb: string): void;
    _b2bRequestWithinDialog(dlg: SrfDialog, req: SrfRequest, res: SrfResponse, proxyRequestHeaders: string[], proxyResponseHeaders: string[], callback?: (err?: Error, response?: SrfResponse) => void): void;
    /**
     * a SIP Dialog
     */
    static get Dialog(): typeof Dialog;
    /**
     * inherits from Error and represents a non-success final SIP response to a request;
     * status and reason properties provide the numeric sip status code and the reason for the failure.
     */
    static get SipError(): typeof SipError;
    /**
     * parses a SIP uri string
     * @return {function} a function that takes a SIP uri and returns an object
     * @example
     * const Srf = require('drachtio-srf');
     * const srf = new Srf();
     * const parseUri = Srf.parseUri;
     *
     * // connect, etc..
     *
     * srf.invite((req, res) => {
     *  const uri = parseUri(req.get('From'));
     *  console.log(`parsed From header: ${JSON.stringify(uri)}`);
     *  // {
     *  //   "scheme": "sip",
     *  //   "family": "ipv4",
     *  //   "user": "+15083084807",
     *  //   "host": "192.168.1.100",
     *  //   "port": 5080,
     *  //   "params": {
     *  //      "tag": "3yid87"
     *  //    }
     *  // }
     * });
     */
    static get parseUri(): typeof parser.parseUri;
    static get stringifyUri(): typeof parser.stringifyUri;
    static get SipMessage(): any;
    static get SipRequest(): any;
    static get SipResponse(): any;
    static get DialogState(): typeof DialogState;
    static get DialogDirection(): typeof DialogDirection;
}
export default Srf;
/** send a SIP request outside of a dialog
* @name Srf#request
* @method
* @param  {string} uri - sip request-uri to send request to
* @param {Object} opts - configuration options
* @param {String} opts.method - SIP method to send (lower-case)
* @param {Object} [headers] - SIP headers to apply to the outbound request
* @param {String} [body] - body to send with the SIP request
* @param  {string}  [opts.proxy] send the request through an outbound proxy,
* specified as full sip uri or address[:port]
* @param {function} [callback] - callback invoked when sip request has been sent, invoked with
* signature (err, request) where `request` is a sip request object representing the sip
* message that was sent.
* @example <caption>sending OPTIONS request</caption>
* srf.request('sip.example.com', {
*   method: 'OPTIONS',
*   headers: {
*     'User-Agent': 'drachtio'
*   }
*  }, (err, req) => {
*   req.on('response', (res) => {
*     console.log(`received ${res.statusCode} response`);
*   });
* });
*
*/
/** make an inbound connection to a drachtio server
* @name Srf#connect
* @method
* @param  {Object} opts - connection options
* @param  {string} [opts.host=127.0.0.1] - address drachtio server is listening on for client connections
* @param  {Number} [opts.port=9022] - address drachtio server is listening on for client connections
* @param  {String} opts.secret - shared secret used to authenticate connections
* @example
* const Srf = require('drachtio-srf');
* const srf = new Srf();
*
* srf.connect({host: '127.0.0.1', port: 9022, secret: 'cymru'});
* srf.on('connect', (hostport) => {
*   console.log(`connected to drachtio server offering sip endpoints: ${hostport}`);
* })
* .on('error', (err) => {
*   console.error(`error connecting: ${err}`);
* });
*
* srf.invite((req, res) => {..});
*/
/** listen for outbound connections from a drachtio server
*   @name Srf#listen
*   @method
*   @param  {Object} opts - listen options
*   @param  {number} [opts.host=0.0.0.0] - address to bind listening socket to
*   @param  {number} opts.port - tcp port to listen on
*   @param  {string} opts.secret - shared secret used to authenticate connections
* @example
* const Srf = require('drachtio-srf');
* const srf = new Srf();
*
* srf.listen({port: 3001, secret: 'cymru'});
*
* srf.invite((req, res) => {..});
*
*/
/** terminate the tcp socket connection associated with the request or response object,
*   if the underlying socket was established as part of an outbound connection.  If
*   the underlying socket was established as part of an inbound connection, this method
*   call is a no-op (does nothing).
*   @name Srf#endSession
*   @method
*   @param  {req|res} msg - SIP request or response object
* @example
* const Srf = require('drachtio-srf');
* const srf = new Srf();
*
* srf.listen({port: 3001, secret: 'cymru'});
*
* srf.invite((req, res) => {
*   srf.createUas(req, res, {localSdp: mySdp})
*     .then((uas) => {
*       uas.on('destroy', () => {
*         console.log('caller hung up');
*         srf.endSession(req);
*       });
*     });
* });
*/
/**
 * a <code>connect</code> event is emitted by an Srf instance when a connect method completes
 * with either success or failure
 * @event Srf#connect
 * @param {Error} err - error encountered when attempting to authorize after connecting
 * @param {Array} hostport - an Array of SIP endpoints that the connected drachtio server is
 * listening on for incoming SIP messages.  The format of each endpoint is protcocol/adress:port.
 */
/**
 * an <code>error</code> event is emitted by an Srf instance when an inbound connection is lost
 * @event Srf#error
 * @param {Error} err - specific error information
 */
/**
 * a <code>cdr:attempt</code> event is emitted by an Srf instance when a call attempt has been
 * received (inbound) or initiated (outbound)
 * @event Srf#cdr:attempt
 * @param {String} source - 'network'|'application', depending on whether the INVITE is
 * \inbound (received), or outbound (sent), respectively
 * @param {String} time - the time (UTC) recorded by the SIP stack corresponding to the attempt
 * @param {Object} msg - the actual message that was sent or received
 */
/**
 * a <code>cdr:start</code> event is emitted by an Srf instance when a call attempt has been connected successfully
 * @event Srf#cdr:start
 * @param {String} source - 'network'|'application', depending on whether the INVITE is
 * inbound (received), or outbound (sent), respectively
 * @param {String} time - the time (UTC) recorded by the SIP stack corresponding to the attempt
 * @param {String} role - 'uac'|'uas'|'uac-proxy'|'uas-proxy' indicating whether the application
 * is acting as a user agent client, user agent server, proxy (sending message), or proxy
 * (receiving message) for this cdr
 * @param {Object} msg - the actual message that was sent or received
 */
/**
 * a <code>cdr:stop</code> event is emitted by an Srf instance when a connected call has ended
 * @event Srf#cdr:stop
 * @param {String} source - 'network'|'application', depending on whether the INVITE is inbound (received),
 * or outbound (sent), respectively
 * @param {String} time - the time (UTC) recorded by the SIP stack corresponding to the attempt
 * @param {String} reason - the reason the call was ended
 * @param {Object} msg - the actual message that was sent or received
 */
