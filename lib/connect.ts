import { EventEmitter } from 'events';
import * as proto from './proto';
import merge from 'utils-merge';
import methods from 'sip-methods';
import DrachtioAgent from './drachtio-agent';
import Request from './request';
import Response from './response';
import onSend from './on-send';
import { SrfRequest, SrfResponse, ConnectApp } from './types';

function createServer(): ConnectApp {
  const app: any = (req: SrfRequest, res: SrfResponse, next: () => void) => {
    app.handle(req, res, next);
  };
  app.method = '*';
  merge(app, proto);
  merge(app, EventEmitter.prototype);
  app.stack = [];
  app.params = {};
  app._cachedEvents = [] ;
  app.routedMethods = {} ;
  app.locals = Object.create(null);
  for (let i = 0; i < arguments.length; ++i) {
    app.use(arguments[i]);
  }

  //create methods app.invite, app.register, etc..
  methods.forEach((method: string) => {
    (app as any)[method.toLowerCase()] = app.use.bind(app, method.toLowerCase()) ;
  }) ;

  //special handling for cdr events
  app.on = function(event: string, listener: (...args: any[]) => void): any {
    if (0 === event.indexOf('cdr:')) {
      if (app.client) {
        app.client.on(event, (...args: any[]) => {
          EventEmitter.prototype.emit.apply(app, [event, ...args]) ;
        }) ;
      }
      else {
        this._cachedEvents.push(event) ;
      }
    }
    //delegate all others to standard EventEmitter prototype
    return EventEmitter.prototype.addListener.call(app, event, listener) ;
  } ;

  return app;
}

(createServer as any).Agent = DrachtioAgent;
(createServer as any).Request = Request;
(createServer as any).Response = Response;
(createServer as any).onSend = onSend;

export default createServer;
