chrome.runtime.onInstalled.addListener(() => {
    /*chrome.action.setBadgeText({
      text: "OFF",
    });*/
});

chrome.action.onClicked.addListener(async (tab) => 
{
    let OrgID = 505363;//TODO: get this from URL
  //if (tab.url.startsWith(extensions) || tab.url.startsWith(webstore)) {
    const tabId = tab.id;
    chrome.scripting.executeScript(
    {
        target: {tabId: tabId},
        func: runMyLOScript,
        args: [OrgID]
    });
  //}
});

async function runMyLOScript(OrgID)
{

    console.log("hello mylo world");
    async function _run()
    {
        console.log({api});
        const classlist = await api(`/d2l/api/le/1.40/${OrgID}/classlist/`);
        console.log({classlist});
    }


    //the rest of this is lifted from mylo-mate, ignore

    /* eslint-disable no-unused-vars */
    const TimeScale = {
        SECONDS: 1000,
        MINUTES: 1000 * 60,
        HOURS: 1000 * 60 * 60,
    };
    
    const DISABLE_CACHE = false;
    
    const until = rule =>
        new Promise(resolve => {
        const check = r => {
            const rule = r();
            if (rule) {
            resolve(rule);
            } else {
            window.requestAnimationFrame(() => check(r));
            }
        };
        check(rule);
        });
    
    const wildcard = rule => new RegExp('^' + rule.split('*').join('.*') + '$');
    
    const AsArray = data => (data == null ? null : Array.isArray(data) ? data : [data]);
    
    const WaitForTinyMCE = () =>
        new Promise(res => {
        if (window.tinymce?.activeEditor?.dom?.doc) res();
        else
            document.addEventListener('TinyMCE_Init', () => {
            tinymce.activeEditor.on('LoadContent', res);
            });
        });
    
    class APICache {
        constructor(timeUntilStale = 10 * TimeScale.SECONDS) {
        this.ver = 1;
        this.expiry = timeUntilStale;
    
        let resolve;
        let reject;
        let db = null;
    
        this.db = new Promise((res, rej) => {
            if (db != null) {
            res(db);
            } else {
            resolve = res;
            reject = rej;
            }
        });
    
        const createStore = ref => {
            if (!ref.objectStoreNames.contains('cache')) {
            ref.createObjectStore('cache');
            }
        };
    
        const req = indexedDB.open('api-cache', this.ver, createStore);
        req.onsuccess = () => {
            db = req.result;
            db.onerror = err => reject(err);
            resolve(db);
        };
    
        req.onupgradeneeded = e => createStore(e.target.result);
        }
    
        get(key) {
        return new Promise(async res => {
            const db = await this.db;
            const result = db.transaction('cache', 'readonly').objectStore('cache').get(key);
            result.onerror = e => {
            console.error(e);
            res(null);
            };
            result.onsuccess = e => {
            const payload = e.target.result;
            if (payload && Date.now() <= payload.expired) res(payload.value);
            else res(null);
            };
        });
        }
    
        async set(key, value, expiry = this.expiry) {
        const db = await this.db;
        const tx = db.transaction('cache', 'readwrite');
        const store = tx.objectStore('cache');
        const payload = { value, expired: Date.now() + expiry };
        store.put(payload, key);
        return tx.complete;
        }
    }
    
    const db = new APICache();
    
    const SafeURL = url => {
        const parts = url.split('/');
        const file = parts.pop();
        const bits = file.split('?');
        bits[0] = encodeURIComponent(bits[0]);
        return parts.concat(bits.join('?')).join('/');
    };
    const fn = () => {};
    
    const ajax = async (url, { mode = 'GET', token = '', type = 'text', cb = fn } = {}) => {
        const href = SafeURL(url);
        const headers = { method: mode };
        if (token && token.trim().length > 0) {
        headers.headers = { Authorization: `Bearer ${token}` };
        }
    
        const res = await fetch(href, headers).catch(v => null);
        if (res == null) {
        // Something went wrong with the network request.
        console.warn('Error communicating with API endpoint "%s"', url);
        return;
        }
        if (res.ok) {
        const data = type === 'text' ? await res.text() : type === 'blob' ? await res.blob() : await res.json();
        cb(data);
        return data;
        } else {
        return;
        // throw new Error(`${res.status}: ${res.statusText} - ${await res.text()}`);
        }
    };
    
    const APIRequest = (
        url,
        {
        fresh = false,
        first = false,
        token,
        type = 'json',
        passthrough,
        callback = () => {},
        callbackPerLoop = false,
        expiry = 10 * TimeScale.SECONDS,
        cacheOnly = false,
        } = {}
    ) => {
        const page = url =>
        new Promise(async (resolve, reject) => {
            let stack = [];
    
            async function getStack(url, done = fn, bookmark = '') {
            try {
                const href = url + bookmark;
                const cached = await db.get(href);
                let res = null;
    
                const request = async () => {
                try {
                    res = await ajax(href, { token, type });
                    db.set(href, res, expiry);
                } catch (e) {
                    res = null;
                    console.error(e);
                }
                };
    
                if (cacheOnly) {
                res = cached;
                }
    
                // const start = performance.now();
                if (!DISABLE_CACHE && !fresh && cached != null) {
                if (cached.Errors) {
                    await request();
                } else {
                    res = cached;
                }
                } else {
                await request();
                }
    
                // console.log(`Fetched ${href} in ${performance.now() - start}ms`);
                if (!res) {
                done();
                return false;
                } else if (res.Items) {
                stack = stack.concat(res.Items);
                if (callbackPerLoop) callback();
                if (res.PagingInfo && res.PagingInfo.HasMoreItems)
                    getStack(url, done, `${url.includes('?') ? '&' : '?'}bookmark=${res.PagingInfo.Bookmark}`);
                else done();
                } else if (res.Objects) {
                stack = stack.concat(res.Objects);
                if (callbackPerLoop) callback();
                if (res.Next) getStack(res.Next, done);
                else done();
                } else if (res) {
                stack = stack.concat(res);
                if (callbackPerLoop) callback();
                done();
                return true;
                }
            } catch (e) {
                console.error('error');
                reject(e);
            }
            }
            try {
            getStack(url, () => resolve(passthrough ? [stack, passthrough] : stack));
            } catch (e) {
            throw e;
            }
        });
        if (!callbackPerLoop) callback();
        if (first) return page(url).then(e => e[0]);
        else return page(url);
    };
    
    const IsUnique = (v, i, a) => a.indexOf(v) === i;
    
    const apisend = async (url, data, { asSinglePayload = true, verb = 'POST', token = null, afterEach = () => {} } = {}) => {
        const href = SafeURL(url);
        const content = {
        headers: {
            'Authorization': `Bearer ${token || (await GetOAuth2Token())}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        },
        method: verb,
        };
    
        const req = async payload => {
        const r = fetch(href, payload).catch(e => {
            console.error(e);
            return null;
        });
        if (typeof afterEach == 'function') afterEach(r);
        return r;
        };
        if (asSinglePayload) return req({ ...content, body: JSON.stringify(data) });
        else {
        if (!Array.isArray(data))
            throw new TypeError(`If sending multiple requests, array of data is expected. Instead, got '${typeof data}'.`);
    
        return Promise.all(data.map(obj => req({ ...content, body: JSON.stringify(obj) })));
        }
    };
    
    // const api = (url, ...params) => APIRequest(url, { ...params });
    const api = APIRequest;
    
    /**
     * Run an RPC call
     * @param {string} url The RPC functions file to post to
     * @param {string} remoteFunctionName The name of the function to run
     * @param {string} params The parameters to pass to the RPC function
     */
    const CustomRPC = (url, remoteFunctionName, params) => {
        // Store the values as FormData
        const body = new FormData();
        // Pass the function name that will be run
        body.append('d2l_rf', remoteFunctionName);
        // Pass the required paramaters
        body.append('params', params);
        // Generate a hitcode and referrer token
        body.append('d2l_hitcode', window.localStorage.getItem('XSRF.HitCodeSeed') + ((new Date().getTime() + 1e8) % 1e8));
        body.append('d2l_referrer', window.localStorage.getItem('XSRF.Token'));
        // Flag that this is an RPC call
        body.append('d2l_action', 'rpc');
        // Send the request, and return the resulting promise.
        return fetch(url, { method: 'post', body });
    };
    /*
    window.location.searchParams = window.location.searchParams || {};
    window.location.search.split('&').forEach(qp => {
        let [key, value] = qp.split('=');
        if (key.startsWith('?')) key = key.substring(1);
        window.location.searchParams[key] = value;
    });
    */
    const promiseMe =
        (callback, callbackAsFirst = false) =>
        (...args) =>
        new Promise(res => {
            if (callbackAsFirst) callback(res, ...args);
            else callback(...args, res);
        });
    
    const wait = time => promiseMe(setTimeout, true);
    /** const wait = time => new Promise(resolve => setTimeout(resolve, time)); */
    
    const MyLOLayer = (url, { style = {}, load = () => {}, error = () => {} } = {}) => {
        try {
        const f = document.createElement('iframe');
        f.onload = () => load({ frame: f, win: f.contentWindow, dom: f.contentDocument });
        f.src = url;
        f.style.position = 'absolute';
        Object.keys(style).forEach(key => {
            f.style[key] = style[key];
        });
        f.style.display = style.display || 'none';
        document.body.appendChild(f);
        return f;
        } catch (e) {
        console.error(e);
        error();
        return null;
        }
    };
    
    const oldIncludes = String.prototype.includes;
    
    Object.defineProperty(Object.prototype, '__extend', {
        enumerable: false,
        writable: false,
        value(n, cb, force) {
        !this[n] || force
            ? Object.defineProperty(this, n, { enumerable: false, writable: false, value: cb })
            : console.warn('%s.prototype.%s already exists.', this, n);
        },
    });
    Array.prototype.__extend('unique', function () {
        const seen = {};
        return this.filter(item => (seen.hasOwnProperty(item) ? false : (seen[item] = true)));
    });
    /*
    // NodeList.prototype.__extend('unique', function(value=v=>v) { let seen = {}; return Array.from(this).filter(item => { let v = value(item); return seen.hasOwnProperty(v) ? false : (seen[v] = true) }) });
    Element.prototype.__extend('parent', function (target) {
        return this.closest(target);
    });
    HTMLElement.prototype.__extend('live', function (eventType, target, cb) {
        (this || document).addEventListener(
        eventType,
        e => {
            if (e.target.matches(target)) {
            cb.call(e.target, e);
            }
        },
        true
        );
    });*/
    String.prototype.__extend(
        'includes',
        function (match, position) {
        if (Array.isArray(match)) {
            return match.some(test => oldIncludes.apply(this, [test, position]));
        }
        return oldIncludes.apply(this, [match, position]);
        },
        true
    );
    Date.prototype.__extend('format', function (str) {
        const days = [
        { long: 'Sunday', short: 'Sun' },
        { long: 'Monday', short: 'Mon' },
        { long: 'Tuesday', short: 'Tue' },
        { long: 'Wednesday', short: 'Wed' },
        { long: 'Thursday', short: 'Thur' },
        { long: 'Friday', short: 'Fri' },
        { long: 'Saturday', short: 'Sat' },
        ];
        const months = [
        { long: 'January', short: 'Jan' },
        { long: 'Feburary', short: 'Feb' },
        { long: 'March', short: 'Mar' },
        { long: 'April', short: 'Apr' },
        { long: 'May', short: 'May' },
        { long: 'June', short: 'Jun' },
        { long: 'July', short: 'Jul' },
        { long: 'August', short: 'Aug' },
        { long: 'September', short: 'Sep' },
        { long: 'October', short: 'Oct' },
        { long: 'November', short: 'Nov' },
        { long: 'December', short: 'Dec' },
        ];
    
        const get12HourTime = pad => {
        const time = this.getHours() > 12 ? this.getHours() - 12 : this.getHours();
        if (pad) return time.toString().padStart(2, '0');
        return time;
        };
    
        const replacements = {
        '{day.long}': days[this.getDay()].long,
        '{day.short}': days[this.getDay()].short,
        '{date}': this.getDate(),
        '{date.pad}': this.getDate().toString().padStart(2, '0'),
        '{month.long}': months[this.getMonth()].long,
        '{month.short}': months[this.getMonth()].short,
        '{month.num}': this.getMonth() + 1,
        '{month.num.pad}': (this.getMonth() + 1).toString().padStart(2, '0'),
        '{year.long}': this.getFullYear(),
        '{year.short}': this.getFullYear() - 2000,
    
        '{hour}': get12HourTime(),
        '{hour.12}': get12HourTime(),
        '{hour.pad}': get12HourTime(true),
        '{hour.12.pad}': get12HourTime(true),
        '{hour.24}': this.getHours(),
        '{hour.24.pad}': this.getHours().toString().padStart(2, '0'),
        '{meridian}': this.getHours() > 11 ? 'PM' : 'AM',
        '{ampm}': this.getHours() > 11 ? 'PM' : 'AM',
    
        '{minute}': this.getMinutes().toString().padStart(2, '0'),
        '{second}': this.getSeconds().toString().padStart(2, '0'),
    
        '{ms}': this.getMilliseconds(),
        };
    
        return str.replace(/{([^]+?)}/gi, match => replacements[match.toLowerCase()] || match);
    });
    
    Object.defineProperty(URL.prototype, 'query', {
        enumerable: false,
        get() {
        return new Proxy(this, {
            get(obj, prop) {
            return obj.search
                .substr(1)
                .split('&')
                .reduce((o, p) => {
                let k = p.split('=').map(v => v.trim());
                o[k[0]] = decodeURIComponent(k[1]);
                return o;
                }, {})[prop];
            },
            set(obj, prop, value) {
            const props = obj.search
                .substr(1)
                .split('&')
                .reduce((o, p) => {
                let k = p.split('=').map(v => v.trim());
                o[k[0]] = decodeURIComponent(k[1]);
                return o;
                }, {});
            const clean = obj.href.replace(obj.search, '');
            props[prop] = value;
            obj.href = `${clean}?${Object.keys(props)
                .map(key => `${key}=${encodeURIComponent(props[key])}`)
                .join('&')}`;
            },
        });
        },
    });
    
    Object.defineProperty(Map.prototype, 'filter', {
        enumerable: false,
        value: function (predicate) {
        return new Map([...this].filter(predicate));
        },
    });
    
    // Replaces jQuery's $.extend for JSON objects.
    // function extend(...args) {
    //   // Go through each argument, ignoring the very first one (the one we're modifying).
    //   for (let i = 1; i < args.length; i++) {
    //     // For the keys in this argument, go through one by one
    //     Object.keys(args).forEach((k) => {
    //       // If both of these are objects, recurse the function
    //       if (typeof args[0][k] === 'object' && typeof args[i][k] === 'object') { extend(args[0][k], args[i][k]); }
    //       else { args[0][k] = args[i][k]; }
    //     });
    //   }
    //   return args[0];
    // }
    
    function extend(...args) {
        deepmerge(...args);
    }
    
    function PromisePoolItem(fn, ...args) {
        return () => fn(...args);
    }
    
    function PromisePool(pool, { concurrency = 5 } = {}) {
        return Promise.all(
        Array(concurrency)
            .fill(pool.entries())
            .map(async iter => {
            // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
            for (const [index, item] of iter) {
                await item();
            }
            })
        );
    }
    
    function _iterate(base) {
        let output = [],
        start = base;
        const loop = node => {
        if (node.Modules.length > 0) node.Modules.forEach(loop);
        if (node.Topics.length > 0) output = output.concat(node.Topics);
        };
        if (Array.isArray(start)) start.forEach(loop);
        else loop(start);
        return output;
    }
    
    /** Get the Org ID based off a URL pattern */
    function GetOrgId() {
        const { origin, href } = window.location;
        const urls = ['/d2l/le/content/:id/Home*', '/d2l/home/:id'];
    
        for (const url of urls) {
        const pattern = new URLPattern(url, origin);
        if (pattern.test(href)) return pattern.exec(href).pathname.groups.id;
        }
    
        return null;
    }
    
    async function GetUnitModule({ OrgID, TopicID }) {
        const data = await api(`/d2l/api/le/1.55/${OrgID}/content/toc`, { fresh: true, first: true });
        const toc = _iterate(data.Modules);
        return TopicID ? toc.find(module => module.Identifier == TopicID) : toc;
    }
    
    const plural = (count, singular, plural) => (count === 1 ? singular : plural ?? singular + 's');
    
    function FetchMMSettings() {
        return new Promise(async res => {
        if (chrome?.runtime?.id) {
            const store_defaults = await fetch(chrome.runtime.getURL('/config/default.json')).then(d => d.json());
            chrome.storage.sync.get(store_defaults, res);
        } else {
            const metaTag = document.head.querySelector('meta[name="mylo-mate"]');
            const extId = metaTag ? metaTag.getAttribute('content') : '';
            chrome.runtime.sendMessage(extId, { request: 'settings' }, res);
        }
        });
    }
    
    function SaveMMSettings(data) {
        return new Promise(async res => {
        if (chrome?.runtime?.id) chrome.storage.sync.set(data, res);
        else {
            const extId = document.head.querySelector('meta[name="mylo-mate"]')?.getAttribute('content') ?? '';
            chrome.runtime.sendMessage(extId, { request: 'settingsSave', data }, res);
        }
        });
    }
    
    const GetOAuth2Token = async () => {
        if (!window.localStorage['XSRF.Token']) return null;
    
        const existing = window.localStorage['D2L.Fetch.Tokens'];
        if (existing != null) {
        const data = JSON.parse(existing);
        if (data['*:*:*'] != null) {
            const body = data['*:*:*'];
            if (body.expires_at < Date.now() / 1000) {
            delete window.localStorage['D2L.Fetch.Tokens'];
            } else return body.access_token;
        }
        }
    
        const token = await fetch('/d2l/lp/auth/oauth2/token', {
        method: 'post',
        body: 'scope=*:*:*',
        credentials: 'include',
        headers: new Headers({
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Csrf-Token': window.localStorage['XSRF.Token'],
        }),
        }).then(data => data.json());
    
        window.localStorage.setItem('D2L.Fetch.Tokens', JSON.stringify({ '*:*:*': token }));
        return token.access_token;
    };
    
    const debounce = (cb, delay = 250, immediate = false) => {
        let timeout = null;
        return function exec() {
        let context = this;
        let args = arguments;
    
        const later = () => {
            timeout = null;
            if (!immediate) cb.apply(context, args);
        };
    
        const callNow = immediate && !timeout;
        if (timeout != null) clearTimeout(timeout);
        timeout = window.setTimeout(later, delay);
        if (callNow) cb.apply(context, args);
        };
    };
    
    const MathContain = (value, min, max) => Math.max(min, Math.min(value, max));
    
    /**
     * Basic file saving functionality.
     * @param {string} filename The name of the file to download. **Note**: Only applies if downloading local data. If downloading a remote file, the remote file name will take precedence.
     * @param {string} url The URL to download. Can be a remote file URL, `data` string, or local local Object URL.
     */
    const SaveFile = (filename, url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };
    
    /**
     * Retrieve the release conditions of an object from the API. Returns an array of textual representations, as provided by the Brightspace API.
     * @param {number} ou The Org ID of the unit you want to check inside
     * @param {string} type The type of object you're checking for. [See the docs](https://docs.valence.desire2learn.com/res/releaseconditions.html#term-TARGET_T) for specifics.
     * @param {number} objId The ID of the specific item you want to retrieve release conditions for.
     */
    const getReleaseConditions = async (ou, type, objId) => {
        const res = await api(`/d2l/api/lp/1.29/${ou}/conditionalRelease/conditions/${type}/${objId}`, {
        fresh: true,
        first: true,
        });
    
        return res?.Expression.ExpressionParams.Operands.map(op => op.Text.Text);
    };
    /*
    const DomChangeObserver = new MutationObserver(list => {
        for (const changed of list) {
        //console.log(changed);
        changed.target.dispatchEvent(new CustomEvent('dom-changed', { detail: changed }));
        }
    });
    
    DomChangeObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
    */
    // Polyfill for TC39 Proposal `.at` (https://github.com/tc39/proposal-relative-indexing-method)
    // Proposal is at Stage 3, so safe to implement; signature won't be changing.
    
    /**
     * Get element at `n` index. Supports negative indexes.
     * @param offset {number}: Index of element to get
     */
    function at(offset) {
        // ToInteger() abstract op
        offset = Math.trunc(offset) || 0;
        // Allow negative indexing from the end
        if (offset < 0) offset += this.length;
        // OOB access is guaranteed to return undefined
        if (offset < 0 || offset >= this.length) return undefined;
        // Otherwise, this is just normal property access
        return this[offset];
    }
    /*
    const ElementsToSupportItemPolyfill = [
        Array,
        String,
        Uint8Array,
        Uint16Array,
        Uint32Array,
        Uint8ClampedArray,
        BigUint64Array,
        NodeList,
        FileList,
    ];
    
    // Other TypedArray constructors omitted for brevity.
    for (let C of ElementsToSupportItemPolyfill) {
        Object.defineProperty(C.prototype, 'at', { value: at, writable: true, enumerable: false, configurable: true });
    }
    */
    class Files {
        constructor(orgid) {
        this.id = orgid;
        this.rpc = `/d2l/lp/manageFiles/rpc/rpc_functions.d2lfile?ou=${orgid}&d2l_rh=rpc&d2l_rt=call`;
        this.base = api(`/d2l/api/lp/1.26/courses/${orgid}`, { first: true, fresh: true }).then(d => d.Path);
        }
    
        _parse(req) {
        return req.then(d => d.text()).then(d => JSON.parse(d.replace('while(true){}', '')));
        //.then(d => {
        //console.log(d);
        //return d;
        //});
        }
    
        _normalize(path) {
        return path.replace(/\/+/g, '/');
        }
    
        *_iteratePath(path, base) {
        let parts = this._normalize(path.replace(base, '')).split('/');
        let components = base;
        for (const part of parts) {
            let snapshot = components.toString(); // Make a copy of the string prior to the changes.
    
            if (!components.endsWith('/')) components += '/';
            components += part;
            yield [snapshot, components];
        }
        return;
        }
    
        async DoesPathExist(path) {
        // We need to pull the final element of the path out and check it seperately
        const res = await this._parse(
            CustomRPC(
            this.rpc,
            'CheckUniqueName',
            `{"param1":"${path.replace(await this.base, '')}","param2":"${await this.base}","param3":"0"}`
            )
        );
        return res.Result == 1;
        }
    
        async CreateDirectory(path) {
        // We'll need to recursively do this, checking that each parent dir exists.
    
        // We'll have to get each sub directory name, and check that it exists.
        // If it doesn't, we'll create it, and continue on.
        const nodes = this._iteratePath(path, await this.base);
        for (const [prev, node] of nodes) {
            const exists = await this.DoesPathExist(node);
            if (exists) continue; // If the directory exists, no need to continue down in the creating process
    
            const dir = node.split('/').pop();
    
            const create = await this._parse(
            CustomRPC(this.rpc, 'CreateNewFolder', `{"param1":"Content","param2":"${prev}","param3":"0"}`)
            );
    
            if (create.Result == null) {
            throw new Error(`Error creating directory in "${prev}": ${JSON.stringify(create)}`);
            }
    
            const rename = await this._parse(
            CustomRPC(
                this.rpc,
                'DoRename',
                `{"param1":"${await this.base}","param2":"d_${create.Result.DirectoryId}","param3":"${dir}","param4":"0"}`
            )
            );
    
            if (rename.Result == null) {
            throw new Error(
                `Error renaming directory from "${create.Result.DirectoryId}" to "${node}": ${JSON.stringify(rename)}`
            );
            }
        }
        }
    
        async FileExists(file) {
        if (!file.startsWith('http')) {
            file = (await this.base) + file;
        }
    
        return fetch(file, { method: 'head', redirect: 'error' })
            .then(d => d.status == 200)
            .catch(() => false);
        }
    
        async UploadFile(path, file, blob) {
        const base = await this.base;
        if (!path.startsWith(base)) {
            if (path.startsWith('/')) path = path.substr(1);
            path = base + path;
        }
    
        // Check the directory structure first
        await this.CreateDirectory(path);
    
        // Handle uploading the file itself
        const fd = new FormData();
        fd.append('fileName', file);
        fd.append('d2l_referrer', window.localStorage.getItem('XSRF.Token'));
        fd.append('uploadFile', blob);
        const r = await fetch(`/d2l/lp/fileupload/${this.id}?maxFileSize=1073741824&isLastSlice=true`, {
            method: 'post',
            body: fd,
        });
    
        const res = await r.json();
    
        // Add the uploaded data to a specific directory
        const upload = await this._parse(
            CustomRPC(this.rpc, 'UploadFiles', `{"param1":"${path}","param2":["${res.File.FileId}"],"param3":[null],"param4":"0"}`)
        );
    
        if (upload.Result == null) {
            throw new Error(`Error uploading file to "${path}/${file}": ${JSON.stringify(upload)}`);
        }
    
        const newfile = upload.Result?.[0];
        if (!newfile.endsWith(file)) {
            const renamed = await this.Rename(path, newfile, file);
            if (renamed) return `${this.base}${path}/${file}`;
        }
    
        // Returns the path name if successful, or undefined if an error occured
        return newfile;
        }
    
        async Rename(path, oldName, newName) {
        const base = await this.base;
    
        if (!path.startsWith(base)) {
            if (path.startsWith('/')) {
            path = path.substr(1);
            }
    
            path = base + path;
        }
    
        const p = path + (path.endsWith('/') ? '' : '/');
    
        const rename = await this._parse(
            CustomRPC(this.rpc, 'DoRename', `{"param1":"${p}","param2":"f_${p}${oldName}","param3":"${newName}","param4":"0"}`)
        );
    
        return rename.Result != null;
        }
    
        async Delete(path, file) {
        const base = await this.base;
        path = path.startsWith(base) ? path : path + (base.startsWith('/') ? base.substr(1) : base);
        const p = path + (path.endsWith('/') ? '' : '/');
        const del = await this._parse(
            CustomRPC(this.rpc, 'DoDelete', `{"param1":"${p}","param2":"f_${p}${file}","param3":"0"}`)
        );
    
        return del.ResponseType === 0;
        }
    }
    
    /** ShadowDOM QuerySelector :: https://github.com/Georgegriff/query-selector-shadow-dom v1.0.0 */
    const sdqs = (function (e) {
        'use strict';
        function r(e, u, s, a) {
        void 0 === a && (a = null),
            (e = (function (e) {
            function t() {
                r && (0 < u.length && /^[~+>]$/.test(u[u.length - 1]) && u.push(' '), u.push(r));
            }
            var n,
                r,
                l,
                o,
                u = [],
                s = [0],
                a = 0,
                h = /(?:[^\\]|(?:^|[^\\])(?:\\\\)+)$/,
                i = /^\s+$/,
                c = [/\s+|\/\*|["'>~+[(]/g, /\s+|\/\*|["'[\]()]/g, /\s+|\/\*|["'[\]()]/g, null, /\*\//g];
            for (e = e.trim(); ; ) {
                if (((r = ''), ((l = c[s[s.length - 1]]).lastIndex = a), !(n = l.exec(e)))) {
                (r = e.substr(a)), t();
                break;
                }
                if (((o = a) < (a = l.lastIndex) - n[0].length && (r = e.substring(o, a - n[0].length)), s[s.length - 1] < 3)) {
                if ((t(), '[' === n[0])) s.push(1);
                else if ('(' === n[0]) s.push(2);
                else if (/^["']$/.test(n[0])) s.push(3), (c[3] = new RegExp(n[0], 'g'));
                else if ('/*' === n[0]) s.push(4);
                else if (/^[\])]$/.test(n[0]) && 0 < s.length) s.pop();
                else if (
                    /^(?:\s+|[~+>])$/.test(n[0]) &&
                    (0 < u.length && !i.test(u[u.length - 1]) && 0 === s[s.length - 1] && u.push(' '),
                    1 === s[s.length - 1] && 5 === u.length && '=' === u[2].charAt(u[2].length - 1) && (u[4] = ' ' + u[4]),
                    i.test(n[0]))
                )
                    continue;
                u.push(n[0]);
                } else
                (u[u.length - 1] += r),
                    h.test(u[u.length - 1]) &&
                    (4 === s[s.length - 1] &&
                        (u.length < 2 || i.test(u[u.length - 2]) ? u.pop() : (u[u.length - 1] = ' '), (n[0] = '')),
                    s.pop()),
                    (u[u.length - 1] += n[0]);
            }
            return u.join('').trim();
            })(e));
        var t = s.querySelector(e);
        return document.head.createShadowRoot || document.head.attachShadow
            ? !u && t
            ? t
            : h(e, ',').reduce(
                function (e, t) {
                    if (!u && e) return e;
                    var g,
                    d,
                    p,
                    n = h(t.replace(/^\s+/g, '').replace(/\s*([>+~]+)\s*/g, '$1'), ' ')
                        .filter(function (e) {
                        return !!e;
                        })
                        .map(function (e) {
                        return h(e, '>');
                        }),
                    r = n.length - 1,
                    l = i(n[r][n[r].length - 1], s, a),
                    o =
                        ((g = n),
                        (d = r),
                        (p = s),
                        function (e) {
                        for (
                            var t, n = d, r = e, l = !1;
                            r && (t = r).nodeType !== Node.DOCUMENT_FRAGMENT_NODE && t.nodeType !== Node.DOCUMENT_NODE;
    
                        ) {
                            var o = !0;
                            if (1 === g[n].length) o = r.matches(g[n]);
                            else
                            for (
                                var u = [].concat(g[n]).reverse(),
                                s = r,
                                a = u,
                                h = Array.isArray(a),
                                i = 0,
                                a = h ? a : a[Symbol.iterator]();
                                ;
    
                            ) {
                                var c;
                                if (h) {
                                if (i >= a.length) break;
                                c = a[i++];
                                } else {
                                if ((i = a.next()).done) break;
                                c = i.value;
                                }
                                var f = c;
                                if (!s || !s.matches(f)) {
                                o = !1;
                                break;
                                }
                                s = v(s, p);
                            }
                            if (o && 0 === n) {
                            l = !0;
                            break;
                            }
                            o && n--, (r = v(r, p));
                        }
                        return l;
                        });
                    return u ? (e = e.concat(l.filter(o))) : (e = l.find(o)) || null;
                },
                u ? [] : null
                )
            : u
            ? s.querySelectorAll(e)
            : t;
        }
        function h(e, n) {
        return e.match(/\\?.|^$/g).reduce(
            function (e, t) {
            return (
                '"' !== t || e.sQuote
                ? "'" !== t || e.quote
                    ? e.quote || e.sQuote || t !== n
                    ? (e.a[e.a.length - 1] += t)
                    : e.a.push('')
                    : ((e.sQuote ^= 1), (e.a[e.a.length - 1] += t))
                : ((e.quote ^= 1), (e.a[e.a.length - 1] += t)),
                e
            );
            },
            { a: [''] }
        ).a;
        }
        function v(e, t) {
        var n = e.parentNode;
        return n && n.host && 11 === n.nodeType ? n.host : n === t ? null : n;
        }
        function i(t, e, n) {
        void 0 === t && (t = null), void 0 === n && (n = null);
        var l = [];
        if (n) l = n;
        else {
            var r = function e(t) {
            for (var n = 0; n < t.length; n++) {
                var r = t[n];
                l.push(r), r.shadowRoot && e(r.shadowRoot.querySelectorAll('*'));
            }
            };
            e.shadowRoot && r(e.shadowRoot.querySelectorAll('*')), r(e.querySelectorAll('*'));
        }
        return t
            ? l.filter(function (e) {
                return e.matches(t);
            })
            : l;
        }
        return (
        (e.querySelectorAllDeep = function (e, t, n) {
            return void 0 === t && (t = document), void 0 === n && (n = null), r(e, !0, t, n);
        }),
        (e.querySelectorDeep = function (e, t, n) {
            return void 0 === t && (t = document), void 0 === n && (n = null), r(e, !1, t, n);
        }),
        (e.collectAllElementsDeep = i),
        e
        );
    })({});
    
    (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined'
        ? (module.exports = factory())
        : typeof define === 'function' && define.amd
        ? define(factory)
        : ((global = global || self), (global.deepmerge = factory()));
    })(this, function () {
        'use strict';
    
        var isMergeableObject = function isMergeableObject(value) {
        return isNonNullObject(value) && !isSpecial(value);
        };
    
        function isNonNullObject(value) {
        return !!value && typeof value === 'object';
        }
    
        function isSpecial(value) {
        var stringValue = Object.prototype.toString.call(value);
    
        return stringValue === '[object RegExp]' || stringValue === '[object Date]' || isReactElement(value);
        }
    
        // see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
        var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
        var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;
    
        function isReactElement(value) {
        return value.$$typeof === REACT_ELEMENT_TYPE;
        }
    
        function emptyTarget(val) {
        return Array.isArray(val) ? [] : {};
        }
    
        function cloneUnlessOtherwiseSpecified(value, options) {
        return options.clone !== false && options.isMergeableObject(value)
            ? deepmerge(emptyTarget(value), value, options)
            : value;
        }
    
        function defaultArrayMerge(target, source, options) {
        return target.concat(source).map(function (element) {
            return cloneUnlessOtherwiseSpecified(element, options);
        });
        }
    
        function getMergeFunction(key, options) {
        if (!options.customMerge) {
            return deepmerge;
        }
        var customMerge = options.customMerge(key);
        return typeof customMerge === 'function' ? customMerge : deepmerge;
        }
    
        function getEnumerableOwnPropertySymbols(target) {
        return Object.getOwnPropertySymbols
            ? Object.getOwnPropertySymbols(target).filter(function (symbol) {
                return target.propertyIsEnumerable(symbol);
            })
            : [];
        }
    
        function getKeys(target) {
        return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
        }
    
        function propertyIsOnObject(object, property) {
        try {
            return property in object;
        } catch (_) {
            return false;
        }
        }
    
        // Protects from prototype poisoning and unexpected merging up the prototype chain.
        function propertyIsUnsafe(target, key) {
        return (
            propertyIsOnObject(target, key) && // Properties are safe to merge if they don't exist in the target yet,
            !(
            Object.hasOwnProperty.call(target, key) && // unsafe if they exist up the prototype chain,
            Object.propertyIsEnumerable.call(target, key)
            )
        ); // and also unsafe if they're nonenumerable.
        }
    
        function mergeObject(target, source, options) {
        var destination = {};
        if (options.isMergeableObject(target)) {
            getKeys(target).forEach(function (key) {
            destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
            });
        }
        getKeys(source).forEach(function (key) {
            if (propertyIsUnsafe(target, key)) {
            return;
            }
    
            if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
            destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
            } else {
            destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
            }
        });
        return destination;
        }
    
        function deepmerge(target, source, options) {
        options = options || {};
        options.arrayMerge = options.arrayMerge || defaultArrayMerge;
        options.isMergeableObject = options.isMergeableObject || isMergeableObject;
        // cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
        // implementations can use it. The caller may not replace it.
        options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
    
        var sourceIsArray = Array.isArray(source);
        var targetIsArray = Array.isArray(target);
        var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
    
        if (!sourceAndTargetTypesMatch) {
            return cloneUnlessOtherwiseSpecified(source, options);
        } else if (sourceIsArray) {
            return options.arrayMerge(target, source, options);
        } else {
            return mergeObject(target, source, options);
        }
        }
    
        deepmerge.all = function deepmergeAll(array, options) {
        if (!Array.isArray(array)) {
            throw new Error('first argument should be an array');
        }
    
        return array.reduce(function (prev, next) {
            return deepmerge(prev, next, options);
        }, {});
        };
    
        var deepmerge_1 = deepmerge;
    
        return deepmerge_1;
    });
    
    /**
     * Format bytes as human-readable text.
     *
     * @param bytes Number of bytes.
     * @param si True to use metric (SI) units, aka powers of 1000. False to use binary (IEC), aka powers of 1024.
     * @param dp Number of decimal places to display.
     * @param lowercaseUnit True to use lowercase units (b,kb,mb, etc). False to use uppercase units (B,KB,MB, etc).
     *
     * @return Formatted string.
     */
    const humanReadableFileSize = (bytes, si = false, places = 1, lowercaseUnit = false) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'].map(v => (lowercaseUnit ? v.toLowerCase() : v));
    
        const i = bytes == 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(si ? 1000 : 1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(places) * 1}${units[i]}`;
    };
    
    const UppercaseWord = word => word[0].toLocaleUpperCase() + word.substr(1);
    
    const _parsetemplatestring = (strings, args) => {
        let correct = '';
        for (let i = 0; i < strings.length; i++) {
        const a = args?.[i] ?? '';
        const arg = Array.isArray(a) ? a : [a];
        correct += strings[i] + arg.join('\n');
        }
        return correct.trim();
    };
    
    const html = (strings, ...args) => {
        const str = _parsetemplatestring(strings, args).trim();
    
        const container = document.createElement('div');
        container.innerHTML = str;
    
        /**
         * const render = new DOMParser().parseFromString(str, 'text/html');
         * const container = render.body;
         */
    
        /** if (container.innerHTML.startsWith(',')) debugger; */
    
        if (container.childNodes.length == 1) return container.childNodes[0];
        return Array.from(container.childNodes);
    };
    
    /**
     * const html = (strings, ...args) => {
     *   let str = '';
     *   let replacements = new Map();
     *   for (let i = 0; i < strings.length; i++) {
     *     str += strings[i];
     *
     *     let arg = args?.[i] ?? '';
     *     if (arg instanceof Node) arg = [arg];
     *
     *     if (Array.isArray(arg)) {
     *       for (const n of arg) {
     *         if (n instanceof Node) {
     *           const id = uuid();
     *           replacements.set(id, n);
     *           str += `<inline-replace-element data-id="${id}" />`;
     *         } else {
     *           str += n;
     *         }
     *       }
     *     } else {
     *       str += arg;
     *     }
     *   }
     *   str = str.trim();
     *
     *   const container = new DOMParser().parseFromString(str, 'text/html');
     *
     *   container.querySelectorAll('inline-replace-element').forEach(el => {
     *     const r = replacements.get(el.dataset.id);
     *     el.replaceWith(r);
     *   });
     *
     *   if (container.body.childNodes.length == 1) return container.body.childNodes[0];
     *   else return Array.from(container.body.childNodes);
     * };
     */
    
    /*
    const oldAppend = HTMLElement.prototype.append;
    Object.defineProperty(HTMLElement.prototype, 'append', {
        enumerable: false,
        value: function (...args) {
        return oldAppend.apply(this, [...args.flat()]);
        },
    });
    
    const styleId = uuid();
    window.style = (strings, ...args) => {
        const str = _parsetemplatestring(strings, args).trim();
    
        const el = document.head.querySelector(`style[data-custom-id="${styleId}"]`) ?? document.createElement('style');
        el.setAttribute('data-custom-id', styleId);
        el.innerHTML = (el.innerHTML + '\n\n' + str).trim();
    
        document.head.append(el);
        return el;
    };
    */

    //added, to make the code easier to work with
    await _run();
}