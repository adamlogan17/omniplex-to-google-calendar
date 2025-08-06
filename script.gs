function main() {
  // Within the subject of the email, normally it would contain the cinema cinema name after the '-' but by leaving this out, this allows the search to cover all locations
  // @todo make the search term a smaller time frame to lower the amount of emails that need to be checked
  let threadsNew = GmailApp.search("from:(confirmation@omniplex.ie) subject:(Omniplex Cinemas - : Booking Confirmation)");
  const TRIGGERINTERVAL = 1000 * 60 * 10;
  const timeAtLastTrigger = new Date() - TRIGGERINTERVAL;
  let allMovies = [];

  for (thread of threadsNew) {
    for(email of thread.getMessages()) {
      sentTime = email.getDate();
      let movieInfo;
      // checks all relevant emails, to see if they are within the last 10 minutes (timeAtLastTrigger)
      if (sentTime > timeAtLastTrigger) {
        let emailBody = email.getBody();
        try {
          movieInfo = extractMovieInfo(emailBody);
          allMovies.push(movieInfo);
        } catch (e) { console.log(e) }
        createCalendarEvent(movieInfo, adTime=15);
      }
    }
  }
  if (allMovies.length > 0) {
    addToMovieSpreadsheet(allMovies);
  }
}

/**
 * Adds movie information to a Google Sheets spreadsheet.
 * @param {{
    title:string,
    screen:string,
    seat:string,
    runtime: {
      hours:number,
      minutes:number
    },
    startDateTime:Date,
    location: {
      streetAddress: string,
      addressLocality: string,
      addressRegion: string,
      postalCode: string
    },
    cinemaName:string,
    qrCodeUrl:string,
    ticket:string,
    moviePoster:string
  }[]} movies - An array of movie objects to be added to the spreadsheet.
 * @param {string} [ssName="Omniplex Movies"] - The name of the spreadsheet. Defaults to "Omniplex Movies".
 * @returns {void}
 * 
 * @todo When the start time is on the hour, e.g. 18:00, the sheet will show 18:0 not 18:00
 */
