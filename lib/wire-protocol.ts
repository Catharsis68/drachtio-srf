import { EventEmitter } from 'events';
import net from 'net';
import tls from 'tls';
import uuidV4 from 'uuid-random';
import Debug from 'debug';
const debug = Debug('drachtio:agent');
import { noop } from 'node-noop';
const CRLF = '\r\n' ;
import assert from 'assert';
const DEFAULT_PING_INTERVAL = 15000;
const MIN_PING_INTERVAL = 5000;
const MAX_PING_INTERVAL = 300000;


export default class WireProtocol extends EventEmitter {
  private _logger: any;
  private mapIncomingMsg: Map<any, any>;
  private enablePing: boolean;
  private pingInterval: number;
  private mapTimerPing: Map<any, any>;
  private server: any;
  private host: any;
  private port: any;
  private reconnectOpts: any;
  private reconnectVars: any;
  private closing: boolean;
  private socket: any;


  constructor(opts: any) {
    super() ;

    this._logger = opts.logger || noop ;
    this.mapIncomingMsg = new Map() ;

    this.enablePing = false;
    this.pingInterval = DEFAULT_PING_INTERVAL;
    this.mapTimerPing = new Map();
    this.closing = false;
  }

  connect(opts: any) {
    // inbound connection to drachtio server
    let socket: net.Socket | tls.TLSSocket;
    assert.ok(typeof this.server === 'undefined', 'WireProtocol#connect: cannot be both client and server');
    this.host = opts.host ;
    this.port = opts.port ;
    this.reconnectOpts = opts.reconnect || {} ;
    this.reconnectVars = {} ;
    this._evalPingOpts(opts);
    if (opts.tls) {
      debug(`wp connecting (tls) to ${this.host}:${this.port}`);
      socket = tls.connect(opts.port, opts.host, opts.tls, () => {
        debug(`tls socket connected: ${(socket as tls.TLSSocket).authorized}`);
      });
    }
    else {
      debug(`wp connecting (tcp) to ${this.host}:${this.port}`);
      socket = net.connect({
        port: opts.port,
        host: opts.host
      }) ;
    }
    socket.setNoDelay(true);
    socket.setKeepAlive(true);
    this.installListeners(socket) ;
  }

  _evalPingOpts(opts: any) {
    if (opts.enablePing === true) {
      this.enablePing = true;
      if (opts.pingInterval) {
        const interval = parseInt(opts.pingInterval);
        assert.ok(interval >= MIN_PING_INTERVAL,
          `Srf#connect: opts.pingInterval must be greater than or equal to ${MIN_PING_INTERVAL}`);
        assert.ok(interval <= MAX_PING_INTERVAL,
          `Srf#connect: opts.pingInterval must be less than or equal to ${MAX_PING_INTERVAL}`);
        this.pingInterval = interval;
      }
    }
  }

  startPinging(socket: any) {
    if (!this.enablePing) return;
    assert.ok(!this.mapTimerPing.has(socket), 'duplicate call to startPinging for this socket');
    const timerPing = setInterval(() => {
      if (socket && !socket.destroyed) {
        const msgId = this.send(socket, 'ping');
        this.emit('ping', {msgId, socket});
      }
    }, this.pingInterval);
    this.mapTimerPing.set(socket, timerPing);
  }

  _stopPinging(socket: any) {
    const timerPing = this.mapTimerPing.get(socket);
    if (timerPing) {
      clearInterval(timerPing);
      this.mapTimerPing.delete(socket);
    }
  }

  listen(opts: any) {
    assert.ok(typeof this.reconnectOpts === 'undefined', 'WireProtocol#listen: cannot be both server and client');
    this._evalPingOpts(opts);

    let useTls = false;
    if (opts.server instanceof net.Server) {
      this.server = opts.server ;
    }
    else if (opts.tls) {
      useTls = true;
      this.server = tls.createServer(opts.tls);
      this.server.listen(opts.port, opts.host);
    }
    else {
      this.server = net.createServer() ;
      this.server.listen(opts.port, opts.host) ;
    }
    this.server.on('listening', () => {
      debug(`wp listening on ${JSON.stringify(this.server.address())} for ${useTls ? 'tls' : 'tcp'} connections`);
      this.emit('listening');
    });

    if (useTls) {
      this.server.on('secureConnection', (socket: any) => {
        debug('wp tls handshake succeeded');
        socket.setKeepAlive(true);
        this.installListeners(socket);
        this.emit('connection', socket);
      });
    }
    else {
      this.server.on('connection', (socket: any) => {
        debug(`wp received connection from ${socket.remoteAddress}:${socket.remotePort}`);
        socket.setKeepAlive(true);
        this.installListeners(socket);
        this.emit('connection', socket);
      });
    }
    return this.server ;
  }

  get isServer() {
    return this.server ;
  }

  get isClient() {
    return !this.isServer ;
  }

  setLogger(logger: any) {
    this._logger = logger ;
  }
  removeLogger() {
    this._logger = function() {} ;
  }

  installListeners(socket: any) {
    socket.on('error', (err: Error) => {
      debug(`wp#on error - ${err} ${this.host}:${this.port}`);
      if (this.enablePing) this._stopPinging(socket);

      if (this.isServer || this.closing) {
        return;
      }

      this.emit('error', err, socket);

      // "error" events get turned into exceptions if they aren't listened for.  If the user handled this error
      // then we should try to reconnect.
      this._onConnectionGone();
    });

    socket.on('connect', () => {
      debug(`wp#on connect ${this.host}:${this.port}`);
      if (this.isClient) {
        this.initializeRetryVars() ;
      }
      this.emit('connect', socket);
    }) ;

    socket.on('close', () => {
      debug(`wp#on close ${this.host}:${this.port}`);
      if (this.enablePing) this._stopPinging(socket);
      if (this.isClient) {
        this._onConnectionGone();
      }
      this.mapIncomingMsg.delete(socket) ;
      this.emit('close', socket) ;
    }) ;

    socket.on('data', this._onData.bind(this, socket)) ;
  }

