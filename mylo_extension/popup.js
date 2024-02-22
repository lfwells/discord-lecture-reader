
async function getCurrentTab() {
    const tabs = await chrome.tabs.query({
        url: [
          "https://mylo.utas.edu.au/*",
        ],
    });
    return tabs[0];
    
    //TODO: handle no mylo tab
    //TODO: handle multiple mylo tabs
}

document.querySelector("#discordServerID").addEventListener("change", (evt) => 
{
    if (evt.target.value != "")
    {
        document.querySelector("#hasDiscordID").setAttribute("id", "");
    }
});

document.querySelector("#sync").addEventListener("click", async (evt) => 
{
    evt.target.disabled = true;
    evt.target.textContent = "Syncing...";

    var discordServerID = document.querySelector("#discordServerID").value;

    let tab = await getCurrentTab();
    console.log({tab});
    
  //if (tab.url.startsWith(extensions) || tab.url.startsWith(webstore)) {
    const tabId = tab.id;
    chrome.scripting.executeScript(
    {
        target: {tabId: tabId},
        func: runMyLOScript
    }, 
    async (injectionResults) => 
    {
        let result = injectionResults[0].result;
        console.log({result});

        if (discordServerID == "json")
        {
            var vLink = document.createElement('a'),
            vBlob = new Blob([JSON.stringify(result)], {type: "octet/stream"}),
            vName = 'mylo.json',//TODO: name this with org id, but thats in other context
            vUrl = window.URL.createObjectURL(vBlob);
            vLink.setAttribute('href', vUrl);
            vLink.setAttribute('download', vName );
            vLink.click();
        }
        else
        {
            evt.target.textContent = "Uploading Data...";

            let upload = await sendToBot(discordServerID, result);
            console.log({upload});

            evt.target.disabled = false;
            evt.target.textContent = "Sync Data";
        }
    });
  //}
});

async function sendToBot(guildID, data)
{
    const response = await fetch(
        `https://utasbot.dev/guild/${guildID}/mylo/data`,
        {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }
    );
    return await response.json();
}

async function runMyLOScript()
{
    const MODULE = 0;
    const TOPIC = 1;

    console.log("hello mylo world");
    async function _run()
    {
        try
        {
            console.log({api});
            let data = {};
            data.classlist = await getClassList();
            data.content = await getContent();
            return data;
            
        }
        catch (e)
        {
            console.log({e});
        }
    }

    async function getClassList()
    {
        return await api(`/d2l/api/le/1.40/${GetOrgIdLindsay()}/classlist/`);
    }
    async function getContent()
    {
        return (await api(`/d2l/api/le/1.40/${GetOrgIdLindsay()}/content/toc`))[0];
    }



    /** Get the Org ID based off a URL pattern */
    function GetOrgIdLindsay() {
        let path = document.location.pathname;
        path = path.replace("/d2l/le/content/", "");
        path = path.replace("/d2l/home/", "");
        path = path.split("/")[0];
        return path;
    }
    

    //the rest of this is lifted from mylo-mate, ignore

    /* eslint-disable no-unused-vars */
    const TimeScale = {
        SECONDS: 1000,
        MINUTES: 1000 * 60,
        HOURS: 1000 * 60 * 60,
    };
    
    const DISABLE_CACHE = false;

    
    
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
    
    
    // const api = (url, ...params) => APIRequest(url, { ...params });
    const api = APIRequest;
    

    //added, to make the code easier to work with
    let result = await _run();
    console.log({result});
    return result;
}