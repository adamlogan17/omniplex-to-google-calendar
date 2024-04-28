- [omniplex-to-google-calendar](#omniplex-to-google-calendar)
  - [Project Set Up](#project-set-up)
  - [Useful Resources](#useful-resources)

# omniplex-to-google-calendar

This is a short Google AppScript that adds Omniplex cinema bookings automatically to your personal Google calendar. This script also creates a google sheet which will record the movies that are booked.

This project can be found on my Google Drive [https://drive.google.com/drive/folders/1T1EYRSRt4K_UmIp4Vn5sbXDr8VLHPTn4?usp=sharing](here). When viewing in Google Drive, please open the [.gscript](https://script.google.com/d/1nrZ_RDx2flhpvUYVkEWl9DRrlS6c8eqSYULoolTtQzrA5oAjDjVsCiQ-/edit?usp=drive_link) file to view in the editor. The [.gs](https://github.com/adamlogan17/omniplex-to-google-calendar/blob/main/script.gs) file is simply here to allow the code to be viewed on [GitHub](https://github.com/adamlogan17/omniplex-to-google-calendar).

## Project Set Up

- Copy the `.gscript` anywhere within your own Google Drive.
- Run the script to give the required permissions for the script
  - If you would like for the previous bookings to be recorded, simply comment lines 14 and 22 out, ensure that this is undone when the script is finished running
- Set a time trigger to run for the script to run for 10 minutes

## Useful Resources

- [https://stackoverflow.com/questions/34853043/create-an-event-with-an-attachment-on-calendar-via-google-apps-script](Advanced Calender Invite)
- [https://developers.google.com/apps-script/advanced/calendar](Advanced Calendar Service)
