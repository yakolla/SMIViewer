﻿var debug = true;
var layerUICount = 0;
var fullTextLayerUIs = {};
var sliderUI;
var allSyncTimes = [];
var subtitleSyncTimes = {};
var subtitleTexts = {};
var allSyncTimeIdx = -1;

$(document).ready(function () {

    $('#file').change(function (event) {
        window.location.href = URL.createObjectURL(event.target.files[0]);
    });
    // Add click event handler to button
    $('#load-file').click(function () {
        if (!window.FileReader) {
            return alert('FileReader API is not supported by your browser.');
        }
        var $i = $('#file'), // Put file input ID here
			input = $i[0]; // Getting the element from jQuery
        
        if (input.files && input.files[0]) {

            file = input.files[0]; // The file
            //window.location.href = file.name;
            fr = new FileReader(); // FileReader instance
            fr.onload = function () {
                
                var str = fr.result;
                var info = getNextSMIText(str, 0, str.length);
                if (info == null)
                    return;

                sliderUI = createSMISlider();
                lazyLoading(str, info);
            };
            fr.readAsText(file, "EUC-KR");
           
        } else {
            // Handle errors here
            alert("File not selected or browser incompatible.")
        }
    });

    loadOptions();

    Array.prototype.lower_bound = lower_bound;
    Array.prototype.upper_bound = upper_bound;    
});
// [10, 15, 20], 11 = 10
function lower_bound(searchElement) {

    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex < maxIndex) {
        currentIndex = parseInt(minIndex + (maxIndex - minIndex) / 2);
        currentElement = this[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else {
            maxIndex = currentIndex;
        }
    }

    return minIndex;
}

function upper_bound(searchElement) {

    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex < maxIndex) {
        currentIndex = parseInt(minIndex + (maxIndex - minIndex) / 2);
        currentElement = this[currentIndex];

        if (searchElement <= currentElement) {
            maxIndex = currentIndex;
        }
        else {
            minIndex = currentIndex + 1;
        }
    }

    return minIndex;
}


function lazyLoading(str, info) {
    if (info == null)
        return;

    setTimeout(function () {

        var syncTimes = subtitleSyncTimes[info.langType];
        if (syncTimes == null) {
            subtitleSyncTimes[info.langType] = [];
            subtitleTexts[info.langType] = {};

            syncTimes = subtitleSyncTimes[info.langType];
        }

        syncTimes.push(info.startTime);
        if (allSyncTimes[allSyncTimes.lower_bound(info.startTime)] != info.startTime)
            allSyncTimes.push(info.startTime);

        subtitleTexts[info.langType][info.startTime] = info.smiText;

        var smiFullTextLayer = fullTextLayerUIs[info.langType];
        if (null == smiFullTextLayer) {
            smiFullTextLayer = createSMIFullTextLayer(sliderUI.smiLayer);
            fullTextLayerUIs[info.langType] = smiFullTextLayer;
            ++layerUICount;
        }
        smiFullTextLayer.innerHTML += "<p>" + info.startTime + ":" + info.smiText + "</p>";

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

function createSMISlider() {
    var smiLayer = createSMILayer(10, 10);

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
    myLayerContents.id = 'smiSyncTextLayer';
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
        if (allSyncTimeIdx <= 0) {
            mySlider.value = 0;
            mySlider.onchange();
            return;
        }

        --allSyncTimeIdx;
        mySlider.value = allSyncTimes[allSyncTimeIdx];
        mySlider.onchange();
    };

    mySlider.onchange = function () {
        allSyncTimeIdx = allSyncTimes.lower_bound(this.value);
        writeSubtitlesToLayerContents(this.value, myLayerContents);

        myPlayTime.innerHTML = "<p>" + this.value + " / " + this.max + "</p>";
    };

    return { smiLayer: smiLayer, smiSlider: mySlider };
}

function writeSubtitlesToLayerContents(t, layerContents) {
    layerContents.innerHTML = "";
    for (var langType in subtitleSyncTimes) {

        var idx = subtitleSyncTimes[langType].lower_bound(t);
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

function createSMIFullTextLayer(smiLayer) {

    var myLayer = document.createElement('div');
    myLayer.id = 'smiFullTextLayer';
    smiLayer.appendChild(myLayer);

    return myLayer;
}

function loadOptions() {
    var keys = [];  // 불러올 항목들의 이름

    chrome.storage.local.get(keys, function (options) {
        $.each(options, function (key, data) {

        });
    });
}

function getSMIProperty(str, posStart, posEnd) {
    var posEqual = str.indexOf("=", posStart);
    return str.substring(posEqual + 1, posEnd);
}

function getSMITag(str, tag, posStart) {
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
        smiText: str.substring(pTag.posEnd + 1, textLength),
        startTime: parseInt(startTime),
        posNextSyncStartTag: parseInt(nextSyncTag.posStart),
        langType: langType
    };
}