function addToMovieSpreadsheet(movies, ssName="Omniplex Movies", ageRatingAgency='BBFC') {
  const thisScriptid = ScriptApp.getScriptId();
  const thisFolder = DriveApp.getFileById(thisScriptid).getParents().next();
  let ss;
  let sheet;
  // This is needed as ss, needs to be defined before sheet can be defined, which takes place after the if statement to check
  // if the spreadsheet exists and therefore another condition is needed to prevent the header being constantly set
  let addHeader = false;
  const COLUMNWIDTH = 200;
  const ROWHEIGHT = 300;

  // This is an array and not an object, as to keep the order the columns appear in the spreadsheet
  // If the name of the element is changed here this needs to be reflected for the definition of 'moviesAsArry'
  const HEADER = ["Title", "Movie Poster", "Screen", "Seat Number", "Runtime", "Start Date", "Start Time", "Cinema Name", "Age Rating", "Address", "QR Code", "Description", "Director", "Starring", "Genres", "Ticket Download", "Age Rating Agency"];

  if(!thisFolder.getFilesByName(ssName).hasNext()) {
    ss = SpreadsheetApp.create(ssName);
    DriveApp.getFileById(ss.getId()).moveTo(thisFolder);

    addHeader = true;

    // allow the script to access external data, to insert the images direclty into the spreadsheet
    const endpoint = `https://docs.google.com/spreadsheets/u/0/d/${ss.getId()}/externaldata/allowexternalurlaccess`;
    const params = {
      method: "post",
      headers: { authorization: "Bearer " + ScriptApp.getOAuthToken() },
    };
    UrlFetchApp.fetch(endpoint, params);
  } else {
    ss = SpreadsheetApp.open(thisFolder.getFilesByName(ssName).next());
  }

  sheet = ss.getSheets()[0];

  if(addHeader) {
    let headerRange = sheet.getRange(`A1:${String.fromCharCode(HEADER.length + 64)}1`);
    // the font and text colour matches Omniplex branding
    headerRange.setFontColor('#fbeb47').setFontWeight('bold').setBackground('#191919').setHorizontalAlignment("center").setWrap(true);
    headerRange.setValues([HEADER]);
    
    // Allows for the images to be larger
    sheet.setColumnWidth(HEADER.indexOf('Movie Poster') + 1, COLUMNWIDTH);
    sheet.setColumnWidth(HEADER.indexOf('QR Code') + 1, COLUMNWIDTH);
    // Allows for the description column to be larger as this will contain a substantial amount of text
    sheet.setColumnWidth(HEADER.indexOf('Description') + 1, COLUMNWIDTH);
  }

  let moviesAsArry = movies.map((movie) => {
    let chosenAgeRating = '';
    if (movie.ageRatings.length > 1) {
      for (let ageRating of movie.ageRatings) {
        if (ageRating.agency == ageRatingAgency) {
          chosenAgeRating = ageRating
        }
      }
    } else if (movie.ageRatings.length == 1) {
      chosenAgeRating = movie.ageRatings[0]
    }

    let row = [];
    // The use of 'indexOf' is to allow for the column positions to be changed in the HEADER variable and for these changes to be reflected here automatically, ensuring the correct data is inserted in the correct column
    // a disadvantage here is that if the names in the HEADER change then this will also need to be changed here
    row[HEADER.indexOf("Title")] = movie.title;
    row[HEADER.indexOf("Movie Poster")] = insertCellImage(movie.moviePoster);
    row[HEADER.indexOf("Screen")] = movie.screen;
    row[HEADER.indexOf("Seat Number")] = movie.seat;
    row[HEADER.indexOf("Runtime")] = `${movie.runtime.hours}hr(s) ${movie.runtime.minutes}min(s)`;
    row[HEADER.indexOf("Start Date")] = movie.startDateTime.toLocaleDateString("en-GB");
    row[HEADER.indexOf("Start Time")] = `${movie.startDateTime.getHours()}:${movie.startDateTime.getMinutes()}`;
    row[HEADER.indexOf("Cinema Name")] = movie.cinemaName;
    row[HEADER.indexOf("Age Rating")] = insertCellImage(chosenAgeRating.image);
    row[HEADER.indexOf("Address")] = `${movie.location.streetAddress}, ${movie.location.addressLocality}, ${movie.location.postalCode}`;
    row[HEADER.indexOf("QR Code")] = insertCellImage(movie.qrCodeUrl);
    row[HEADER.indexOf("Description")] = movie.description;
    row[HEADER.indexOf("Director")] = movie.director;
    row[HEADER.indexOf("Starring")] = movie.starring.join(", ");
    row[HEADER.indexOf("Genres")] = movie.genres.join(", ");
    row[HEADER.indexOf("Ticket Download")] = movie.ticket;
    row[HEADER.indexOf("Age Rating Agency")] = chosenAgeRating.agency;
    return row;
  });

  sheet.setRowHeights(sheet.getLastRow() + 1, movies.length, ROWHEIGHT);

  sheet.insertRowsBefore(2, movies.length);
  let movieRange = sheet.getRange(2, 1, movies.length, HEADER.length);
  movieRange.setNumberFormat('@STRING@').setValues(moviesAsArry).setWrap(true);
}

/**
 * Provides the google spreadsheet function which inserts an image into a spreadsheet cell using its URL.
 * @param {string} imageUrl - The URL of the image to be inserted.
 * @returns {string} - The formula to insert the image into a cell.
 * 
 * @todo give optional parameter, for the script to allow the spreadsheet external url access
 */
function insertCellImage(imageUrl) {
  return `=IMAGE("${imageUrl}")`
}

