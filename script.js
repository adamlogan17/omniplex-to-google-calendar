// TODO Need to see if there is a way to attach QR code to calendar
function main() {
  let threadsNew = GmailApp.search("from:confirmation@omniplex.ie");
  let emailBody = threadsNew[0].getMessages()[0].getBody();
  let movieInfo = extractMovieInfo(emailBody);
  console.log(movieInfo);
}

/*
 * A td tag is not closed within the body and therefore the whole body cannot be parsed
 * this results in a search of the body for relevant values, and then these tags (which are p tags)
 * needing to be parsed to get the relevant value
 * 
 * The location, movie title and cinema name is stored within an object, that is contained in the script tag
 */
function extractMovieInfo(emailBody) {
  let bodyArry = emailBody.split('\n');
  
  let movie = {
    title:"",
    screen:"",
    seat:"",
    runtime:"",
    dateTime:"",
    location: {
      streetAddress: "",
      addressLocality: "",
      addressRegion: "",
      postalCode: ""
    },
    cinemaName:"",
    startTime:""
  }

  let scriptObjArry = [];
  let retrieveScriptObj = false;

  for (let i=0; i<bodyArry.length-1; i++) {
    let line = bodyArry[i];
    let nextValue = "";

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
      movie.runtime = nextValue;
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
  movie.dateTime = new Date(scriptObj.reservationFor.startDate);

  return movie;
}
