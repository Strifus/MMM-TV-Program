var NodeHelper = require('node_helper');
var fetch = require('node-fetch');

module.exports = NodeHelper.create({
	start: function () {
		console.log('MMM-TV-Program helper started...');
	},
    
	getUrlContent: function (url) {
		var self = this;

		try {
			// get URL content
/* 
            // (A) FETCH "DUMMY.HTML"
            fetch("https://orf.at")
            
            // (B) RETURN THE RESULT AS TEXT
            .then((result) => {
                if (result.status != 200) { throw new Error("Bad Server Response"); }
                console.log('MMM-TV-Program: Kein Fehler!');
                this.data = result.text();
            })
            
            
            // (D) HANDLE ERRORS - OPTIONAL
            .catch((error) => { console.log(error);console.log('MMM-TV-Program: Fehler3!'); });
            
            fetch("https://orf.at")
                .then(function (response) {
                    switch (response.status) {
                        // status "OK"
                        case 200:
                            return response.text();
                        // status "Not Found"
                        case 404:
                            throw response;
                    }
                })
                .then(function (template) {
                    //console.log(template);
                    console.log("TEMPLATE");
                    this.data = template;
                })
                .catch(function (response) {
                    // "Not Found"
                    //console.log(response.statusText);
                    console.log("NOT FOUND");
                });
*/                
                fetch(url)
                    .then((response) => response.text())
                    .then((data) => this.data = data);


            // Send the content back with the url to distinguish it on the receiving part
            self.sendSocketNotification("MMM-TV-Program_CONTENT_RESULT", {url: url, data: this.data});
            console.log('MMM-TV-Program: Content of TV program URL fetched!');
		} catch (err) {
			console.log('MMM-TV-Program: Error reading TV program URL: ' + err);
		}
	},


	// Subclass socketNotificationReceived received.
	socketNotificationReceived: function (notification, url) {
		if (notification === "MMM-TV-Program_GET_CONTENT") {
			this.getUrlContent(url);
		}
	}
});
