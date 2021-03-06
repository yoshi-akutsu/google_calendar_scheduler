// Changes needed
// -Automatically finding team meetings -- if it has client planning in the name or team meeting

// *******************************************************************************
// START MAIN
//

// Variables to change: 
let onlineOnly = true;
let daysForward = 21;
let latestFriday = 17;

// Allows separate html pages to be included
function include(filename){
   return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Initializes web app
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function draftAvailabilityEmail() {
  createDraft("yoshi@collegeliftoff.org", getCalendarDays());
}

// Creates email drafts
function createDraft(email, calendarDays) {
  let msg = "";
  
  for (let i = 0; i < calendarDays.length; i++) {
    let month = calendarDays[i].month + 1;
    let date = calendarDays[i].date;
    let dayOfWeek = calendarDays[i].dayOfWeek;
    let formattedSlots = formatSlots(calendarDays[i].validStartTimes);
    
    let oneDay = month + "/" + date + " (" + getDayOfWeekName(dayOfWeek) + "): " + formattedSlots + "\n";
    msg += oneDay;
  }
  GmailApp.createDraft(email, "Rescheduling", msg);
}

function createCalendarEvent(obj) {
  //
  // Add addresses
  //
  
  let date = new Date(obj.date[0], obj.date[1], obj.date[2], obj.date[3]);
  let endDate = new Date(date);
  endDate.setHours(date.getHours() + 1);
  
  let emails = obj.email;
  if (obj.email2.length > 0) {
    emails = emails + "," + obj.email2
  }
  if (obj.email3.length > 0) {
    emails = emails + "," + obj.email3
  }
  
  let title = fixFormatting(obj.location) + "- "+ fixFormatting(obj.firstName) + " " + fixFormatting(obj.lastName);
  let event = CalendarApp.getDefaultCalendar().createEvent(title, date, endDate, {guests: emails, sendInvites: true});

}

// 
// END MAIN
// *******************************************************************************

// *******************************************************************************
// START HELPER FUNCTIONS
//

// Example input to output: 12:30 => 12.5
function formatDate(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes() / 60;
  return hours + minutes;
}

function getDayOfWeekName(number) {
  switch (number) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
  }
}

function decimalToMinutes(number) {
  let decimal = number - Math.floor(number);
  if (decimal == 0) return number;
  if (decimal == 0.5) return (Math.floor(number) + ":30");
  if (decimal == 0.25) return (Math.floor(number) + ":15");
  if (decimal == 0.75) return (Math.floor(number) + ":45");
}

function militaryToTwelveHour(militaryHour) {
  if (militaryHour > 12) {
    let twelveHour = militaryHour - 12;
    twelveHour = decimalToMinutes(twelveHour) + "pm";
    return twelveHour;
  }
  else if (militaryHour == 12) {
    let twelveHour = militaryHour;
    twelveHour = decimalToMinutes(twelveHour) + "pm";
    return twelveHour;
  }
  else {
    let twelveHour = militaryHour;
    twelveHour = decimalToMinutes(twelveHour) + "am";
    return twelveHour;
  }
}

function fixFormatting(name) {
  var array = name.split(" ");
  if (array.length == 2) {
    let firstName = array[0].split("");
    let lastName = array[1].split("");
    firstName[0] = firstName[0].toUpperCase();
    lastName[0] = lastName[0].toUpperCase();
    return firstName.join("") + " " + lastName.join("");
  }
  else if (array.length == 1){
    let name = array[0].split("")
    name[0] = name[0].toUpperCase();
    return name.join("");
  }
  else {
    return name;
  }
}

// Example input: [11.0, 11.25, 11.5, 11.75, 12.0, 12.25, 12.5, 12.75, 13.0, 13.25, 13.5, 13.75]
function formatSlots(validStartTimes){
  let formattedString = "";
  for (let i = 0; i < validStartTimes.length; i++) {
      if (i === 0) {
        formattedString = formattedString + militaryToTwelveHour(validStartTimes[0]);
        formattedString = formattedString + "-";
      }
      if (validStartTimes[i + 1] - validStartTimes[i] != 0.25) {
        if (i !== validStartTimes.length - 1) {
          formattedString = formattedString + militaryToTwelveHour((validStartTimes[i] + 1));
          formattedString = formattedString + ", " + militaryToTwelveHour(validStartTimes[i + 1]) + "-";  
        }
        else {
          formattedString = formattedString + militaryToTwelveHour((validStartTimes[i] + 1));
        }
      }
  }
  return formattedString + " ET";
}

function doesRangeMatchMeeting(time, meetingTimes) {
  for (let i = 0; i < meetingTimes.length; i++) {
    for (let j = meetingTimes[i].startTime; j < meetingTimes[i].startTime + meetingTimes[i].lengthTime; j += 0.25) {
      if (time === j) {
        return true;
      }
    }
  }
  return false;
}

// 
// END HELPER FUNCTIONS
// *******************************************************************************
  

// *******************************************************************************
// START CONTROLLER FUNCTIONS
//

// Returns working location for the day
function getLocationalAvailability() {
  
}