function createCalendarEvent(movie, adTime=15) {
  let endDate = new Date(movie.startDateTime);
  endDate.setHours(endDate.getHours() + movie.runtime.hours);
  endDate.setMinutes(endDate.getMinutes() + movie.runtime.minutes + adTime);
  CalendarApp.createEvent(
    movie.title,
    movie.startDateTime,
    endDate,
    {
      description:
`Below is the information for ${movie.title}, at ${movie.cinemaName}

Screen: ${movie.screen}
Seat: ${movie.seat}

The QR code can be downloaded at ${movie.qrCodeUrl}
`,
      location: `${movie.cinemaName} ${movie.location.streetAddress}, ${movie.location.addressLocality}, ${movie.location.addressRegion}, ${movie.location.postalCode}`
    }
  )
}

/**
 * Converts a string in the format 'Xhrs Xmins' to an object { hours: X, minutes: X }.
 * @param {string} timeStr - The string representing time in the format 'Xhrs Xmins'.
 * @param {number} [adTime=0] - Additional time in minutes. Defaults to 0 minutes.
 * @returns {hours:number, minutes:number} - An object containing the hours and minutes parsed from the input string.
 */
function strToTime(timeStr, adTime=0) {
  let splitTime = timeStr.trim().split(" ");
  // If hours is 1hr, then only remove the last 2 characters, otherwise we can assume it is 'hrs' and therefore need to remove last 3 characters
  let hours = splitTime[0].length === 3 ? parseInt(splitTime[0].slice(0, -2)) : parseInt(splitTime[0].slice(0, -3));

  let minutes = parseInt(splitTime[1].slice(0, -3)) + adTime;

  // By adding the adTime, this may take the minutes above 60, which should not be allowed
  if (minutes >= 60) {
    hours += 1;
    minutes -= 60;
  }

  return {
    hours: hours,
    // Currently it always ends in 'min' no matter how many minutes it is
    minutes: minutes
  }
}

/**
 * Extracts the link within an incomplete tag
 * 
 * @param {string} brokenTag - A half complete tag that is unable to be parsed using XmlService
 * @returns {string} - The link contained within the element
 */
function manuallyRetrieveLink(brokenTag, startSearchTerm='src="', endSearchTerm='"') {
  let startIndex = brokenTag.indexOf(startSearchTerm);
  let startLinkIndex = startIndex + startSearchTerm.length;
  let endIndex = brokenTag.indexOf(endSearchTerm, startLinkIndex);
  if (endIndex == -1 || startIndex == -1) {
    return '';
  } else {
    return brokenTag.substring(startLinkIndex, endIndex);
  }
}

/**
 * Forms a URL to the Omniplex "What's On" showtimes page for a given movie title.
 * It formats the title to match the expected URL structure and selects the correct regional domain.
 *
 * @param {string} movieTitle - The title of the movie to generate the showtimes URL for.
 * @param {string} [region=''] - Optional region code. Use `'uk'` for the UK site, anything else defaults to Ireland.
 * @returns {{url: string, regionUrl: string}} An object containing the full showtimes URL and the selected base regional URL.
 */
function formWhatsOnUrl(movieTitle, region='') {
  // A special replace has to happen for movies with a ')' as the last char, as this should replace to '-' instead of just getting rid of the character
  let lastChar = movieTitle.slice(-1);
  if (lastChar == ')') {
    movieTitle = movieTitle.slice(0,-1) + '-';
  }

  let urlMovieName = movieTitle.toLowerCase()
    .replaceAll(' - ', '-')
    .replaceAll(' & ', '-')
    .replaceAll(' : ', '-')
    .replaceAll(' ', '-')
    .replaceAll(':', '')
    .replaceAll('.', '-')
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll(',', '')
    .replaceAll('&', '');

  let baseIeUrl = "https://www.omniplex.ie";
  let baseUkUrl = "https://www.omniplexcinemas.co.uk";

  let whatsOnUrl = "/whatson/movie/showtimes/";

  let regionUrl = '';
  if (region === "uk") {
    regionUrl = baseUkUrl;
  } else {
    // Defaults to Ireland, as Omniplex is based out of Ireland
    regionUrl = baseIeUrl;
  }

  return {
    url: `${regionUrl}${whatsOnUrl}${urlMovieName}`,
    regionUrl: regionUrl
  };
}

