var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ApiError, } from './types';
const sendBody = (method) => method === 'post' ||
    method === 'put' ||
    method === 'patch' ||
    method === 'delete';
function queryString(params) {
    const qs = [];
    const encode = (key, value) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value != null) {
            if (Array.isArray(value)) {
                value.forEach((value) => qs.push(encode(key, value)));
            }
            else {
                qs.push(encode(key, value));
            }
        }
    });
    if (qs.length > 0) {
        return `?${qs.join('&')}`;
    }
    return '';
}
function getPath(path, payload) {
    return path.replace(/\{([^}]+)\}/g, (_, key) => {
        const value = encodeURIComponent(payload[key]);
        delete payload[key];
        return value;
    });
}
function getQuery(method, payload, query) {
    let queryObj = {};
    if (sendBody(method)) {
        query.forEach((key) => {
            queryObj[key] = payload[key];
            delete payload[key];
        });
    }
    else {
        queryObj = Object.assign({}, payload);
    }
    return queryString(queryObj);
}
function getHeaders(init) {
    const headers = new Headers(init);
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
        headers.append('Accept', 'application/json');
    }
    return headers;
}
function getBody(method, payload) {
    const body = sendBody(method) ? JSON.stringify(payload) : undefined;
    return method === 'delete' && body === '{}' ? undefined : body;
}
function mergeRequestInit(first, second) {
    const headers = new Headers(first === null || first === void 0 ? void 0 : first.headers);
    const other = new Headers(second === null || second === void 0 ? void 0 : second.headers);
    for (const key of other.keys()) {
        const value = other.get(key);
        if (value != null) {
            headers.set(key, value);
        }
    }
    return Object.assign(Object.assign(Object.assign({}, first), second), { headers });
}
function getFetchParams(request) {
    var _a;
    const payload = Object.assign({}, request.payload);
    const path = getPath(request.path, payload);
    const query = getQuery(request.method, payload, request.queryParams);
    const headers = getHeaders((_a = request.init) === null || _a === void 0 ? void 0 : _a.headers);
    const url = request.baseUrl + path + query;
    const init = Object.assign(Object.assign({}, request.init), { method: request.method.toUpperCase(), headers, body: getBody(request.method, payload) });
    return { url, init };
}
function getResponseData(response) {
    return __awaiter(this, void 0, void 0, function* () {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            return yield response.json();
        }
        if (contentType && contentType.indexOf('application/pdf') !== -1) {
            return yield response.arrayBuffer();
        }
        const text = yield response.text();
        try {
            return JSON.parse(text);
        }
        catch (e) {
            return text;
        }
    });
}
function fetchJson(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(url, init);
        const data = yield getResponseData(response);
        const result = {
            headers: response.headers,
            url: response.url,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data,
        };
        if (result.ok) {
            return result;
        }
        throw new ApiError(result);
    });
}
function wrapMiddlewares(middlewares, fetch) {
    const handler = (index, url, init) => __awaiter(this, void 0, void 0, function* () {
        if (middlewares == null || index === middlewares.length) {
            return fetch(url, init);
        }
        const current = middlewares[index];
        init = init || { headers: getHeaders() };
        return yield current(url, init, (nextUrl, nextInit) => handler(index + 1, nextUrl, nextInit));
    });
    return (url, init) => handler(0, url, init);
}
function fetchUrl(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const { url, init } = getFetchParams(request);
        const response = yield request.fetch(url, init);
        return response;
    });
}
function createFetch(fetch) {
    const fun = (payload, init) => __awaiter(this, void 0, void 0, function* () {
        try {
            return yield fetch(payload, init);
        }
        catch (err) {
            if (err instanceof ApiError) {
                throw new fun.Error(err);
            }
            throw err;
        }
    });
    fun.Error = class extends ApiError {
        constructor(error) {
            super(error);
            Object.setPrototypeOf(this, new.target.prototype);
        }
        getActualType() {
            return {
                status: this.status,
                data: this.data,
            };
        }
    };
    return fun;
}
function fetcher() {
    let baseUrl = '';
    let defaultInit = {};
    const middlewares = [];
    const fetch = wrapMiddlewares(middlewares, fetchJson);
    return {
        configure: (config) => {
            baseUrl = config.baseUrl || '';
            defaultInit = config.init || {};
            middlewares.splice(0);
            middlewares.push(...(config.use || []));
        },
        use: (mw) => middlewares.push(mw),
        path: (path) => ({
            method: (method) => ({
                create: ((queryParams) => createFetch((payload, init) => fetchUrl({
                    baseUrl: baseUrl || '',
                    path: path,
                    method: method,
                    queryParams: Object.keys(queryParams || {}),
                    payload,
                    init: mergeRequestInit(defaultInit, init),
                    fetch,
                }))),
            }),
        }),
    };
}
export const Fetcher = {
    for: () => fetcher(),
};
//# sourceMappingURL=fetcher.js.map