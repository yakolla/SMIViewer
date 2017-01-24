
var layerCount = 0;
var layers = {};
$(document).ready(function () {

    loadOptions();

    
    var str = $("body pre").text();

    var info = getNextSMIText(str, 0, str.length);    
    lazyLoading(str, info);
    $(document).mousedown(function (e) {
        
        return true;
    });
});

function lazyLoading(str, info)
{
    setTimeout(function () {
        if (info != null) {
            var smiLayer = layers[info.langType];
            if (null == smiLayer) {
                smiLayer = createSMILayer(100, 250 * layerCount);
                layers[info.langType] = smiLayer;
                ++layerCount;
            }

            smiLayer.innerHTML += "<p>" + info.smiText + "</p>";
            info = getNextSMIText(str, info.posNextSyncStartTag, str.length);
            lazyLoading(str, info);
        }
    }, 1);
}

function createSMILayer(x, y) {

    var myLayer = document.createElement('div');
    myLayer.id = 'smiLayer';
    document.body.appendChild(myLayer);

    var myLayerContents = document.createElement('div');
    myLayerContents.id = 'smiLayerContents';
    myLayer.appendChild(myLayerContents);

    var myLayerArrowB = document.createElement('div');
    myLayerArrowB.id = 'smiLayerArrowB';
    myLayer.appendChild(myLayerArrowB);

    var myLayerArrowF = document.createElement('div');
    myLayerArrowF.id = 'smiLayerArrowF';
    myLayer.appendChild(myLayerArrowF);

    myLayer.style.left = x;
    myLayer.style.top = y;
    return myLayer;
}

function loadOptions() {
    var keys = [];  // 불러올 항목들의 이름

    chrome.storage.local.get(keys, function (options) {
        $.each(options, function (key, data) {

        });
    });
}

function getNextSMIText(rawData, posStart, posEnd)
{
    var str = rawData.substring(posStart, posEnd);
    var posSyncStartTag = str.search("<SYNC");
    if (posSyncStartTag == -1)
        return null;
    
    var posABSSyncStartTag = posStart + posSyncStartTag;

    str = str.substring(posSyncStartTag, str.length);
    var posSyncEndTag = str.search(">");
    if (posSyncEndTag == -1)
        return null;

    var posABSSyncEndTag = posABSSyncStartTag + posSyncEndTag;

    str = str.substring(posSyncEndTag, str.length);
    var posPStartTag = str.search("<P");
    if (posPStartTag == -1)
        return null;

    var posABSPStartTag = posABSSyncEndTag + posPStartTag;

    str = str.substring(posPStartTag, str.length);
    var posPEndTag = str.search(">");
    if (posPEndTag == -1)
        return null;

    var classRawStr = str.substring(posPStartTag, posPEndTag);
    var posClassEqual = classRawStr.search("=");
    var langType = classRawStr.substring(posClassEqual+1, posPEndTag);

    var posABSPEndTag = posABSPStartTag + posPEndTag;

    str = str.substring(posPEndTag, str.length);
    var textLength = str.length;
    var posNextSyncStartTag = str.search("<SYNC");
    if (posNextSyncStartTag > -1)
        textLength = posNextSyncStartTag;

    var posABSNextSyncStartTag = posABSPEndTag + posNextSyncStartTag;

    return { smiText: str.substring(1, textLength), posSyncStartTag: posABSSyncStartTag, posSyncEndTag: posABSSyncEndTag, posPStartTag: posABSPStartTag, posPEndTag: posABSPEndTag, posNextSyncStartTag: posABSNextSyncStartTag, langType: langType };
}