  initializeRetryVars() {
    assert(this.isClient);

    this.reconnectVars.retryTimer = null;
    this.reconnectVars.retryTotaltime = 0;
    this.reconnectVars.retryDelay = 150;
    this.reconnectVars.retryBackoff = 1.7;
    this.reconnectVars.attempts = 1;
  }

  _onConnectionGone() {
    assert(this.isClient);

    // If a retry is already in progress, just let that happen
    if (this.reconnectVars.retryTimer) {
      debug('WireProtocol#connection_gone: retry is already in progress') ;
      return;
    }

    // If this is a requested shutdown, then don't retry
    if (this.closing) {
      this.reconnectVars.retryTimer = null;
      return;
    }

    const nextDelay = Math.floor(this.reconnectVars.retryDelay * this.reconnectVars.retryBackoff);
    if (this.reconnectOpts.retryMaxDelay !== null && nextDelay > this.reconnectOpts.retryMaxDelay) {
      this.reconnectVars.retryDelay = this.reconnectOpts.retryMaxDelay;
    } else {
      this.reconnectVars.retryDelay = nextDelay;
    }

    if (this.reconnectOpts.maxAttempts && this.reconnectVars.attempts >= this.reconnectOpts.maxAttempts) {
      this.reconnectVars.retryTimer = null;
      return;
    }

    this.reconnectVars.attempts += 1;
    this.emit('reconnecting', {
      delay: this.reconnectVars.retryDelay,
      attempt: this.reconnectVars.attempts
    });
    this.reconnectVars.retryTimer = setTimeout(() => {
      this.reconnectVars.retryTotaltime += this.reconnectVars.retryDelay;

      if (this.reconnectOpts.connectTimeout && this.reconnectVars.retryTotaltime >= this.reconnectOpts.connectTimeout) {
        this.reconnectVars.retryTimer = null;
        console.error('WireProtocol#connection_gone: ' +
          `Couldn't get drachtio connection after ${this.reconnectVars.retryTotaltime} ms`);
        return;
      }
      this.socket = net.connect({
        port: this.port,
        host: this.host
      }) ;
      this.socket.setKeepAlive(true) ;
      this.installListeners(this.socket) ;

      this.reconnectVars.retryTimer = null;
    }, this.reconnectVars.retryDelay);
  }

  send(socket: any, msg: any) {
    const msgId = uuidV4() ;
    const s = msgId + '|' + msg ;
    socket.write(Buffer.byteLength(s, 'utf8') + '#' + s, () => {
      debug(`wp#send ${this.host}:${this.port} - ${s.length}#${s}`);
    }) ;
    this._logger('===>' + CRLF + Buffer.byteLength(s, 'utf8') + '#' + s + CRLF) ;
    return msgId ;
  }

  /*
   * Note: if you are wondering about the use of the spread operator,
   * it is because we can get SIP messages with things like emojis in them;
   * i.e. UTF8-encoded strings.
   * See https://mathiasbynens.be/notes/javascript-unicode#other-grapheme-clusters for background
   */
  _onData(socket: any, msg: any) {
    /*
    If we blindly pass in the data to the logging function
    without debugging enabled, the overhead of converting every message to a string
    is high.
    */
    if (debug.enabled) {
      const strval = msg.toString('utf8') ;
      this._logger(`<===${CRLF}${strval}${CRLF}`) ;
      debug(`<===${strval}`) ;
    }

    if (!this.mapIncomingMsg.has(socket)) {
      this.mapIncomingMsg.set(socket, {
        incomingMsg: Buffer.alloc(0),
        length: -1
      });
    }
    const obj = this.mapIncomingMsg.get(socket);

    // Append newly received buffer
    obj.incomingMsg = Buffer.concat([obj.incomingMsg, msg]);
    let index = obj.incomingMsg.indexOf('#');

    while (index > 0) {
      // Second check, if the parseInt fail then this is a big error
      const messageSize = parseInt(obj.incomingMsg.toString('utf8', 0, index));
      if (messageSize > Number.MAX_SAFE_INTEGER || messageSize == undefined
          || messageSize <= 0 || isNaN(messageSize)) {
        const err = new Error(`invalid message, missing length specifier: '${obj.incomingMsg}'`);
        if (this.isServer) {
          console.error(`invalid client message, closing socket: ${err}`);
          this.disconnect(socket);
        }
        else throw err;
      }

      const start = index + 1;
      const byteLength = obj.incomingMsg.length;
      const totalSize = start + messageSize;

      if (byteLength < totalSize)
        return;

      // The + 1 is because of the # separator
      const messageString = obj.incomingMsg.toString('utf8', start, totalSize);
      try {
        this.emit('msg', socket, messageString);
      } catch (err) {
        if (this.isServer) {
          console.error(`invalid client message, closing socket: ${err}`);
          this.disconnect(socket);
        }
        else throw err;
      }

      obj.incomingMsg = obj.incomingMsg.subarray(totalSize);
      index = obj.incomingMsg.indexOf('#');
    }
    // We need more data to build a full message
  }

  disconnect(socket: any) {
    this.closing = true ;
    this.mapIncomingMsg.delete(socket);
    if (!socket) { throw new Error('socket is not connected or was not provided') ; }
    this._stopPinging(socket);
    socket.end() ;
  }

  close(callback: any) {
    assert.ok(this.isServer, 'WireProtocol#close only valid in outbound connection (server) mode');
    this.server.close(callback) ;
  }

} ;