/**
 * Retrieves the HTML content of the most recent archived version of a given URL
 * from the Wayback Machine using the Internet Archive's CDX API.
 *
 * @param {string} originalUrl - The URL of the website to retrieve the archived version for.
 * @param {string} [noMovieMssg='Unable to find Movie'] - A message, which is displayed by the site if the movie cannot be found
 *
 * @returns {string|null} The raw HTML content of the most recent archived snapshot of the URL.
 */
function getLatestArchivedBody(originalUrl, noMovieMssg="Unable to find Movie") {
  // First call is to get the archived URL, which the Way Back Machine maintains
  let cdxApi = 'https://web.archive.org/cdx/search/cdx';
  let queryUrl = `${cdxApi}?url=${originalUrl}&output=json&fl=timestamp,original&filter=statuscode:200`;

  let response = UrlFetchApp.fetch(queryUrl);
  let data = JSON.parse(response.getContentText());

  if (data.length < 2) {
    return null;
  }

  for (let i=data.length-1; i>=0; i--) {
    // Extract the latest snapshot
    let snapshot = data[i];
    let timestamp = snapshot[0];
    let archivedUrl = snapshot[1];

    let archiveUrl = 'https://web.archive.org/web/' + timestamp + 'id_/' + archivedUrl;

    // Get the HTML of the archived page
    let archiveResponse = UrlFetchApp.fetch(archiveUrl);
    let html = archiveResponse.getContentText();

    if (!html.includes(noMovieMssg)) {
      return html;
    }
  }

  return null;
}


/**
 * Scrapes metadata for a movie from the Omniplex "What's On" page.
 * 
 * Given a movie title and region (UK or Ireland), this function constructs a URL to the 
 * Omniplex "What's On" page and scrapes metadata including runtime, description, cast, 
 * genres, director, and age ratings.
 * 
 * This is a fallback/enrichment function used to supplement movie data when not fully 
 * available in the email body. The function processes the HTML of the webpage line-by-line,
 * extracting relevant content using XML parsing and regex.
 * 
 * @param {string} movieTitle - The title of the movie to query (e.g., "Inside Out 2").
 * @param {string} [region='uk'] - The Omniplex region: "uk" (default) or "ie" for Ireland.
 * @param {string} [noMovieMssg='Unable to find Movie'] - A message, which is displayed by the site if the movie cannot be found
 * 
 * @returns {{
 *   runtime: {
 *     hours?: number,
 *     minutes?: number
 *   },
 *   description: string,
 *   starring: string[],
 *   director: string,
 *   genres: string[],
 *   ageRatings: Array<{
 *     rating: string,
 *     agency: string,
 *     image: string
 *   }>
 * }} An object containing scraped movie metadata.
 */
