function main() {
  // Within the subject of the email, normally it would contain the cinema cinema name after the '-' but by leaving this out, this allows the seacrh to cover all locations
  // TODO make the search term a smaller time frame to lower the amount of emails that need to be checked
  let threadsNew = GmailApp.search("from:(confirmation@omniplex.ie) subject:(Omniplex Cinemas - : Booking Confirmation)");
  const TRIGGERINTERVAL = 1000 * 60 * 10;
  const timeAtLastTrigger = new Date() - TRIGGERINTERVAL;
  let allMovies = [];

  for (thread of threadsNew) {
    for(email of thread.getMessages()) {
      sentTime = email.getDate();
      // checks all relevant emails, to see if they are within the last 10 minutes
      if (sentTime > timeAtLastTrigger) {
        let emailBody = email.getBody();
        try {
          let movieInfo = extractMovieInfo(emailBody);
          allMovies.push(movieInfo);
        } catch {}
        createCalendarEvent(movieInfo);
      }
    }
  }
  addToMovieSpreadsheet(allMovies);

}

// TODO, maybe create a 'map' object and use .indexOf to place the elemeents in moviesAsArry, allowing for the header names to be changed with relative ease
function addToMovieSpreadsheet(movies, ssName="Omnipass Movies") {
  const thisScriptid = ScriptApp.getScriptId();
  const thisFolder = DriveApp.getFileById(thisScriptid).getParents().next();
  let ss;
  let sheet;
  // This is needed as ss, needs to be defined before sheet can be defined, which takes place after the if statement to check
  // if the spreadsheet exists and therefore another condition is needed to prevent the header being constantly set
  let addHeader = false;
  const COLUMNWIDTH = 200;
  const ROWHEIGHT = 300;
  const HEADER = ["Title", "Movie Poster", "Screen", "Seat Number", "Runtime", "Start Date", "Start Time", "Cinema Name", "Address", "QR Code URL", "Ticket Download"];

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
    sheet.setColumnWidth(HEADER.indexOf('QR Code URL') + 1, COLUMNWIDTH);
  }

  let moviesAsArry = movies.map((movie) => [
    movie.title,
    insertCellImage(movie.moviePoster),
    movie.screen, 
    movie.seat, 
    `${movie.runtime.hours}hr(s) ${movie.runtime.minutes}min(s)`,
    movie.startDateTime.toLocaleDateString("en-GB"),
    `${movie.startDateTime.getHours()}:${movie.startDateTime.getMinutes()}`,
    movie.cinemaName,
    `${movie.location.streetAddress}, ${movie.location.addressLocality}, ${movie.location.postalCode}`,
    insertCellImage(movie.qrCodeUrl),
    movie.ticket
  ]);


  sheet.setRowHeights(sheet.getLastRow() + 1, movies.length, ROWHEIGHT);

  let movieRange = sheet.getRange(sheet.getLastRow() + 1, 1, movies.length, HEADER.length);
  movieRange.setValues(moviesAsArry).setWrap(true);
}

// TODO give optional parameter, for the scipt to allow the spreadsheet external url access
function insertCellImage(imageUrl) {
  return `=IMAGE("${imageUrl}")`
}

function createCalendarEvent(movie, people=[]) {
  let endDate = new Date(movie.startDateTime);
  endDate.setHours(endDate.getHours() + movie.runtime.hours);
  endDate.setMinutes(endDate.getMinutes() + movie.runtime.minutes);
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

function strToTime(timeStr) {
  let splitTime = timeStr.trim().split(" ");
  return {
    // If hours is 1hr, then only remove the last 2 characters, otherwise we can assume it is 'hrs' and therefore need to remove last 3 characters
    hours: splitTime[0].length === 3 ? parseInt(splitTime[0].slice(0, -2)) : parseInt(splitTime[0].slice(0, -3)),
    // Currently it always ends in 'min' no matter how many minutes it is
    minutes: parseInt(splitTime[1].slice(0, -3))
  }
}

/*
 * A td tag is not closed within the body and therefore the whole body cannot be parsed
 * this results in a search of the body for relevant values, and then these tags (which are p tags)
 * needing to be parsed to get the relevant value
 * 
 * The location, movie title and cinema name is stored within an object, that is contained in the script tag
 */
// TODO Currently adTime will result in a 65mins, rather than adding an hour to the time
function extractMovieInfo(emailBody, adTime=10) {
  let bodyArry = emailBody.split('\n');
  
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
    moviePoster:""
  }

  let scriptObjArry = [];
  let retrieveScriptObj = false;

  for (let i=0; i<bodyArry.length-1; i++) {
    let line = bodyArry[i];
    let nextValue = "";
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

    try {
      // The relevant value is continued within the p tag of the next line, of the tag which contains the actual value
      // The below comment is not exact, it is used for illustration purposes only
      /*
      <td id='RUNNING TIME' />
        <p>2hrs 20mins</p>
      </td>
      */
      nextValue = XmlService.parse(bodyArry[i+1]).getContent(0).getValue();
    } catch {
      nextValue = "PARSING ERROR";
    }

    // two try catch blocks are used as one line may cause an error but the other should be properly defined
    try {
      // The below is how to extract the value for the 'src' attribute, all images in the table are the second element of the line, in which they are defines
      imgLink = XmlService.parse(line).getContent(1).getAttribute("src").getValue();
    } catch {
      imgLink = "PARSING ERROR";
    }

    if(line.includes("RUNNING TIME")) {
      movie.runtime = strToTime(nextValue);
      movie.runtime.minutes += adTime
    } else if (line.includes("SCREEN") && !line.includes("TYPE")) {
      movie.screen = nextValue;
    } else if (line.includes("TIME")) {
      movie.startTime = nextValue;
    } else if (line.includes("SEATS")) {
      movie.seat = nextValue;
    } else if (line.includes("dynamic/QRcodes")) {
      movie.qrCodeUrl = imgLink;
    } else if (line.includes("filmimages")) {
      // the small version of the image is within the body of the email, but by swapping out 'small' with 'large' a larger version is retrieved (it appears a medium option is not available)
      movie.moviePoster = imgLink.replace("small", "large");
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
  movie.startDateTime = new Date(scriptObj.reservationFor.startDate);

  // There is a different link for just the QR code, rather than this link, which downloads the ticket as a pdf
  movie.ticket = scriptObj.ticketDownloadUrl;

  return movie;
}
