var hash = window.location.hash;
var shouldCreateNewTab = true;

var id = chrome.app.getDetails().id;
var htmlPage = '/smiviewer_client.html';
var tabUrl = 'chrome-extension://' + id + htmlPage;

chrome.windows.getCurrent(function (currentWindow) {
  var extensionsTabs = chrome.extension.getViews({type: "tab", windowId: currentWindow.id});
  var launcher = extensionsTabs
      .find(function (extensionTab) {
          return extensionTab.location.pathname === '/smiviewer_launcher.html';
      });

  extensionsTabs.forEach(function (extensionTab) {
    if (extensionTab.location.pathname === htmlPage && shouldCreateNewTab) {

      shouldCreateNewTab = false;
      if (hash && extensionTab.location.hash !== hash) {
        chrome.tabs.update(extensionTab.dhcChromeTabId, {active: true, url: tabUrl + hash});

      } else {
        chrome.tabs.update(extensionTab.dhcChromeTabId, {active: true});

      }
    }
  });

  if (shouldCreateNewTab) {
    chrome.tabs.create({
      url: tabUrl + hash
    });
  }

  if (launcher) {
    launcher.close();
  }
  window.close();
});

