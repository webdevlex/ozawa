var _____WB$wombat$assign$function_____=function(name){return (globalThis._wb_wombat && globalThis._wb_wombat.local_init && globalThis._wb_wombat.local_init(name))||globalThis[name];};if(!globalThis.__WB_pmw){globalThis.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opener = _____WB$wombat$assign$function_____("opener");
// ***************** Determine the browser type.
var browserType;

if (document.layers) {browserType = "nn4"}
if (document.all) {browserType = "ie"}
if (window.navigator.userAgent.toLowerCase().match("gecko")) {
   browserType= "gecko"
}

// ***************** Use AJAX to load external php hit counter in a html page.
var baseUrl;
baseUrl = "https://web.archive.org/web/20111014014152/http://www.liquidinjection.net/";
//baseUrl = "https://web.archive.org/web/20111014014152/http://localhost/";

var httpReq;

function find(elementId) {
	var obj;
	if (browserType == "gecko" )
		obj = eval('document.getElementById("' + elementId + '")');
	else if (browserType == "ie")
		obj = eval('document.getElementById("' + elementId + '")');
	else
		obj = eval('document.layers["' + elementId + '"]');
		
	return obj;
}

function GetHitCount(pageName)
{
	// Note: appending Math.random() insures that IE does not load cached versions.
	url = baseUrl + pageName + "?" + Math.random();
	GetUrl(url, GotHitCount);
}

function GotHitCount() 
{
	// Proceed only if the page loaded.
    if (httpReq.readyState != 4 || httpReq.status != 200) {
      return;
    }
    
    // Get the div.
    var obj;
    obj = find("HitCounter");
    
    // Set the div.
    obj.innerHTML = httpReq.responseText;
}

function GetUrl(url, callback)
{
	try {
    	netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
	} catch (e) {
		//alert("Permission UniversalBrowserRead denied.");
	}

	// branch for native XMLHttpRequest object
    if (window.XMLHttpRequest) {
      httpReq = new XMLHttpRequest();
      httpReq.abort();
      httpReq.onreadystatechange = callback;
      httpReq.open("GET", url, true);
	  httpReq.send(null);
    // branch for IE/Windows ActiveX version
    } else if (window.ActiveXObject) {
      httpReq = new ActiveXObject("Microsoft.XMLHTTP");
      if (httpReq) {
        httpReq.abort();
        httpReq.onreadystatechange = callback;
        httpReq.open("GET", url, true);
        httpReq.send();
      }
    }
}
}

/*
     FILE ARCHIVED ON 01:41:52 Oct 14, 2011 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 00:14:58 Jun 08, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.571
  exclusion.robots: 0.051
  exclusion.robots.policy: 0.041
  esindex: 0.008
  cdx.remote: 28.933
  LoadShardBlock: 319.354 (3)
  PetaboxLoader3.datanode: 181.525 (4)
  PetaboxLoader3.resolve: 207.797 (3)
  load_resource: 125.62
*/