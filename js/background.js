chrome.action.onClicked.addListener(function (tab, url) {
    chrome.tabs.create({ 'url': chrome.runtime.getURL('options.html') })
})
