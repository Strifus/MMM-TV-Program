/* Magic Mirror
 * Module: MMM-TV-Program
 *
 * By Strifus
 */

Module.register("MMM-TV-Program",{
    // Default module configuration
    defaults: {
        url: "https://www.tele.at/tv-programm/2015-im-tv.html?stationType=-1",
        stationsPerPage: 4,     // number of stations to show at once
        showNext: true,         // flag whether show after prime time show should also displayed
        showIndex: true,
        reloadInterval: 30 * 60 * 1000, // every 30 minutes
        updateInterval: 10 * 1000,
        animationSpeed: 1.0 * 1000,
        lengthTitle: 30,
        lengthGenre: 30,
        wrapTitle: false,
        linesTitle: 1
    },

    start: function () {
        this.getUrlContent();
        this.scheduleUpdateInterval();
        this.activeItem = 0;
        this.myTimer = 0;
    },

    // Request node_helper to get TV shows from url
    getUrlContent: function () {
        this.sendSocketNotification("MMM-TV-Program_GET_CONTENT", this.config.url);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "MMM-TV-Program_CONTENT_RESULT") {
            // Only continue if the notification came from the request we made
            // This way we can load the module more than once
            if (payload.url === this.config.url)
            {
                this.urlContent = payload.data;
                //this.updateDom(100);
                //this.scheduleUpdateInterval();
            }
        }
    },

    // Override dom generator
    getDom: function() {
        var wrapper = document.createElement("div");
        
        // load content of URL
        var urlContent;
        if (!this.urlContent) {
            wrapper.innerHTML = "ERROR: Could not read TV program content from: " + this.config.url;
            return wrapper;
        }
        else {
            urlContent = this.urlContent;
        }
        
        
        // parse URL content
        var page = document.createElement('html');
        page.innerHTML = urlContent;
        
       
        // fetch list with bc-Items from page (each bc-Item consists of 20:15 show and the show after of one single station)
        var bcItems = page.getElementsByClassName('bc-item');
        var noOfStations = bcItems.length;
        
        // declare data arrays and other variables
        let primeShow = [];
        let nextShow = [];
        const titles = [];
        const genres = [];
        let dateNext;
        let timeNext;
        let statNext;
        let datePrime;
        let timePrime;
        let statPrime;
        
        // fill data arrays
        for (var i=0; i<noOfStations; i++){
            // fetch list with titles and genres
            titles.push(bcItems[i].getElementsByClassName('title'));
            genres.push(bcItems[i].getElementsByClassName('genre'));
            
            // get show infos, but sort out 'false' info lists
            var lists = bcItems[i].getElementsByTagName('ul');
            var info = [];
            for (j=0; j<lists.length;j++){
                if (lists[j].getElementsByTagName('li').length == 3){
                    info.push(lists[j]);    // create an info array with elements which have exact 3 list elements; disregard all other lists
                }
            }
            
            if (info.length > 1) {
                // first info element belongs to prime time show, second info element belongs to next show
                dateNext  = info[1].getElementsByTagName('li')[0].firstChild.nodeValue;
                timeNext  = info[1].getElementsByTagName('li')[1].firstChild.nodeValue;
                statNext  = info[1].getElementsByTagName('li')[2].getElementsByTagName('span')[0].firstChild.nodeValue;
                datePrime = info[0].getElementsByTagName('li')[0].firstChild.nodeValue;
                timePrime = info[0].getElementsByTagName('li')[1].firstChild.nodeValue;
                statPrime = info[0].getElementsByTagName('li')[2].getElementsByTagName('span')[0].firstChild.nodeValue;
            }
            else if (info.length == 1) {
                // the first info element is of the next show, the prime time show is currently running and has no list with 3 elements
                dateNext  = info[0].getElementsByTagName('li')[0].firstChild.nodeValue;
                timeNext  = info[0].getElementsByTagName('li')[1].firstChild.nodeValue;
                statNext  = info[0].getElementsByTagName('li')[2].getElementsByTagName('span')[0].firstChild.nodeValue;
                datePrime = dateNext;
                timePrime = bcItems[i].getElementsByClassName('running-time')[0].firstChild.nodeValue;
                statPrime = statNext;
            }
            else {
                // no list with 3 elements was detected
                dateNext  = '?';
                timeNext  = '?';
                statNext  = '?';
                datePrime = dateNext;
                timePrime = timeNext;
                statPrime = statNext;
            }
            
            // add title, genre, date, time of show and station name to array
            primeShow.push({title: titles[i][0].getElementsByTagName('a')[0].firstChild.nodeValue,
                            genre: genres[i][0].firstChild.nodeValue,
                            date: datePrime,
                            time: timePrime,
                            station: statPrime
            });
            nextShow.push({title: titles[i][1].getElementsByTagName('a')[0].firstChild.nodeValue,
                           genre: genres[i][1].firstChild.nodeValue,
                           date: dateNext,
                           time: timeNext,
                           station: statNext
            });
        }
              
        // calculate start and end index of stations to show
        if (this.activeItem * this.config.stationsPerPage >= noOfStations) {
            this.activeItem = 0;
        }
        var startIdx = this.activeItem * this.config.stationsPerPage;
        var endIdx = startIdx + this.config.stationsPerPage;
        if (endIdx > noOfStations) {
            endIdx = noOfStations;
        }
        
        // calculate and create current page index
        var index = document.createElement("div");
        index.className = "index";
        index.innerHTML = Math.floor(startIdx/this.config.stationsPerPage)+1 + '/' + Math.ceil(noOfStations/this.config.stationsPerPage);
        
        // create table with TV program
        var table = document.createElement("table");
        //table.className = "table";
        for (i=startIdx;i<endIdx;i++) {
            
            // header row: station name/icon
            var row = document.createElement("tr");
            table.appendChild(row);
            
            var icon = document.createElement("td");
            if (this.getIcon(primeShow[i].station) != "") {
                icon.className = this.getIcon(primeShow[i].station);
            }
            else {
                icon.className = "table-header";
                icon.innerHTML = primeShow[i].station;
            }
            icon.setAttribute('colSpan', '2');            
            row.appendChild(icon);
            
            // first row: title
            var row = document.createElement("tr");
            table.appendChild(row);

            var primeCell = document.createElement("td");
            primeCell.className = "table-title";
            primeCell.innerHTML = this.shorten(primeShow[i].title, this.config.lengthTitle, this.config.wrapTitle, this.config.lineTitle);
            row.appendChild(primeCell);

            if (this.config.showNext) {
                var nextCell = document.createElement("td");
                nextCell.className = "table-title";
                nextCell.innerHTML = this.shorten(nextShow[i].title, this.config.lengthTitle, this.config.wrapTitle, this.config.lineTitle);
                row.appendChild(nextCell);
            }

            // second row: genre
            var row = document.createElement("tr");
            table.appendChild(row);

            var primeCell = document.createElement("td");
            primeCell.className = "table-genre";
            primeCell.innerHTML = this.shorten(primeShow[i].genre, this.config.lengthGenre, false, 1);
            row.appendChild(primeCell);
            
            if (this.config.showNext) {          
                var nextCell = document.createElement("td");
                nextCell.className = "table-genre";
                nextCell.innerHTML = this.shorten(nextShow[i].genre, this.config.lengthGenre, false, 1);
                row.appendChild(nextCell);
            }
            
            // third row: info
            var row = document.createElement("tr");
            table.appendChild(row);

            var primeCell = document.createElement("td");
            primeCell.className = "table-info";
            primeCell.innerHTML = primeShow[i].date + ' | ' + primeShow[i].time + ' | ' + primeShow[i].station;// +  '<hr>';
            row.appendChild(primeCell);
            
            if (this.config.showNext) {           
                var nextCell = document.createElement("td");
                nextCell.className = "table-info";
                nextCell.innerHTML = nextShow[i].date + ' | ' + nextShow[i].time + ' | ' + nextShow[i].station;// +  '<hr>';
                row.appendChild(nextCell);
            }
        }

        // append child elements
        wrapper.appendChild(table);
        if (this.config.showIndex) {
            wrapper.appendChild(index);
        }

        return wrapper;
    },

    // Header
    getHeader: function () {
        return this.data.header;
    },

    // Define styles
    getStyles: function () {
        return ["MMM-TV-Program.css", "icons.css"];
    },
    
    // Define required translations.
    getTranslations: function () {
        return false;
    },
    
	/**
	 * Schedule visual update.
	 */
	scheduleUpdateInterval: function () {
		this.updateDom(this.config.animationSpeed);

		this.timer = setInterval(() => {
			this.activeItem++;
			this.updateDom(this.config.animationSpeed);
            
            
            // workaround until program fetcher has been implemented
            this.myTimer++;
            if (this.myTimer >= (this.config.reloadInterval/this.config.updateInterval)) {
                this.getUrlContent();
                this.myTimer = 0;
            }

		}, this.config.updateInterval);
	},
    
    /**
     * Get station icon.
     * 
     * @param {string} string The station name as it was scraped from the URL
	 * @returns {string} The icon string usable as (icon) class specifier
     */ 
    getIcon: function(string) {
        var icon = "";
        
        switch (string.toLowerCase()) {
            case "3sat":
                icon = "icon-3sat";
                break;
            case "das erste":
                icon = "icon-ard";
                break;
            case "ard-alpha":
                icon = "icon-ardalpha";
                break;
            case "arte":
                icon = "icon-arte";
                break;
            case "atv":
                icon = "icon-atv";
                break;
            case "atv2":
                icon = "icon-atv2";
                break;
            case "bbc":
                icon = "icon-bbc";
                break;
            case "bibel tv":
                icon = "icon-bibeltv";
                break;
            case "br fernsehen":
                icon = "icon-br";
                break;
            case "comedy central":
                icon = "icon-comedycentral";
                break;
            case "disney channel":
                icon = "icon-disneychannel";
                break;
            case "dmax":
                icon = "icon-dmax";
                break;
            case "euronews":
                icon = "icon-euronews";
                break;
            case "hessen fernsehen":
                icon = "icon-hr";
                break;
            case "kabel eins":
                icon = "icon-kabel1";
                break;
            case "kabel 1 doku":
                icon = "icon-kabel1doku";
                break;
            case "ki.ka":
                icon = "icon-kika";
                break;
            case "mdr":
                icon = "icon-mdr";
                break;
            case "n24 doku austria":
                icon = "icon-n24doku";
                break;
            case "ndr":
                icon = "icon-ndr";
                break;
            case "nitro":
                icon = "icon-nitro";
                break;
            case "n-tv":
                icon = "icon-ntv";
                break;
            case "one":
                icon = "icon-one";
                break;  
            case "orf 1":
                icon = "icon-orf1";
                break;
            case "orf 2":
                icon = "icon-orf2";
                break;
            case "orf 3":
                icon = "icon-orf3";
                break;
            case "orf sport +":
                icon = "icon-orfsportplus";
                break;
            case "phoenix":
                icon = "icon-phoenix";
                break;
            case "prosieben":
                icon = "icon-pro7";
                break;
            case "pro7 maxx":
                icon = "icon-pro7maxx";
                break;
            case "puls 4":
                icon = "icon-puls4";
                break;
            case "puls 24":
                icon = "icon-puls24";
                break;
            case "rbb":
                icon = "icon-rbb";
                break;
            case "rtl":
                icon = "icon-rtl";
                break;
            case "rtl zwei":
                icon = "icon-rtl2";
                break;
            case "rtl up":
                icon = "icon-rtlup";
                break;
            case "sat.1":
                icon = "icon-sat1";
                break;
            case "sat.1 gold":
                icon = "icon-sat1gold";
                break;
            case "servus tv":
                icon = "icon-servustv";
                break;
            case "silverline":
                icon = "icon-silverline";
                break;
            case "sixx austria":
                icon = "icon-sixx";
                break;
            case "sky cinema +24":
                icon = "icon-skycinema24";
                break;    
            case "sky cinema hd":
                icon = "icon-skycinemahd";
                break;    
            case "slovenija 2":
                icon = "icon-slovenija2";
                break;
            case "sonnenklar.tv":
                icon = "icon-sonnenklartv";
                break;    
            case "spiegel tv":
                icon = "icon-spiegeltv";
                break;
            case "sport1":
                icon = "icon-sport1";
                break;
            case "super rtl":
                icon = "icon-superrtl";
                break;
            case "swr":
                icon = "icon-swr";
                break;
            case "tagesschau24":
                icon = "icon-tagesschau24";
                break;
            case "tele 5":
                icon = "icon-tele5";
                break;
            case "tlc":
                icon = "icon-tlc";
                break;
            case "tv5":
                icon = "icon-tv5";
                break;
            case "vox":
                icon = "icon-vox";
                break;
            case "wdr":
                icon = "icon-wdr";
                break;
            case "zdf":
                icon = "icon-zdf";
                break;
            case "zdf infokanal":
                icon = "icon-zdfinfo";
                break;
            case "zdf neo":
                icon = "icon-zdfneo";
                break;
            default:
                break;
        }
        
        return icon;
    },
    
    /**
	 * Shortens a string if it's longer than maxLength and add a ellipsis to the end
	 *
	 * @param {string} string Text string to shorten
	 * @param {number} maxLength The max length of the string
	 * @param {boolean} wrapText Wrap the text after the line has reached maxLength
	 * @param {number} maxLines The max number of vertical lines before cutting string
	 * @returns {string} The shortened string
	 */
	shorten: function (string, maxLength, wrapText, maxLines) {
		if (typeof string !== "string") {
			return "";
		}

		if (wrapText === true) {
			const words = string.split(" ");
			let temp = "";
			let currentLine = "";
			let line = 0;

			for (let i = 0; i < words.length; i++) {
				const word = words[i];
				if (currentLine.length + word.length < (typeof maxLength === "number" ? maxLength : 25) - 1) {
					// max - 1 to account for a space
					currentLine += word + " ";
				} else {
					line++;
					if (line > maxLines - 1) {
						if (i < words.length) {
							currentLine += "&hellip;";
						}
						break;
					}

					if (currentLine.length > 0) {
						temp += currentLine + "<br>" + word + " ";
					} else {
						temp += word + "<br>";
					}
					currentLine = "";
				}
			}

			return (temp + currentLine).trim();
		} else {
			if (maxLength && typeof maxLength === "number" && string.length > maxLength) {
				return string.trim().slice(0, maxLength) + "&hellip;";
			} else {
				return string.trim();
			}
		}
	},

});
