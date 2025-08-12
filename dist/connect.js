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
const events_1 = require("events");
const proto = __importStar(require("./proto"));
const utils_merge_1 = __importDefault(require("utils-merge"));
const sip_methods_1 = __importDefault(require("sip-methods"));
const drachtio_agent_1 = __importDefault(require("./drachtio-agent"));
const request_1 = __importDefault(require("./request"));
const response_1 = __importDefault(require("./response"));
const on_send_1 = __importDefault(require("./on-send"));
function createServer() {
    const app = (req, res, next) => {
        app.handle(req, res, next);
    };
    app.method = '*';
    (0, utils_merge_1.default)(app, proto);
    (0, utils_merge_1.default)(app, events_1.EventEmitter.prototype);
    app.stack = [];
    app.params = {};
    app._cachedEvents = [];
    app.routedMethods = {};
    app.locals = Object.create(null);
    for (let i = 0; i < arguments.length; ++i) {
        app.use(arguments[i]);
    }
    //create methods app.invite, app.register, etc..
    sip_methods_1.default.forEach((method) => {
        app[method.toLowerCase()] = app.use.bind(app, method.toLowerCase());
    });
    //special handling for cdr events
    app.on = function (event, listener) {
        if (0 === event.indexOf('cdr:')) {
            if (app.client) {
                app.client.on(event, (...args) => {
                    events_1.EventEmitter.prototype.emit.apply(app, [event, ...args]);
                });
            }
            else {
                this._cachedEvents.push(event);
            }
        }
        //delegate all others to standard EventEmitter prototype
        return events_1.EventEmitter.prototype.addListener.call(app, event, listener);
    };
    return app;
}
createServer.Agent = drachtio_agent_1.default;
createServer.Request = request_1.default;
createServer.Response = response_1.default;
createServer.onSend = on_send_1.default;
exports.default = createServer;
//# sourceMappingURL=connect.js.map