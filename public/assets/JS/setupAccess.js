(function(window, document, undefined) {

	function setupAccess () { 
	    var hash = window.location.hash.substring(1);
		var params = {};
		hash.split('&').map(hk => { 
	      let temp = hk.split('='); 
	        params[temp[0]] = temp[1] 
	    });
	    if (params.access_token) {
	    	window.localStorage.setItem('access_token', params.access_token);
	    	window.removeHash();
	    }
	}
	window.setupAccess = setupAccess;
})(window, document);