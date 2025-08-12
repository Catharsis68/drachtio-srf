import status_codes from 'sip-status';

/**
 * Execute a listener when a response is about to be sent.
 *
 * @param {Object} res
 * @return {Function} listener
 * @api public
 */

export default function onSend(res: any, listener: any) {
  if (!res) {
    throw new TypeError('argument res is required') ;
  }

  if (typeof listener !== 'function') {
    throw new TypeError('argument listener must be a function') ;
  }

  res.send = createSend(res.send, listener) ;
} ;

function createSend(prevSend: any, listener: any) {
  let fired = false ;

  return function send(this: any, ...args: any[]) {
    if (!fired) {
      fired = true ;

      const newArgs = normalizeSendArgs.apply(this, args as any) ;
      listener.apply(this, newArgs) ;
    }
    prevSend.apply(this, args) ;
  } ;
}

function normalizeSendArgs(this: any, ...args: any[]) {
  const newArgs: any[] = [] ;
  for (let i = 0; i < args.length; i++) {
    if (typeof args[i] === 'function') { break ; }
    if (typeof args[i] === 'number') { newArgs.push(args[i]) ; }
    else if (typeof args[i] === 'string') { newArgs.push(args[i]) ; }
    else if (typeof args[i] === 'object') {
      if (newArgs.length === 0) {
        newArgs.push(this.status) ;
        newArgs.push(status_codes[this.status]) ;
      }
      else if (newArgs.length === 1) {
        newArgs.push(status_codes[this.status]) ;
      }
      newArgs.push(args[i]) ;
    }
  }
  if (0 === newArgs.length) { newArgs.push(this.status); }
  if (1 === newArgs.length) { newArgs.push(status_codes[newArgs[0]]) ; }
  if (2 === newArgs.length) { newArgs.push({}) ; }

  return newArgs ;
}