function scrapeWhatsOn(movieTitle, region='uk', noMovieMssg="Unable to find Movie") {
  let urlComponents = formWhatsOnUrl(movieTitle, region=region);
  let regionUrl = urlComponents.regionUrl;
  const fullUrl = urlComponents.url;

  let runtimeRegex = new RegExp(".*\\d{1,2}hrs?\\s\\d{1,2}mins?.*");

  let whatsOnInfo = {
    'runtime': {},
    'description': '',
    'starring': [],
    'director': '',
    'genres': [],
    'ageRatings': []
  }

  parsingErrMssg = "PARSING ERROR";

  const response = UrlFetchApp.fetch(fullUrl);
  let body = response.getContentText();

  if (body.includes(noMovieMssg)) {
    // Uses the default base URL for the wayback machine
    let wayBackMachine = formWhatsOnUrl(movieTitle);
    let wayBackMachineUrl = wayBackMachine.url;
    console.log(wayBackMachineUrl);
    body = getLatestArchivedBody(wayBackMachineUrl);
    if (body === null) {
      body = '';
    }
    regionUrl = wayBackMachine.regionUrl;
  }

  let bodyArry = body.split('\n');
  // There is a space after the comma on the site, this is why there is a space to remove it here
  let splitArrayStr = ', ';
  for (let i=0; i<bodyArry.length-1; i++) {
    let line = bodyArry[i].trim();
    let currentValue = xmlGetValue(bodyArry, i);
    if (runtimeRegex.test(line)) {
      whatsOnInfo.runtime = strToTime(currentValue);
    } else if (currentValue === 'Description') {
      // A break tag needs to be removed first, to allow for the parsing to work
      bodyArry[i+1] = bodyArry[i+1].replace('<br />', '');
      whatsOnInfo.description = xmlGetValue(bodyArry, i, offset=1);
    } else if (currentValue === 'Starring') {
      whatsOnInfo.starring = xmlGetValue(bodyArry, i, offset=1).split(splitArrayStr);
    } else if (currentValue === 'Director') {
      whatsOnInfo.director = xmlGetValue(bodyArry, i, offset=1);
    } else if (currentValue === 'Genres') {
      whatsOnInfo.genres = xmlGetValue(bodyArry, i, offset=1).split(splitArrayStr);
    } else if (line.includes("OMP_ratingRunningSection")) {
      let nextLine = bodyArry[i+1].trim();
      // Returns a list of image tags, using regex to find a match for <img ... />
      let imageTags = nextLine.match(/<img[^>]*\/>/g);
      whatsOnInfo.ageRatings = imageTags.map((tag) => {
        let rating = '';
        let ratingAgency = '';
        let ratingImage = '';
        try {
          let xmlImgTag = XmlService.parse(tag).getContent(0);
          let jointAgencyRating = xmlImgTag.getAttribute("title").getValue();
          let splitAgencyRating = jointAgencyRating.split(" - ");
          ratingAgency = splitAgencyRating[0];
          rating = splitAgencyRating[1];
          ratingImage = xmlImgTag.getAttribute("src").getValue();
        } catch {
          ratingImage = manuallyRetrieveLink(tag);
          if (ratingImage.length <= 0) {
            ratingImage = parsingErrMssg;
          }
          rating = parsingErrMssg;
        }
        return {
          'rating': rating,
          'agency': ratingAgency,
          'image': `${regionUrl}${ratingImage}`
        }
      });
    }
  }
  return whatsOnInfo;
}

/**
 * Extracts the runtime from a string. The runtime must be in some variation of 'Xhrs Xmins'
 * 
 * @param {string} potentialRuntime - A string containing the runtime
 * 
 * @returns {string|null}
 */
function getRuntime(potentialRuntime) {
  let runtimeRegex = new RegExp(".*\\d{1,2}hrs?\\s\\d{1,2}mins?.*");
  if (runtimeRegex.test(potentialRuntime)) {
    return potentialRuntime;
  }
  return null;
}

/**
 * Safely extracts the text content from a specified line in an XML/HTML array.
 *
 * This function attempts to parse a line of XML or HTML (typically from an email body) 
 * and retrieve the value inside the first child node. If parsing fails (e.g., due to malformed XML), 
 * it returns a standardized parsing error message.
 *
 * @param {string[]} xmlArray - An array of XML/HTML strings (e.g., lines from an email body).
 * @param {number} currentIndex - The current index in the array.
 * @param {number} [offset=0] - An optional offset to adjust which line to extract from (e.g., to get the next line).
 *
 * @returns {string} The extracted value from the specified line, or "PARSING ERROR" if extraction fails.
 *
 * @todo Refactor this function to accept a single line (e.g., `xmlArray[currentIndex + offset]`) instead of the full array and index.
 *       Optionally allow `getContent()` index to be passed as a parameter for greater flexibility.
 */
