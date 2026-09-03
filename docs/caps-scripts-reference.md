# CAPS Apps Scripts — Reference

**Snapshot date:** 28 August 2026
**Purpose:** Verbatim source of the three Apps Scripts discovered during documentation, so they're preserved independent of any conversation.

---

## 1. Volunteer Registration form — `onFormSubmit`

Bound to `CAPS Volunteer Registration Form`. Fires on every submission, POSTs to Make.

```javascript
function onFormSubmit(e) {
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();
  var r = {};
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i];
    var itemType = item.getItem().getType();
    if (itemType === FormApp.ItemType.CHECKBOX_GRID) {
      var gridItem = item.getItem().asCheckboxGridItem();
      var rows = gridItem.getRows();
      var responses = item.getResponse();
      for (var j = 0; j < rows.length; j++) {
        var key = item.getItem().getTitle() + ' [' + rows[j] + ']';
        r[key] = (responses[j] && responses[j].length > 0) ? responses[j].join(', ') : '';
      }
    } else {
      r[item.getItem().getTitle()] = item.getResponse();
    }
  }
  function val(fieldName) { return r[fieldName] ? r[fieldName].toString().trim() : ''; }
  function fmtDate(input) {
    if (!input || input.toString().trim() === '') return '';
    var d = new Date(input);
    if (isNaN(d.getTime())) return input.toString().trim();
    return Utilities.formatDate(d, 'Australia/Brisbane', 'dd/MM/yyyy');
  }
  var now = new Date();
  var timestampDisplay = Utilities.formatDate(now, 'Australia/Brisbane', 'dd/MM/yyyy');
  var timestampFolder  = Utilities.formatDate(now, 'Australia/Brisbane', 'yyyyMMdd');
  var payload = {
    form_type: 'volunteer_application',
    timestamp_display: timestampDisplay,
    timestamp_folder: timestampFolder,
    surname: val('Surname'),
    firstname: val('First Name'),
    vol_name: val('Nickname - what do you like to be called?'),
    email: val('Email address'),
    phone: val('Contact Phone Number'),
    dob: fmtDate(val('Date of Birth')),
    address: val('Residential Address'),
    postal_address: val('Postal Address (if different from above)'),
    licence_number: val('Drivers Licence Number'),
    work_with_children: val('Do you hold a current working with children card (not required but sometimes useful)'),
    medical_issues: val('Please share any relevant emergency medical information eg allergies, or serious health conditions'),
    ec_name: val('Full name of emergency contact'),
    ec_email: val('Emergency contact email'),
    ec_phone: val('Emergency contact phone number'),
    ec_relationship: val('Relationship to volunteer'),
    motivation: val('Briefly describe your interest and motivation in volunteering with CAPS'),
    experience: val('Briefly describe your experience and confidence in handling dogs - this helps us understand how we can support you.'),
    foster_or_jailbreak: val('Please tick all activities you are interested in, you can choose more than one [Foster Care / Jail Break (additional form)]'),
    committee: val('Please tick all activities you are interested in, you can choose more than one [Committee Member]'),
    fundraising: val('Please tick all activities you are interested in, you can choose more than one [Fundraising/Community Events]'),
    walking: val('Please tick all activities you are interested in, you can choose more than one [Dog Walking]'),
    feeding: val('Please tick all activities you are interested in, you can choose more than one [Shelter feeding and cleaning]'),
    transport: val('Please tick all activities you are interested in, you can choose more than one [Pet transport]'),
    pet_minding: val('Please tick all activities you are interested in, you can choose more than one [Pet minding (feed when owner is away)]'),
    cooking: val('Please tick all activities you are interested in, you can choose more than one [Cooking / Food preparation]'),
    social_media: val('Please tick all activities you are interested in, you can choose more than one [Social media]'),
    where_useful: val('Please tick all activities you are interested in, you can choose more than one [Wherever I can be most useful]'),
    referral: val('How did you hear about volunteering with CAPS?'),
    photo_consent: val('Do you consent to having your image used for promotional purposes eg facebook or flyers'),
    agree_to_terms: val('Do you agree to the above terms?'),
    vol_sig_name: val('Volunteer full name'),
    vol_sig_date: fmtDate(val('Volunteer Signature Date')),
    under_18: val('Are you under 18?'),
    parent_agree_to_terms: val('I am the parent or guardian of the volunteer, I have read the above terms and'),
    parent_name: val('Parent or Guardian Name'),
    parent_email: val('Parent or Guardian email'),
    parent_phone: val('Parent or Guardian phone'),
    parent_sig_date: fmtDate(val('Parent or Guardian Signature Date'))
  };
  try {
    UrlFetchApp.fetch('https://hook.eu1.make.com/rn0mi7vuq1ijodhhyxgownn44t6yhqy4', {
      method: 'POST', contentType: 'application/json', payload: JSON.stringify(payload)
    });
  } catch (err) {
    Logger.log('Webhook POST failed: ' + err.toString());
  }
}
```

---

## 2. Homecare Registration form — `onFormSubmit`

Bound to `CAPS Homecare Registration Form`. Same webhook, same silent-failure pattern.

