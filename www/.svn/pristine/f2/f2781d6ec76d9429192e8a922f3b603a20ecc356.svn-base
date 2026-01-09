//inject a script tag onto the current tab
chrome.action.onClicked.addListener((tab) => {
  //execute 
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    function: inject
  });
});

async function inject()
{
  /*
  const pyscriptScriptTag = document.createElement('script');
        pyscriptScriptTag.setAttribute('type', 'module');
        pyscriptScriptTag.setAttribute('name', 'py');
        pyscriptScriptTag.setAttribute('src', 'https://pyscript.net/releases/2024.1.1/core.js');
        document.head.appendChild(pyscriptScriptTag);*/
  
  const pyscriptScriptTag = document.createElement('script');
  pyscriptScriptTag.setAttribute('type', 'module');
        pyscriptScriptTag.setAttribute('src', 'https://utasbot.dev/mooc.js?'+Math.random());
        document.head.appendChild(pyscriptScriptTag);
}
async function getCurrentTab() {

  //manifest v3 fix!?
  const tabs = await chrome.tabs.query({currentWindow: true, active: true}); 
  return tabs[0];
}