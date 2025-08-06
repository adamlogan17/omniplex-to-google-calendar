- [omniplex-to-google-calendar](#omniplex-to-google-calendar)
  - [Project Set Up](#project-set-up)
  - [Legacy Email Support](#legacy-email-support)
    - [Way Back Machine](#way-back-machine)
      - [Manual Way Back Machine Search](#manual-way-back-machine-search)
  - [Useful Resources](#useful-resources)

# omniplex-to-google-calendar

This is a short Google AppScript that adds Omniplex cinema bookings automatically to your personal Google calendar. This script also creates a google sheet which will record the movies that are booked.

This project can be found on my Google Drive [here](https://drive.google.com/drive/folders/1T1EYRSRt4K_UmIp4Vn5sbXDr8VLHPTn4?usp=sharing). When viewing in Google Drive, please open the [.gscript](https://script.google.com/d/1nrZ_RDx2flhpvUYVkEWl9DRrlS6c8eqSYULoolTtQzrA5oAjDjVsCiQ-/edit?usp=drive_link) file to view in the editor. The [.gs](https://github.com/adamlogan17/omniplex-to-google-calendar/blob/main/script.gs) file is simply here to allow the code to be viewed on [GitHub](https://github.com/adamlogan17/omniplex-to-google-calendar).

## Project Set Up

- Copy the `.gscript` anywhere within your own Google Drive.
- Run the script to give the required permissions for the script
- Set a time trigger to run for the script to run for 10 minutes

## Legacy Email Support

Omniplex had updated their booking confirmation email format, the script supports both scrapping the older format and the new format. This allows for older booking confirmations to be added to the script.

To allow for older booking confirmations to be added to your Google Calendar and Google Sheet, follow the instructions below:

1. Disable the time trigger
2. Change the `sentTime > timeAtLastTrigger` condition to `sentTime > 0`
3. Manually run the script
4. Revert the change made in step 2
5. Re-enable/Re-add the 10 minute time trigger

### Way Back Machine

To ensure the "whats on" information ('age rating', 'description', 'director', 'starring', and 'genres'), can be scraped for older bookings the Way Back machine API is used to fetch the older pages.

#### Manual Way Back Machine Search

If you wish to manually search for a movie on the way back machine, you can use [this](https://web.archive.org/web/*/https://www.omniplex.ie/whatson/movie/showtimes/*) link. Use the filter and type a keyword of the movie title and check the list to look for the movie that you are looking for.

## Useful Resources

- [Advanced Calender Invite](https://stackoverflow.com/questions/34853043/create-an-event-with-an-attachment-on-calendar-via-google-apps-script)
- [Advanced Calendar Service](https://developers.google.com/apps-script/advanced/calendar)
- [Way Back Machine API Documentation](https://archive.org/help/wayback_api.php)
- [Way Back Machine CDX Server GitHub Repo](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)