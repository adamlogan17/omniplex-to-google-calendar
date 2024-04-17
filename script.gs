// TODO Need to see if there is a way to attach QR code to calendar
function main() {
  let threadsNew = GmailApp.search("from:confirmation@omniplex.ie");
  let emailBody = threadsNew[0].getMessages()[0].getBody();
  let movieInfo = extractMovieInfo(emailBody);
  // console.log(movieInfo);
  createCalendarEvent(movieInfo);
}

function createCalendarEvent(movie, people=[]) {
  let endDate = new Date(movie.startDateTime);
  endDate.setHours(endDate.getHours() + movie.runtime.hours);
  endDate.setMinutes(endDate.getMinutes() + movie.runtime.minutes);
  console.log(endDate);
  console.log(movie.startDateTime);
  CalendarApp.createEvent(
    movie.title,
    movie.startDateTime,
    endDate,
    {
      description:
      `Below is the information for ${movie.title}, at ${movie.cinemaName}

Screen: ${movie.screen}
Seat: ${movie.seat}
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
    cinemaName:""
  }

  let scriptObjArry = [];
  let retrieveScriptObj = false;

  for (let i=0; i<bodyArry.length-1; i++) {
    let line = bodyArry[i];
    let nextValue = "";

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
      <td id='RUNNUNG TIME' />
        <p>2hrs 20mins</p>
      </td>
      */
      nextValue = XmlService.parse(bodyArry[i+1]).getContent(0).getValue();
    } catch {
      nextValue = "PARSING ERROR"
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
    }
  }

  // transform the scriptObjArry into a parsable format and then parse into an Object for easy information extraction
  scriptObjArry[0] = "{";
  scriptObjStr = scriptObjArry.join("");
  scriptObj = JSON.parse(scriptObjArry.join(""));

  // Adds the information from the scipt tag into the movie object
  movie.cinemaName = scriptObj.reservationFor.location.name;
  movie.location.streetAddress = scriptObj.reservationFor.location.address.streetAddress;
  movie.location.addressLocality = scriptObj.reservationFor.location.address.addressLocality;
  movie.location.addressRegion = scriptObj.reservationFor.location.address.addressRegion;
  movie.location.postalCode = scriptObj.reservationFor.location.address.postalCode;
  
  movie.title = scriptObj.reservationFor.name;
  movie.startDateTime = new Date(scriptObj.reservationFor.startDate);

  return movie;
}