function xmlGetValue(xmlArray, currentIndex, offset=0) {
  let value = '';
  try {
    value = XmlService.parse(xmlArray[currentIndex+offset]).getContent(0).getValue();
  } catch {
    // Removes all content that is within ankle braces
    value = xmlArray[currentIndex+offset].replaceAll(/<[^>]*>/g, '');
  }

  value = value.replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&apos;', "'")
    .replaceAll('&reg;', '');

  return value;
}

/**
 * Extracts movie information from the email body.
 * 
 * A td tag is not closed within the body and therefore the whole body cannot be parsed
 * this results in a search of the body for relevant values, and then these tags (which are p tags)
 * needing to be parsed to get the relevant value.
 * 
 * The location, movie title and cinema name is stored within an object, that is contained in the script tag.
 * 
 * @param {string} emailBody - The body of the email containing movie details.
 * @param {number} [adTime=0] - Additional time in minutes. Defaults to 0 minutes.
 * @returns {
    title:string,
    screen:string,
    seat:string,
    runtime: {
      hours:number,
      minutes:number
    },
    startDateTime:Date,
    location: {
      streetAddress: string,
      addressLocality: string,
      addressRegion: string,
      postalCode: string
    },
    cinemaName:string,
    qrCodeUrl:string,
    ticket:string,
    moviePoster:string
   description: string,
   starring: string[],
   genres: string[],
   ageRatings: Array<{
     rating: string,
     agency: string,
     image: string
   }>
  }} - An object containing the extracted movie information.
 */