```javascript
function onFormSubmit(e) {
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();
  var r = {};
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i];
    var itemType = item.getItem().getType();
    if (itemType === FormApp.ItemType.CHECKBOX_GRID) {
      var gridItem = item.getItem().asCheckboxGridItem();
      var rows = gridItem.getRows();
      var responses = item.getResponse();
      for (var j = 0; j < rows.length; j++) {
        var key = item.getItem().getTitle() + ' [' + rows[j] + ']';
        r[key] = (responses[j] && responses[j].length > 0) ? responses[j].join(', ') : '';
      }
    } else if (itemType === FormApp.ItemType.GRID) {
      var mcGridItem = item.getItem().asGridItem();
      var mcRows = mcGridItem.getRows();
      var mcResponses = item.getResponse();
      for (var k = 0; k < mcRows.length; k++) {
        var mcKey = item.getItem().getTitle() + ' [' + mcRows[k] + ']';
        r[mcKey] = mcResponses[k] ? mcResponses[k].toString().trim() : '';
      }
    } else {
      r[item.getItem().getTitle()] = item.getResponse();
    }
  }
  function val(fieldName) { return r[fieldName] ? r[fieldName].toString().trim() : ''; }
  function fmtDate(input) {
    if (!input || input.toString().trim() === '') return '';
    var d = new Date(input);
    if (isNaN(d.getTime())) return input.toString().trim();
    return Utilities.formatDate(d, 'Australia/Brisbane', 'dd/MM/yyyy');
  }
  var now = new Date();
  var timestampDisplay = Utilities.formatDate(now, 'Australia/Brisbane', 'dd/MM/yyyy');
  var timestampFolder  = Utilities.formatDate(now, 'Australia/Brisbane', 'yyyyMMdd');
  var payload = {
    form_type: 'homecare_application',
    timestamp_display: timestampDisplay,
    timestamp_folder: timestampFolder,
    vol_registration: val('Have you completed a volunteer registration form?'),
    surname: val('Surname'),
    firstname: val('First Name'),
    vol_name: val('Nickname - what should we call you'),
    email: val('Email address'),
    phone: val('Contact Phone Number'),
    over_18: val('Are you over 18?'),
    jb_day: val('What kind of homecare are you interested in? [Jail Break - Day]'),
    jb_weekend: val('What kind of homecare are you interested in? [Jail Break - Weekend]'),
    jb_shift: val('What kind of homecare are you interested in? [Jail Break - Shift Roster]'),
    jb_school: val('What kind of homecare are you interested in? [Jail Break - School Holidays]'),
    foster_short: val('What kind of homecare are you interested in? [Foster - Short term (1-3 weeks)]'),
    foster_long: val('What kind of homecare are you interested in? [Foster - Long term (4 weeks +)]'),
    address: val('Residential Address'),
    property_ownership: val('What is your property ownership status'),
    fence_height: val('What is the height of the fencing in your home'),
    fence_type: val('What is the type of fencing in your home?'),
    people_at_home: val('Number of people living in the premises'),
    children_u16: val('Ages of any children under 16'),
    other_animals: val('Do you have any other animals in the house?'),
    animal_details: val('Tell us about them - their breed, age, sex, temperament etc'),
    vaccines: val('If you have other animals are they up to date with vaccinations and currently on prevention?'),
    experience: val('Briefly describe your experience and confidence in handling dogs - this helps us understand how we can support you.'),
    agree_terms: val('Do you agree to the above terms?'),
    signature_name: val('Volunteer full name'),
    signature_date: fmtDate(val('Date'))
  };
  try {
    UrlFetchApp.fetch('https://hook.eu1.make.com/rn0mi7vuq1ijodhhyxgownn44t6yhqy4', {
      method: 'POST', contentType: 'application/json', payload: JSON.stringify(payload)
    });
  } catch (err) {
    Logger.log('Webhook POST failed: ' + err.toString());
  }
}
```

---

## 3. Dogs sheet — `sortDogsByLastWalk`

Standalone, bound to `CAPS_walking_log_MASTER` directly. Time-driven trigger, every 10–15 minutes. See `dogs-current-state.md` for the redundancy note against AppSheet's own view sort.

```javascript
function sortDogsByLastWalk() {
  const ss = SpreadsheetApp.getActive();
  const dogsSheet = ss.getSheetByName("Dogs");
  const walksSheet = ss.getSheetByName("Walks");
  const walksLastRow = walksSheet.getLastRow();
  let lastWalkByDog = {};
  if (walksLastRow > 1) {
    const walksData = walksSheet.getRange(2, 1, walksLastRow - 1, 5).getValues();
    walksData.forEach(function (row) {
      const dogId = row[1];
      const checkIn = row[4];
      if (!dogId) return;
      if (!(checkIn instanceof Date)) return;
      const t = checkIn.getTime();
      if (!(dogId in lastWalkByDog) || t > lastWalkByDog[dogId]) {
        lastWalkByDog[dogId] = t;
      }
    });
  }
  const dogsLastRow = dogsSheet.getLastRow();
  const dogsLastCol = dogsSheet.getLastColumn();
  if (dogsLastRow <= 1) return;
  const dogsRange = dogsSheet.getRange(2, 1, dogsLastRow - 1, dogsLastCol);
  const dogsData = dogsRange.getValues();
  const dogsWithKeys = dogsData.map(function (row) {
    const dogId = row[0];
    const lastWalk = lastWalkByDog.hasOwnProperty(dogId) ? lastWalkByDog[dogId] : -1;
    return { row: row, sortKey: lastWalk };
  });
  dogsWithKeys.sort(function (a, b) { return a.sortKey - b.sortKey; });
  const sortedRows = dogsWithKeys.map(function (item) { return item.row; });
  dogsRange.setValues(sortedRows);
}
```