// Gets meeting start time and length in hours
function getMeetingTimes(daysEvents) {
  let meetingTimes = [];
  for(let i = 0; i < daysEvents.length; i++) {
    let meeting = {};
    meeting.startTime = formatDate(daysEvents[i].getStartTime());
    meeting.lengthTime = formatDate(daysEvents[i].getEndTime()) - formatDate(daysEvents[i].getStartTime());
    meetingTimes.push(meeting);
  }
  return meetingTimes;
}

// Takes {startTime: foo, lengthTime: bar} and defines a range of availability based on rules
function defineWorkHours(meetingTimes) {
  let range = {};
  // Latest work hours on an empty day
  let max = 19;
  // Earliest work hours on an empty day
  let min = 11;
  
  // Checking for actual meetings that fall outside the ideal range defined above
  for(let i = 0; i < meetingTimes.length; i++) {
    if (meetingTimes[i].startTime + meetingTimes[i].lengthTime > max) {
      max = meetingTimes[i].startTime + meetingTimes[i].lengthTime;
    }
    if (meetingTimes[i].startTime < min) {
      min = meetingTimes[i].startTime;
    }
  }
  
  // Adjusting working hours if meetings fall outside of the predefined range
  if (max >= 20) {
    min = max - 7;
  }
  if (min <= 10) {
    max = min + 7
  }
  range.max = max;
  range.min = min;
  return range;
}

// Finds where there is not overlap between range and meeting range for one day
function findOpenings(range, day) {
  let openings = [];
  for (let i = range.min; i < range.max; i += .25) {
    if (doesRangeMatchMeeting(i, getMeetingTimes(getOneDaysEvents(day).events)) === true) {
      continue;
    }
    else {
      openings.push(i);
    }     
  }
  return openings;
}

// Sample input: { month: 11.0, dayOfWeek: 3.0, date: 18.0, openings: [11.0, 11.25, 11.5, 11.75, 12.0, 12.25, 12.5, 12.75, 13.0, 13.25, 13.5, 13.75] }
function findHourSlots(calendarDay){
  let validStartTimes = [];
  for (let i = 0; i < calendarDay.openings.length; i++) {
    if (calendarDay.openings[i] + 0.25 == calendarDay.openings[i + 1]) {
      if (calendarDay.openings[i] + 0.50 == calendarDay.openings[i + 2]) {
        if (calendarDay.openings[i] + 0.75 == calendarDay.openings[i + 3]) {
          if (calendarDay.dayOfWeek != 5) {
            validStartTimes.push(calendarDay.openings[i]);
          }
          else {
            if (calendarDay.openings[i] <= latestFriday) {
              validStartTimes.push(calendarDay.openings[i]);
            }
          }
        }
      }
    }
  }
  return validStartTimes;
}

function getOneDaysEvents(daysFromToday) {
  let now = new Date();
  let day = new Date(now.getTime() + ((24 * daysFromToday) * 60 * 60 * 1000));
  let events = CalendarApp.getDefaultCalendar().getEventsForDay(day);
  
  let teamEvents = CalendarApp.getCalendarById("collegeliftoff.org_t5ha6hmrg9tsgal01g1j0ocsao@group.calendar.google.com").getEventsForDay(day);
  if (teamEvents) {
    for (let i = 0; i < teamEvents.length; i++) {
      if (teamEvents[i].getTitle().includes("Client Planning") || teamEvents[i].getTitle().includes("CL Team")) {
        events.push(teamEvents[i]);
      }
    }
  } 
  return { events: events, day: day };
}

// Locational availability logic
function getDaysLocation(eventsArray) {
  let bethel = false;
  let powell = false;
  for (let i = 0; i < eventsArray.length; i++) {
    if (eventsArray[i].getTitle().search("ethel") === -1) {
      if (eventsArray[i].getTitle().search("owell") === -1) {
        continue;
      }
      else {
        powell = true;
      }
    }
    else {
      bethel = true;
    }
  }
  if (onlineOnly === true) {
    return {bethel: true, powell: true};
  }
  
  return {bethel: bethel, powell: powell};

}

// Gets calendar days for next 21 days
function getCalendarDays() { 
  let calendarDays = [];
  // Number of days forward to look is defined here
  for (let i = 0; i < daysForward; i++) {
    let calendarDay = {};

    let events = getOneDaysEvents(i);
    calendarDay.dayOfWeek = events.day.getDay();
    calendarDay.month = events.day.getMonth();
    calendarDay.date = events.day.getDate();
    
    if (calendarDay.dayOfWeek == 0 || calendarDay.dayOfWeek == 6) {
      calendarDay.openings = [];
      continue;
    }
    let meetingTimes = getMeetingTimes(events.events);
    let workHours = defineWorkHours(meetingTimes);
    calendarDay.openings = findOpenings(workHours, i);
    calendarDay.validStartTimes = findHourSlots(calendarDay);
    calendarDay.location = getDaysLocation(events.events);
    delete calendarDay.openings;
    calendarDays.push(calendarDay);  
  }
  // I now have a great calendar object with which to build out the calendar GUI
  return calendarDays; 
}

//
// END CONTROLLER FUNCTIONS
// *******************************************************************************