function extractMovieInfo(emailBody, adTime=0) {
  let bodyArry = emailBody.split('\n');
  let parsingErrMssg = "PARSING ERROR";
  
  let movie = {
    title:"",
    screen:"",
    seat:"",
    runtime: {
      hours:"",
      minutes:""
    },
    startDateTime:"",
    location: {
      streetAddress: "",
      addressLocality: "",
      addressRegion: "",
      postalCode: ""
    },
    cinemaName:"",
    qrCodeUrl:"",
    ticket:"",
    moviePoster:"",
    description: "",
    starring: [],
    genres: [],
    ageRatings: [{
      rating: "",
      agency: "",
      image: ""
    }]
  }

  let scriptObjArry = [];
  let retrieveScriptObj = false;

  for (let i=0; i<bodyArry.length-1; i++) {
    let line = bodyArry[i];
    let nextValue = "";
    let currentValue = "";
    let imgLink = "";

    // The below line is used for debugging and is used to log the whole body of the email
    // console.log(line);

    // retrieves the information for the script tag
    if(line.includes("<script")) {
      retrieveScriptObj = true;
    } else if (line.includes("</script>")) {
      retrieveScriptObj = false;
    }

    if(retrieveScriptObj) {
      scriptObjArry.push(line);
    }

    // The relevant value, may be continued within the p tag of the next line, of the tag which contains the actual searched value
    // The below comment is not exact, it is used for illustration purposes only
    // The search term is 'RUNNING TIME' and the value is '2hrs 20mins'
    /*
    <td id='RUNNING TIME' />
      <p>2hrs 20mins</p>
    </td>
    */
    nextValue = xmlGetValue(bodyArry, i, offset=1);

    // Within an updated format, the required value may be in the current element of the searched value
    // The below comment is not exact, it is used for illustration purposes only. 
    // The serach term is 'Seats:' and the value is 'Seats: E-7, E-8'
    /*
    <p style="font-size:12px; margin:0;margin-left:5px;">Seats: E-7, E-8</p>
    */
    currentValue = xmlGetValue(bodyArry, i)

    try {
      // The below is how to extract the value for the 'src' attribute, all images in the table are the second element of the line, in which they are defined
      imgLink = XmlService.parse(line).getContent(1).getAttribute("src").getValue();
    } catch {
      imgLink = manuallyRetrieveLink(line);
      if (imgLink.length <= 0) {
        imgLink = parsingErrMssg;
      }
    }
    imgLink = imgLink.replaceAll(' ', '%20');

    // The reason why the regex does not enforce a number after the screen is due to the 'MAXX' screen
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes for use of the special operators in regex
    // When using 'RegExp', to escape characters a double '\' is required
    // An example that would pass this regex is 16:50 | Belfast | Screen 7
    let screenRegex = new RegExp("\\d{1,2}:\\d{2} \\| \\w+ \\| Screen \\w+");

    if(line.includes("RUNNING TIME")) {
      movie.runtime = strToTime(nextValue, adTime=adTime);
    } else if (line.includes("SCREEN") && !line.includes("TYPE")) {
      movie.screen = nextValue;
    } else if (screenRegex.test(line)) {
      let screenNumberPrefix = 'Screen ';
      let screenStartIndex = line.indexOf(screenNumberPrefix);
      // screenStartIndex = screenStartIndex + screenNumberPrefix.length;
      movie.screen = line.substring(screenStartIndex, line.length-1);
    } else if (line.includes("TIME")) {
      movie.startTime = nextValue;
    } else if (line.includes("SEATS") || line.includes("Seats:")) {
      // Previously 'SEATS' was sufficient but in the new format 'SEATS:' is required.
      // Also the old format required 'nextValue' while the new format requires 'currentValue', so 
      // it first checks if the 'currentValue' contains 'Seats:' and if it doesn't it defaults to 'nextValue'
      // @todo make this just 2 different if statements in the top level of the domain
      if (currentValue.includes('Seats:')) {
        movie.seat = currentValue.replaceAll('Seats: ', '');
      } else {
        movie.seat = nextValue;
      }
    } else if (line.includes("OMP_")) {
      // Previosuly this was 'dynamic/QRcodes' but omniplex had updated their email system and the QR codes do not have this anymore
      // It was renamed to 'api/barcode' but, it was noticed that 'OMP_' was included in both QR code links. This signifies which
      // cinema the QR code is for, e.g. OMP_ANTR for Antrim and OMP_CARR for Carrickfergus. This seems like a more robust signifier
      // as this most likely links to an ID in their database, which is less likely to be updated and QR codes will need to be linked 
      // to a specific cinema
      movie.qrCodeUrl = imgLink;
      movie.qrCodeUrl = line;
      movie.qrCodeUrl = manuallyRetrieveLink(line);
    } else if (
      (line.includes("filmimages")) || 
      ((line.includes("Poster") || line.includes("poster")) && line.includes('webp'))
    ) {
      // the small version of the image is within the body of the email, but by swapping out 'small' with 'large' a larger version is retrieved (it appears a medium option is not available)
      movie.moviePoster = imgLink.replaceAll("/small/", "/large/");
    }
  }

  // transform the scriptObjArry into a parsable format and then parse into an Object for easy information extraction
  scriptObjArry[0] = "{";
  scriptObj = JSON.parse(scriptObjArry.join(""));

  // Adds the information from the script tag into the movie object
  movie.cinemaName = scriptObj.reservationFor.location.name;
  movie.location.streetAddress = scriptObj.reservationFor.location.address.streetAddress;
  movie.location.addressLocality = scriptObj.reservationFor.location.address.addressLocality;
  movie.location.addressRegion = scriptObj.reservationFor.location.address.addressRegion;
  movie.location.postalCode = scriptObj.reservationFor.location.address.postalCode;
  
  movie.title = scriptObj.reservationFor.name;
  console.log(movie.title);
  movie.startDateTime = new Date(scriptObj.reservationFor.startDate);

  movie.ticket = scriptObj.ticketDownloadUrl;
  const whatsOnInfo = scrapeWhatsOn(movie.title);
  // By putting 'movie' last it gives it's values precedence
  enrichedMovie = {...movie, ...whatsOnInfo};

  if (movie.runtime.hours) {
    enrichedMovie.runtime = {...movie.runtime};
  } else {
    enrichedMovie.runtime = {...whatsOnInfo.runtime};
  }

  return enrichedMovie;
}
