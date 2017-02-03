var debug = false;
var layerUICount = 0;
var layerUIs = {};
var sliderUI;
var allSyncTimes = [];
var subtitleSyncTimes = {};
var subtitleTexts = {};
var allSyncTimeIdx = -1;

$(document).ready(function () {

    loadOptions();

    Array.prototype.binaryIndexOf = binaryIndexOf;

    var str = $("body pre").text();
    var info = getNextSMIText(str, 0, str.length);
    if (info == null)
        return;

    sliderUI = createSMISlider();
    lazyLoading(str, info);
    
    $(document).mousedown(function (e) {
        //console.debug(subtitleSyncTimes);
        return true;
    });
});

function binaryIndexOf(searchElement) {
    
    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;
    var lowerIndex;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }
    
    lowerIndex = Math.abs(~minIndex) - 2;
    
    return lowerIndex;
}


function lazyLoading(str, info)
{
    if (info == null)
        return;
    
    setTimeout(function () {

        var syncTimes = subtitleSyncTimes[info.langType];
        if (syncTimes == null)
        {
            subtitleSyncTimes[info.langType] = [];
            subtitleTexts[info.langType] = {};

            syncTimes = subtitleSyncTimes[info.langType];
        }

        syncTimes.push(info.startTime);
        allSyncTimes.push(info.startTime);

        subtitleTexts[info.langType][info.startTime] = info.smiText;

        if (debug == true)
        {
            var smiLayer = layerUIs[info.langType];
            if (null == smiLayer) {
                smiLayer = createSMILayer(600, 250 * layerUICount);
                layerUIs[info.langType] = smiLayer;
                ++layerUICount;
            }
            smiLayer.innerHTML += "<p>" + info.startTime + ":" + info.smiText + "</p>";
        }
        
            
        var lastSyncTime = syncTimes[syncTimes.length - 1];
        if (sliderUI.smiSlider.max < lastSyncTime)
            sliderUI.smiSlider.max = lastSyncTime;

        // loading completed
        if (info.posNextSyncStartTag == -1) {
            allSyncTimes.sort(function (a, b) { return a - b; });
            return;
        }

        info = getNextSMIText(str, info.posNextSyncStartTag, str.length);
        lazyLoading(str, info);
        
    }, 1);
}

function createSMISlider()
{
    var smiLayer = createSMILayer(10, 0);

    var myLayer = document.createElement('div');
    document.body.appendChild(myLayer);
    smiLayer.appendChild(myLayer);

    var myPlayButton = document.createElement('button');
    myPlayButton.id = 'smiPlayButton';
    var myPlayText = document.createTextNode(">");    
    myPlayButton.appendChild(myPlayText);
    myLayer.appendChild(myPlayButton);

    var myPrevButton = document.createElement('button');
    myPrevButton.id = 'smiPrevButton';
    myPrevButton.appendChild(document.createTextNode("<-"));
    myLayer.appendChild(myPrevButton);

    var myNextButton = document.createElement('button');
    myNextButton.id = 'smiNextButton';
    myNextButton.appendChild(document.createTextNode("->"));
    myLayer.appendChild(myNextButton);

    var mySlider = document.createElement('input');
    mySlider.setAttribute("type", "range");
    mySlider.id = 'smiSlider';
    mySlider.value = 0;
    myLayer.appendChild(mySlider);

    var myPlayTime = document.createElement('div');
    myPlayTime.id = 'smiPlayTime';
    myLayer.appendChild(myPlayTime);

    var myLayerContents = document.createElement('div');
    myLayerContents.id = 'smiLayerContents';
    myLayer.appendChild(myLayerContents);
    var timerId = null;
    myPlayButton.onclick = function () {
        
        if (timerId != null) {
            myPlayText.nodeValue = '>';
            clearInterval(timerId);
            timerId = null;
            return;
        }

        myPlayText.nodeValue = '||';
        timerId = setInterval(function () {
            mySlider.value = parseInt(mySlider.value) + 100;            
            mySlider.onchange();
        }, 100);
       
    };

    myNextButton.onclick = function () {
        if (allSyncTimeIdx == allSyncTimes.length - 1)
            return;

        ++allSyncTimeIdx;
        mySlider.value = allSyncTimes[allSyncTimeIdx];
        mySlider.onchange();
    };

    myPrevButton.onclick = function () {
        if (allSyncTimeIdx <= 0)
            return;

        --allSyncTimeIdx;
        mySlider.value = allSyncTimes[allSyncTimeIdx];
        mySlider.onchange(); 
    };
    
    mySlider.onchange = function () {
        allSyncTimeIdx = allSyncTimes.binaryIndexOf(this.value);
        writeSubtitlesToLayerContents(this.value, myLayerContents);

        myPlayTime.innerHTML = "<p>" + this.value +  " / " + this.max + "</p>";
    };

    return { smiLayer: smiLayer, smiSlider: mySlider };
}

function writeSubtitlesToLayerContents(t, layerContents)
{    
    layerContents.innerHTML = "";
    for (var langType in subtitleSyncTimes) {

        var idx = subtitleSyncTimes[langType].binaryIndexOf(t);        
        if (idx > -1) {
            var syncTime = subtitleSyncTimes[langType][idx];
            layerContents.innerHTML += "<p>" + langType + ":" + syncTime + subtitleTexts[langType][syncTime] + "</p>";
        }
    }
}

function createSMILayer(x, y) {

    var myLayer = document.createElement('div');
    myLayer.id = 'smiLayer';
    document.body.appendChild(myLayer);

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

function getSMIProperty(str, posStart, posEnd)
{
    var posEqual = str.indexOf("=", posStart);
    return str.substring(posEqual + 1, posEnd);
}

function getSMITag(str, tag, posStart)
{
    var posABSStartTag = str.indexOf(tag, posStart);
    if (posABSStartTag == -1)
        return null;

    var posABSEndTag = str.indexOf(">", posABSStartTag);
    if (posABSEndTag == -1)
        return null;

    return { posStart: posABSStartTag, posEnd: posABSEndTag };
}

function getNextSMIText(str, posStart, posEnd) {
    var syncTag = getSMITag(str, "<SYNC", posStart);
    if (syncTag == null)
        return null;

    var startTime = getSMIProperty(str, syncTag.posStart, syncTag.posEnd);

    var pTag = getSMITag(str, "<P", syncTag.posEnd);
    if (pTag == null)
        return null;   

    var langType = getSMIProperty(str, pTag.posStart, pTag.posEnd);
    
    var textLength = str.length;
    var nextSyncTag = getSMITag(str, "<SYNC", pTag.posEnd);
    if (nextSyncTag != null)
        textLength = nextSyncTag.posStart;
    else
        nextSyncTag = { posStart: -1 };

    return {
        smiText: str.substring(pTag.posEnd+1, textLength),
        startTime: parseInt(startTime),
        posNextSyncStartTag: parseInt(nextSyncTag.posStart),
        langType: langType
    };
}
