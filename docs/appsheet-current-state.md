# CAPS Dog Enrichment App — AppSheet current state

> Parsed from `Application Documentation.html` (AppSheet's own export, generated 03/09/2026 06:03).
> Lossless source of truth: `appsheet-current-state.json`. This file is the readable view.

## App summary

- **Short Name**: CAPS Dog Enrichment App
- **Version**: 1.000639
- **Default app folder**: /appsheet/data/CAPSDatabase-784884245
- **Runnable**: Yes
- **Deployable**: No
- **Personal use only**: No
- **Tables**: 15
- **Columns**: 257
- **Slices**: 10
- **Views**: 58
- **Format Rules**: 0
- **Actions**: 53
- **Workflow Rules**: 0
- **Generated at**: 03/09/2026, 06:03:41

- Tables parsed: 7 | Columns: 257 | Slices: 10 | Views: 58 | Actions: 53 | Process/output pseudo-tables: 8

## Tables

### Dogs
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Dogs
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (29):**

- `_RowNumber` · Number · read-only · hidden
- `Dog_ID` · Text · **LABEL**
  - initial: `="D" & RIGHT("000" & (22 + COUNT(SELECT(Dogs[Dog_ID], LEFT([Dog_ID], 1) = "D")) + 1), 3)`
  - LongTextFormatting: `Plain Text`
- `Dog Name` · Name
  - LongTextFormatting: `Plain Text`
- `Level` · Enum
  - EnumValues: `["Beginner", "Intermediate", "Advanced"]`
- `Status` · Enum
  - initial: `="Available"`
  - EnumValues: `["Walking", "Available", "Bed Rest", "Jail Break", "Fostered", "Exited"]`
- `Arrival Date` · Date
  - initial: `TODAY()`
  - Show_If: `=CONTEXT("ViewType") = "Form"`
- `Arrival Type` · Enum
  - Show_If: `=CONTEXT("ViewType") = "Form"`
  - EnumValues: `["Rescue", "Surrender", "Return", "Stray", "Pound"]`
- `Arrival Notes` · LongText
  - Show_If: `=CONTEXT("ViewType") = "Form"`
  - LongTextFormatting: `Plain Text`
- `Exit Date` · Date
  - initial: `=IF([Status] = "Exited", TODAY(), "")`
  - Reset_If: `=[Status] <> [_THISROW_BEFORE].[Status]`
- `Exit Type` · Enum
  - EnumValues: `["Adopted", "Transferred", "Reclaimed", "Death"]`
- `Exit Notes` · LongText
  - LongTextFormatting: `Plain Text`
- `Total Days with CAPS` · Number
  - formula: `=999`
- `Medical Notes` · LongText
  - LongTextFormatting: `Plain Text`
- `Bed Rest Start` · Date
  - initial: `=TODAY()`
  - Reset_If: `=[Status] <> [_THISROW_BEFORE].[Status]`
- `Bed Rest End` · Date
  - initial: `=IF([Status]="Bed Rest", TODAY(), "")`
- `Last Homecare Start Date` · Date
  - initial: `TODAY()`
- `Last_Walk_DateTime` · DateTime
  - formula: `=[Latest Walk Event].[Check Out]`
- `Bed Rest Due Back` · Date
- `Related Walks` · List · read-only
  - formula: `=ORDERBY(REF_ROWS("Walks", "Dog_ID"), [Check Out], FALSE)`
- `Dog_Label_Display` · Text · read-only
  - formula: `=[Dog Name] & " | LastWalk:" & [Days_Since_Last_Walk] & " | 4WkMins:" & FLOOR( SUM( SELECT( Walks[Walk_Length_Minutes], AND( ([Dog_ID] = [_THISROW].[Dog_ID]), ([Check Out] > (TODAY() - 28)) ) ) ) )`
  - LongTextFormatting: `Plain Text`
- `Days_Since_last_Walk` · Text · read-only
  - formula: `=IF( [Sort_Days_Since_Last_Walk] = 999, "No Walks Yet", TEXT([Sort_Days_Since_Last_Walk]) & " days" )`
  - LongTextFormatting: `Plain Text`
- `Sort_Days_Since_Last_Walk` · Number · read-only
  - formula: `=IF( ISBLANK( MAX( SELECT(Walks[Check In], ([Dog_ID] = [_THISROW].[Dog_ID])) ) ), 999, FLOOR(HOUR(NOW() - DATE(MAX(SELECT(Walks[Check In], ([Dog_ID] = [_THISROW].[Dog_ID]))))) / 24) )`
- `Walk_Time_Past_Month` · Text · read-only
  - formula: `=SUM( SELECT( Walks[Walk_Length_Minutes], AND( ([Dog_ID] = [_THISROW].[Dog_ID]), ([Check Out] > (TODAY() - 28)) ) ) ) & " mins"`
  - LongTextFormatting: `Plain Text`
- `Time with CAPS` · Text · read-only
  - formula: `=IF( [Total Days with CAPS] >= 7300, "Time unknown", CONCATENATE( IF([Total Days with CAPS] >= 365, CONCATENATE(FLOOR([Total Days with CAPS] / 365), " Y, "), ""), IF(MOD([Total Days with CAPS], 365) >= 30, CONCATENATE(FLOOR(MOD([Total Days with CAPS], 365) / 30), " M, "), ""), CONCATENATE(ROUND(MOD(MOD([Total Days with CAPS], 365), 30)), " D") ) )`
  - LongTextFormatting: `Plain Text`
- `Related Homecares` · List · read-only
  - formula: `REF_ROWS("Homecare", "Dog_ID")`
- `Dynamic Card Subtitles` · Text · read-only
  - formula: `=SWITCH( [Status], "Bed Rest", CONCATENATE( "Ds Out: ", TEXT(HOUR(TODAY() - DATE([Bed Rest Start])) / 24), " | Ds Due: ", IF(ISBLANK([Bed Rest Due Back]), "N/A", TEXT(HOUR(DATE([Bed Rest Due Back]) - TODAY()) / 24)), " | 🗓️Start: ", TEXT([Bed Rest Start], "dd/mm/yyyy"), " | 🗓️Due: ", IF(ISBLANK([Bed Rest Due Back]), "N/A", TEXT([Bed Rest Due Back], "dd/mm/yyyy")), " | Notes: ", [Medical Notes] ), "Fostered", CONCATENATE( "With: ", [Latest Homecare Event].[Carer], " | Ds Out: ", TEXT(HOUR(TODAY() - DATE([Latest Homecare Event].[Homecare Start])) / 24), " | Ds Due: ", IF(ISBLANK([Latest Homecare Event].[Homecare Due Back]), "N/A", TEXT(HOUR(DATE([Latest Homecare Event].[Homecare Due Back]) - TODAY()) / 24)), " | 🗓️Start: ", TEXT([Latest Homecare Event].[Homecare Start], "dd/mm/yyyy"), " | 🗓️Due: ", IF(ISBLANK([Latest Homecare Event].[Homecare Due Back]), "N/A", TEXT([Latest Homecare Event].[Homecare Due Back], "dd/mm/yyyy")) ), "Walking", CONCATENATE("With: ", [Latest Walk Event].[Volunteer_ID].[Volunteer Name], " | 🗓️Started: ", TEXT([Latest Walk Event].[Check Out], "dd/mm/yyyy hh:mm")), "Jail Break", CONCATENATE( "With: ", [Latest Homecare Event].[Volunteer_ID].[Volunteer Name], " | Ds Out: ", TEXT(HOUR(TODAY() - DATE([Latest Homecare Event].[Homecare Start])) / 24), " | Ds Due: ", IF(ISBLANK([Latest Homecare Event].[Homecare Due Back]), "N/A", TEXT(HOUR(DATE([Latest Homecare Event].[Homecare Due Back]) - TODAY()) / 24)), " | 🗓️Start: ", TEXT([Latest Homecare Event].[Homecare Start], "dd/mm/yyyy"), " | 🗓️Due: ", IF(ISBLANK([Latest Homecare Event].[Homecare Due Back]), "N/A", TEXT([Latest Homecare Event].[Homecare Due Back], "dd/mm/yyyy")) ), "Available", CONCATENATE("LastWalk: ", [Days_Since_last_Walk], " | 4WkMins: ", [Walk_Time_Past_Month]), CONCATENATE("Status: ", [Status]) )`
  - LongTextFormatting: `Plain Text`
- `Latest Homecare Event` · Ref · read-only
  - formula: `=MAXROW("Homecare", "Homecare Start", ([Dog_ID] = [_THISROW].[Dog_ID]))`
  - ReferencedTableName: `Homecare`
  - ReferencedType: `Text`
- `Latest Walk Event` · Ref · read-only
  - formula: `=MAXROW("Walks", "Check Out", ([Dog_ID] = [_THISROW].[Dog_ID]))`
  - ReferencedTableName: `Walks`
  - ReferencedType: `Text`
- `Dog_Picker_Label` · Text · read-only
  - formula: `=CONCATENATE( [Dog Name], " | Days since walk: ", IF([Sort_Days_Since_Last_walk] >= 999, "Never walked", TEXT([Sort_Days_Since_Last_walk])), " | 4wk mins: ", [Walk_Time_Past_Month] )`
  - LongTextFormatting: `Plain Text`

### _Per User Settings
- Source Path: _Per User Settings
- Data Source: native
- Are updates allowed?: UPDATES_ONLY
- Visible?: NEVER
- Shared?: No
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (15):**

- `_RowNumber` · Number · read-only · hidden
- `_EMAIL` · Email · hidden
  - formula: `USEREMAIL()`
- `_NAME` · Name · hidden
  - formula: `USERNAME()`
  - LongTextFormatting: `Plain Text`
- `_LOCATION` · LatLong · hidden
- `Options Heading` · Show · read-only · hidden
- `Option 1` · Text · hidden
  - LongTextFormatting: `Plain Text`
- `Option 2` · Number · hidden
- `Country Option` · Enum · hidden
  - EnumValues: `["Australia", "Brazil", "Canada"]`
- `Language Option` · Enum · hidden
  - EnumValues: `["English", "French", "Tamil"]`
- `Option 5` · Text · hidden
  - LongTextFormatting: `Plain Text`
- `Option 6` · Number · hidden
- `Option 7` · Text · hidden
  - LongTextFormatting: `Plain Text`
- `Option 8` · Text · hidden
  - LongTextFormatting: `Plain Text`
- `Option 9` · Text · hidden
  - LongTextFormatting: `Plain Text`
- `_THISUSER` · Text · hidden
  - initial: `onlyvalue`
  - LongTextFormatting: `Plain Text`

### Volunteers
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Volunteers
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (30):**

- `_RowNumber` · Number · read-only · hidden
- `Volunteer_ID` · Text
  - initial: `="V" & RIGHT("00" & (COUNT(SELECT(Volunteers[Volunteer_ID], LEFT([Volunteer_ID], 1) = "V")) + 1), 2)`
  - LongTextFormatting: `Plain Text`
- `Volunteer Name` · Name · **LABEL** · read-only
  - LongTextFormatting: `Plain Text`
- `First Name` · Name
  - LongTextFormatting: `Plain Text`
- `Surname` · Text
  - LongTextFormatting: `Plain Text`
- `Start Date` · Date
  - initial: `TODAY()`
- `End Date` · Date
  - initial: `=IF([Status] = "Exited", TODAY(), "")`
  - Show_If: `=[Status] = "Exited"`
  - Reset_If: `=[Status] <> [_THISROW_BEFORE].[Status]`
- `Status` · Enum
  - EnumValues: `["Active", "Exited"]`
- `Notes` · LongText
  - Show_If: `=[Status] = "Exited"`
  - LongTextFormatting: `Plain Text`
- `Total Days with CAPS` · Number
  - formula: `=IF([Status] = "Exited", HOUR(DATE([End Date]) - DATE([Start Date])) / 24, HOUR(TODAY() - DATE([Start Date])) / 24 )`
- `Homecare Approved` · Enum
  - EnumValues: `["H - Homecare Approved"]`
- `experience` · LongText
  - LongTextFormatting: `Plain Text`
- `ec_name` · Name
  - LongTextFormatting: `Plain Text`
- `ec_phone` · Text
  - LongTextFormatting: `Plain Text`
- `ec_email` · Text
  - LongTextFormatting: `Plain Text`
- `ec_relationship` · Text
  - LongTextFormatting: `Plain Text`
- `medical_issues` · Text
  - LongTextFormatting: `Plain Text`
- `under_18` · Yes/No
- `jailbreak_approved` · Text
  - LongTextFormatting: `Plain Text`
- `foster_approved` · Text
  - LongTextFormatting: `Plain Text`
- `Email` · Email
- `Folder_id` · Text
  - LongTextFormatting: `Plain Text`
- `Related Walks` · List · read-only
  - formula: `REF_ROWS("Walks", "Volunteer_ID")`
- `Total_Minutes_Last_28 Days` · Number · read-only
  - formula: `=SUM( SELECT( Walks[Walk_Length_Minutes], AND( [Volunteer_ID] = [_THISROW].[Volunteer_ID], [Check Out] >= (TODAY() - 28) ) ) )`
- `Full Volunteer Detail` · Text · read-only
  - formula: `=CONCATENATE( [First Name], " ", [Surname], IF(AND([jailbreak_approved] = "J", [foster_approved] = "F"), " | J | F |", IF([jailbreak_approved] = "J", " | J |", IF([foster_approved] = "F", " | F |", " |") ) ), " 4weekmins: ", TEXT([Total_Minutes_Last_28 Days]), "m" )`
  - LongTextFormatting: `Plain Text`
- `Full Volunteer Name` · Text · read-only
  - formula: `=CONCATENATE([First Name], " ", [Surname] , IF([Homecare Approved] = "H - Homecare Approved", " [H]", ""))`
  - LongTextFormatting: `Plain Text`
- `Time with CAPS` · Text · read-only
  - formula: `=CONCATENATE( IF([Total Days with CAPS (Live)] >= 365, CONCATENATE(FLOOR([Total Days with CAPS (Live)] / 365), " Years, "), ""), IF(MOD([Total Days with CAPS (Live)], 365) >= 30, CONCATENATE(FLOOR(MOD([Total Days with CAPS (Live)], 365) / 30), " Months, "), ""), CONCATENATE(ROUND(MOD(MOD([Total Days with CAPS (Live)], 365), 30)), " Days") )`
  - LongTextFormatting: `Plain Text`
- `Related Homecares` · List · read-only
  - formula: `REF_ROWS("Homecare", "Volunteer_ID")`
- `Total Days with CAPS (Live)` · Number · read-only
  - formula: `=IF([Status] = "Exited", HOUR(DATE([End Date]) - DATE([Start Date])) / 24, HOUR(TODAY() - DATE([Start Date])) / 24 )`
- `Related Site_Visits` · List · read-only
  - formula: `REF_ROWS("Site_Visits", "Volunteer_ID")`

### Walks
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Walks
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (13):**

- `_RowNumber` · Number · read-only · hidden
- `Walk_ID` · Text · hidden
  - initial: `UNIQUEID()`
  - Valid_If: `=Active Volunteers[Volunteer_ID]`
  - LongTextFormatting: `Plain Text`
- `Dog_ID` · Ref · hidden
  - formula: `=LOOKUP( LEFT([Dog_Picker], FIND(" | ", [Dog_Picker]) - 1), "Dogs", "Dog Name", "Dog_ID" )`
  - Valid_If: `=ORDERBY(  SELECT(Dogs[Dog_ID], OR(AND([Status]="Available", ISBLANK([Exit Type])), [Dog_ID]=[_THISROW].[Dog_ID])),  [Latest Walk Event].[Check Out],  TRUE )`
  - Required_If: `=ISNOTBLANK([_THIS])`
  - ReferencedTableName: `Dogs`
  - ReferencedType: `Text`
- `Volunteer_ID` · Ref · **LABEL**
  - Valid_If: `=SELECT(Active Volunteers[Volunteer_ID], TRUE)`
  - Required_If: `=ISNOTBLANK([_THIS])`
  - ReferencedTableName: `Volunteers`
  - ReferencedType: `Text`
- `Check Out` · DateTime
  - initial: `=IF( [Is_Manual_Entry] = TRUE, NOW(), NOW() )`
  - Show_If: `=OR(  ISNOTBLANK([Walk_ID]),  [_THISROW].[Is_Manual_Entry] = TRUE )`
- `Check In` · DateTime
  - Show_If: `=AND(  ISNOTBLANK([Walk_ID]),  ISNOTBLANK([Check Out]) )`
- `Is_Manual_Entry` · Yes/No
  - initial: `=FALSE`
- `Dog_Picker` · Enum
  - Valid_If: `=SELECT(  Dogs[Dog_Picker_Label],  AND([Status]="Available", ISBLANK([Exit Type])) ) + LIST([_THISROW].[Dog_Picker])`
  - EnumValues: `[]`
- `Walk_Length_Minutes` · Number · read-only
  - formula: `=IF( ISBLANK([Check In]), 0, HOUR([Check In] - [Check Out]) * 60 + MINUTE([Check In] - [Check Out]) )`
  - Show_If: `=IF(  CONTEXT("ViewType") = "Form",  ISNOTBLANK([Check In]),  TRUE )`
- `Related Dogs` · List · read-only
  - formula: `REF_ROWS("Dogs", "Latest Walk Event")`
- `Dog Status Card` · Text · read-only
  - formula: `=[Dog_ID].[Dynamic Card Subtitles]`
  - LongTextFormatting: `Plain Text`
- `Test_Order` · List · read-only
  - formula: `=ORDERBY( SELECT(Dogs[Dog_ID], OR(AND([Status]="Available", ISBLANK([Exit Type])), [Dog_ID]=[_THISROW].[Dog_ID])), [Dog_ID], TRUE )`
- `Walking dog's name` · Name · read-only
  - formula: `=[Dog_ID].[Dog Name]`
  - LongTextFormatting: `Plain Text`

### Homecare
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Homecare
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (13):**

- `_RowNumber` · Number · read-only · hidden
- `Homecare_ID` · Text · **LABEL**
  - initial: `=CONCATENATE("HC", UNIQUEID())`
  - LongTextFormatting: `Plain Text`
- `Dog_ID` · Ref
  - formula: `=LOOKUP([Homecare_Dog_Picker], "Dogs", "Dog Name", "Dog_ID")`
  - ReferencedTableName: `Dogs`
  - ReferencedType: `Text`
- `Volunteer_ID` · Ref
  - Valid_If: `=SELECT(Volunteers[Volunteer_ID],  IF([_THISROW].[Homecare Type] = "Jail Break",  [jailbreak_approved] = "J",  IF([_THISROW].[Homecare Type] = "Fostered",  [foster_approved] = "F",  FALSE  )  ) )`
  - Show_If: `=ISNOTBLANK([Volunteer_ID])`
  - ReferencedTableName: `Volunteers`
  - ReferencedType: `Text`
- `Homecare Type` · Enum
  - EnumValues: `["Jail Break", "Fostered"]`
- `Homecare Start` · DateTime
  - initial: `=NOW()`
- `Homecare End` · DateTime
- `Homecare Due Back` · Date
- `Homecare_Dog_Picker` · Enum
  - Valid_If: `=SELECT(Dogs[Dog Name], [Status]="Available") + LIST([_THISROW].[Homecare_Dog_Picker])`
  - EnumValues: `[]`
- `homecarer_id` · Ref
  - Valid_If: `=FILTER("Homecarers", AND([status]="Active", OR([jailbreak_approved]="J", [foster_approved]="F")))`
  - ReferencedTableName: `Homecarers`
  - ReferencedType: `Text`
- `Related Dogs` · List · read-only
  - formula: `REF_ROWS("Dogs", "Latest Homecare Event")`
- `Homecare_Stats_Label` · Text · read-only
  - formula: `=CONCATENATE( "Ds Out:", TEXT(HOUR(TODAY() - DATE([Homecare Start])) / 24), " | Ds Due:", TEXT(HOUR(DATE([Homecare Due Back]) - TODAY()) / 24), " | Start:", TEXT(DATE([Homecare Start])), " | Due:", TEXT(DATE([Homecare Due Back])) )`
  - LongTextFormatting: `Plain Text`
- `Carer` · Text · read-only
  - formula: `=IFS( ISNOTBLANK([homecarer_id]), CONCATENATE([homecarer_id].[first_name], " ", [homecarer_id].[surname]), ISNOTBLANK([Volunteer_ID]), [Volunteer_ID].[Volunteer Name] )`
  - LongTextFormatting: `Plain Text`

### Site_Visits
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Site_Visits
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (13):**

- `_RowNumber` · Number · read-only · hidden
- `Visit_ID` · Text
  - initial: `=CONCATENATE("SV", RIGHT(UNIQUEID(), 6))`
  - LongTextFormatting: `Plain Text`
- `Visitor_Type` · Enum
  - EnumValues: `["Registered", "Guest"]`
- `Volunteer_ID` · Ref
  - Valid_If: `=SELECT(Volunteers[Volunteer_ID], [Status]="Active")`
  - Show_If: `=[Visitor_Type]="Registered"`
  - ReferencedTableName: `Volunteers`
  - ReferencedType: `Text`
- `Guest_Name` · Name · **LABEL**
  - Show_If: `=[Visitor_Type]="Guest"`
  - LongTextFormatting: `Plain Text`
- `Guest_Phone` · Phone
  - Show_If: `=[Visitor_Type]="Guest"`
- `Reason` · Enum
  - EnumValues: `["Employment", "Walking", "Outside contractor", "Committee Matters", "Food dropoff", "Feeding and Cleaning", "Jailbreak pickup / dropoff", "Site maintenance", "Foster pickup / dropoff", "Adoption related visit", "Transport pickup / dropoff", "Other"]`
- `Reason_Other` · Text
  - LongTextFormatting: `Plain Text`
- `Check_In` · DateTime
  - initial: `=NOW()`
- `Check_Out` · DateTime
- `Site Status` · Text · read-only
  - formula: `=IF(ISBLANK([Check_Out]), "Currently In", "Signed Out")`
  - LongTextFormatting: `Plain Text`
- `Display Name` · Name · read-only
  - formula: `=IF([Visitor_Type]="Registered", [Volunteer_ID].[Volunteer Name], [Guest_Name])`
  - LongTextFormatting: `Plain Text`
- `Site visit label` · Text · read-only
  - formula: `=CONCATENATE([Reason], " · ", TEXT([Check_In], "h:mm AM/PM"))`
  - LongTextFormatting: `Plain Text`

### Homecarers
- Source Path: CAPS_walking_log_MASTER
- Worksheet Name/Qualifier: Homecarers
- Data Source: google
- Are updates allowed?: ALL_CHANGES
- Visible?: ALWAYS
- Shared?: Yes
- Data locale: en-GB
- Column Order List: _RowNumber

**Columns (36):**

- `_RowNumber` · Number · read-only · hidden
- `homecarer_id` · Text
  - initial: `UNIQUEID()`
  - LongTextFormatting: `Plain Text`
- `first_name` · Text · **LABEL**
  - LongTextFormatting: `Plain Text`
- `surname` · Text
  - LongTextFormatting: `Plain Text`
- `nickname` · Text
  - LongTextFormatting: `Plain Text`
- `email` · Email
- `phone` · Phone
- `status` · Enum
  - EnumValues: `["Pending", "Active", "Exited", "Declined"]`
- `start_date` · Date
  - initial: `TODAY()`
- `end_date` · Date
  - initial: `TODAY()`
- `jailbreak_approved` · Text
  - LongTextFormatting: `Plain Text`
- `foster_approved` · Text
  - LongTextFormatting: `Plain Text`
- `applied_date` · Date
  - initial: `TODAY()`
- `over_18` · Yes/No
- `address` · Address
- `property_ownership` · Text
  - LongTextFormatting: `Plain Text`
- `fence_type` · Text
  - LongTextFormatting: `Plain Text`
- `fence_height` · Text
  - LongTextFormatting: `Plain Text`
- `people_at_home` · Number
- `children_u16` · Number
- `other_animals` · Text
  - LongTextFormatting: `Plain Text`
- `animal_details` · Text
  - LongTextFormatting: `Plain Text`
- `vaccines` · Text
  - LongTextFormatting: `Plain Text`
- `experience` · Text
  - LongTextFormatting: `Plain Text`
- `jb_day` · Text
  - LongTextFormatting: `Plain Text`
- `jb_weekend` · Text
  - LongTextFormatting: `Plain Text`
- `jb_shift` · Text
  - LongTextFormatting: `Plain Text`
- `jb_school` · Text
  - LongTextFormatting: `Plain Text`
- `foster_short` · Text
  - LongTextFormatting: `Plain Text`
- `foster_long` · Text
  - LongTextFormatting: `Plain Text`
- `folder_id` · Text
  - LongTextFormatting: `Plain Text`
- `notes` · LongText
  - LongTextFormatting: `Plain Text`
- `agree_terms` · Text
  - LongTextFormatting: `Plain Text`
- `signature_name` · Text
  - LongTextFormatting: `Plain Text`
- `signature_date` · Date
  - initial: `TODAY()`
- `Related Homecares` · List · read-only
  - formula: `REF_ROWS("Homecare", "homecarer_id")`

## Slices

### Active Walks
- Source Table: Walks
- Row filter condition: `=ISBLANK([Check In])`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Walk_ID
Dog_ID
Volunteer_ID
Check Out
Check In
Walk_Length_Minutes
Related Dogs
Dog_Picker
Walking dog's name

### Active Dogs
- Source Table: Dogs
- Row filter condition: `=[Status] <> "Exited"`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Dog_ID
Level
Status
Arrival Date
Arrival Type
Arrival Notes
Exit Date
Exit Type
Exit Notes
Related Walks
Dog_Label_Display
Days_Since_last_Walk
Sort_Days_Since_Last_Walk
Walk_Time_Past_Month
Total Days with CAPS
Time with CAPS
Medical Notes
Bed Rest Start
Bed Rest End
Related Homecares
Last Homecare Start Date
Dog Name
Dynamic Card Subtitles
Latest Homecare Event
Latest Walk Event
Dog_P

### Archived Dogs
- Source Table: Dogs
- Row filter condition: `=ISNOTBLANK([Exit Type])`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Dog_ID
Dog Name
Level
Status
Arrival Date
Arrival Type
Arrival Notes
Exit Date
Exit Type
Exit Notes
Related Walks
Dog_Label_Display
Days_Since_last_Walk
Sort_Days_Since_Last_Walk
Walk_Time_Past_Month
Total Days with CAPS
Time with CAPS
Medical Notes
Related Homecares
Last Homecare Start Date
Last_Walk_DateTime
Bed Rest Due Back

### Active Volunteers
- Source Table: Volunteers
- Row filter condition: `ISBLANK([End Date])`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Volunteer_ID
Volunteer Name
Start Date
End Date
Related Walks
Total_Minutes_Last_28 Days
First Name
Surname
Full Volunteer Detail
Status
Notes
Full Volunteer Name
Total Days with CAPS
Time with CAPS
Homecare Approved
Related Homecares
experience
ec_name
ec_phone
ec_email
ec_relationship
medical_issues
under_18
jailbreak_approved
foster_approved
Total Days with CAPS (Live)
Related Site_V

### Archived Volunteers
- Source Table: Volunteers
- Row filter condition: `ISNOTBLANK([End Date])`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Volunteer_ID
Volunteer Name
First Name
Surname
Start Date
End Date
Status
Notes
Related Walks
Total_Minutes_Last_28 Days
Full Volunteer Detail
Full Volunteer Name
Total Days with CAPS
Time with CAPS
Homecare Approved
Related Homecares
experience
ec_name
ec_phone
ec_email
ec_relationship
medical_issues
under_18
jailbreak_approved
foster_approved
Total Days with CAPS (Live)
Related Site_V

### Dogs on Homecare
- Source Table: Dogs
- Row filter condition: `=OR([Status] = "Fostered", [Status] = "Jail Break")`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Dog_ID
Dog Name
Level
Status
Arrival Date
Arrival Type
Arrival Notes
Exit Date
Exit Type
Exit Notes
Total Days with CAPS
Medical Notes
Bed Rest Start
Bed Rest End
Last Homecare Start Date
Related Walks
Dog_Label_Display
Days_Since_last_Walk
Sort_Days_Since_Last_Walk
Walk_Time_Past_Month
Time with CAPS
Related Homecares
Dynamic Card Subtitles
Latest Homecare Event
Latest Walk Event
Dog_P

### Dogs on Bedrest
- Source Table: Dogs
- Row filter condition: `=[Status] = "Bed Rest"`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Dog_ID
Dog Name
Level
Status
Arrival Date
Arrival Type
Arrival Notes
Exit Date
Exit Type
Exit Notes
Total Days with CAPS
Medical Notes
Bed Rest Start
Bed Rest End
Last Homecare Start Date
Related Walks
Dog_Label_Display
Days_Since_last_Walk
Sort_Days_Since_Last_Walk
Walk_Time_Past_Month
Time with CAPS
Related Homecares
Dynamic Card Subtitles
Latest Homecare Event
Latest Walk Event
Dog_P

### Active Homecare
- Source Table: Homecare
- Row filter condition: `=ISBLANK([Homecare End])`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Homecare_ID
Dog_ID
Volunteer_ID
Homecare Type
Homecare Start
Homecare End
Related Dogs
Homecare Due Back
Homecare_Dog_Picker
Homecare_Stats_Label
homecarer_id
Carer

### Available Dogs
- Source Table: Dogs
- Row filter condition: `=AND([Status] = "Available", ISBLANK([Exit Type]))`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Dog_ID
Dog Name
Level
Status
Arrival Date
Arrival Type
Arrival Notes
Exit Date
Exit Type
Exit Notes
Total Days with CAPS
Medical Notes
Bed Rest Start
Bed Rest End
Last Homecare Start Date
Related Walks
Dog_Label_Display
Days_Since_last_Walk
Sort_Days_Since_Last_Walk
Walk_Time_Past_Month
Time with CAPS
Related Homecares
Dynamic Card Subtitles
Latest Homecare Event
Latest Walk Event
Dog_P

### Todays_Visits
- Source Table: Site_Visits
- Row filter condition: `=[Check_In] >= TODAY()`
- Update mode: ALL_CHANGES
- Slice Columns: _RowNumber
Visit_ID
Visitor_Type
Volunteer_ID
Guest_Name
Guest_Phone
Reason
Reason_Other
Check_In
Check_Out
Site Status
Display Name
Site visit label

## Views

### Start Walk  (form)
- position: center
- Show if: =TRUE
- ColumnOrder: `["Volunteer_ID", "Dog_ID", "Dog_Picker", "Is_Manual_Entry", "Check Out", "Check In", "Walk_Length_Minutes"]`
- FinishView: `"Dogs"`
- Icon: `"far fa-arrow-alt-square-right"`

### End Walk  (deck)
- position: center
- SortBy: `[{"Column": "Walking dog's name", "Order": "Ascending"}, {"Column": "Check Out", "Order": "Ascending"}]`
- GroupBy: `[{"Column": "Volunteer_ID", "Order": "Ascending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"fas fa-arrow-alt-square-left"`

### Volunteers  (deck)
- position: left
- SortBy: `[{"Column": "Total_Minutes_Last_28 Days", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"far fa-male"`

### Dogs  (deck)
- position: left most
- SortBy: `[{"Column": "Sort_Days_Since_Last_Walk", "Order": "Descending"}]`
- GroupBy: `[{"Column": "Status", "Order": "Ascending"}]`
- GroupAggregate: `"COUNT"`
- Icon: `"far fa-dog"`

### Start Homecare  (form)
- position: right
- ColumnOrder: `["Homecare Type", "homecarer_id", "Homecare_Dog_Picker", "Homecare Start", "Homecare Due Back"]`
- FinishView: `"**Automatic**"`
- Icon: `"far fa-home"`

### End Homecare  (deck)
- position: right most
- SortBy: `[{"Column": "Homecare Start", "Order": "Ascending"}]`
- GroupBy: `[{"Column": "Carer", "Order": "Ascending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"fas fa-home-lg-alt"`

### Add a new Dog  (form)
- position: menu
- ColumnOrder: `["Dog Name", "Arrival Date", "Arrival Type", "Arrival Notes"]`
- FinishView: `"Dogs"`
- Icon: `"far fa-plus-circle"`

### Site Visitors Today  (table)
- position: menu
- SortBy: `[{"Column": "Check_In", "Order": "Ascending"}]`
- GroupBy: `[{"Column": "Site Status", "Order": "Ascending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Visit_ID", "Display Name", "Visitor_Type", "Reason", "Check_In", "Check_Out"]`
- Icon: `"fas fa-file-signature"`

### Start Bedrest  (deck)
- position: menu
- GroupAggregate: `"NONE"`
- Icon: `"far fa-bed"`

### End Bedrest  (deck)
- position: menu
- GroupAggregate: `"NONE"`
- Icon: `"fas fa-bed"`

### Volunteer Exit  (deck)
- position: menu
- SortBy: `[{"Column": "Volunteer Name", "Order": "Ascending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"fas fa-door-open"`

### Dog Exit  (deck)
- position: menu
- GroupAggregate: `"NONE"`
- Icon: `"fal fa-door-open"`

### Walks Log  (table)
- position: menu
- SortBy: `[{"Column": "Check Out", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Volunteer_ID", "Dog_ID", "Walking dog's name", "Walk_Length_Minutes", "Check Out", "Check In", "Is_Manual_Entry"]`
- Icon: `"fal fa-walking"`

### Homecare Log  (table)
- position: menu
- SortBy: `[{"Column": "Homecare_ID", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Homecare_ID", "Homecare_Dog_Picker", "Volunteer_ID", "Homecare Type", "Homecare Start", "Homecare Due Back", "Homecare End"]`
- Icon: `"fal fa-home-heart"`

### Site Visit Log  (table)
- position: menu
- SortBy: `[{"Column": "Check_In", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Check_In", "Display Name", "Visitor_Type", "Reason", "Reason_Other", "Check_Out"]`
- Icon: `"far fa-file-signature"`

### Archived Dogs  (table)
- position: menu
- SortBy: `[{"Column": "Exit Date", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Dog Name", "Exit Date", "Exit Type", "Exit Notes", "Status", "Dog_ID", "Arrival Date", "Arrival Type", "Arrival Notes"]`
- Icon: `"fal fa-hand-heart"`

### Archived Volunteers  (deck)
- position: menu
- SortBy: `[{"Column": "End Date", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"fal fa-hand-heart"`

### Site Visit Sign In  (form)
- position: menu
- ColumnOrder: `["Visitor_Type", "Volunteer_ID", "Guest_Name", "Guest_Phone", "Reason", "Reason_Other"]`
- FinishView: `"**Automatic**"`
- Icon: `"fal fa-file-signature"`

### Active Homecare_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Active Homecare_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Active Volunteers_Detail  (detail)
- position: ref
- ColumnOrder: `["Full Volunteer Detail", "Volunteer Name", "Volunteer_ID", "Status", "under_18", "experience", "Time with CAPS", "Notes", "End Date", "Related Walks", "Related Homecares", "ec_name", "ec_phone", "ec_email", "ec_relationship", "medical_issues"]`
- Icon: `"fa-indent"`

### Active Volunteers_Form  (form)
- position: ref
- ColumnOrder: `["Volunteer_ID", "Volunteer Name", "First Name", "Surname", "Status", "Homecare Approved", "Notes", "Start Date", "End Date"]`
- FinishView: `"Volunteers"`
- Icon: `"fa-edit"`

### Active Walks_Detail  (detail)
- position: ref
- ColumnOrder: `["Volunteer_ID", "Check Out", "Check In", "Walk_Length_Minutes", "Related Dogs", "Dog_Picker", "**all other columns**"]`
- Icon: `"fa-indent"`

### Active Walks_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Archived Dogs_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Archived Dogs_Form  (form)
- position: ref
- FinishView: `"Dogs"`
- Icon: `"fa-edit"`

### Archived Volunteers_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Archived Volunteers_Form  (form)
- position: ref
- FinishView: `"Volunteers"`
- Icon: `"fa-edit"`

### Available Dogs_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Available Dogs_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Dogs Exit Type is blank_Detail  (detail)
- position: ref
- ColumnOrder: `["Dog_Label_Display", "Dog_ID", "Level", "Status", "Medical Notes", "Related Walks", "Arrival Date", "Arrival Type", "Arrival Notes", "Exit Date", "Exit Type", "Exit Notes", "Days_Since_last_Walk", "Sort_Days_Since_Last_Walk", "Walk_Time_Past_Month", "Total Days with CAPS", "Time with CAPS", "Bed Re`
- Icon: `"fa-indent"`

### Dogs Exit Type is blank_Form  (form)
- position: ref
- ColumnOrder: `["Dog_ID", "Dog_Label_Display", "Dog Name", "Level", "Status", "Medical Notes", "Bed Rest Start", "Bed Rest End", "Exit Date", "Exit Type", "Exit Notes", "Arrival Date", "Arrival Type", "Arrival Notes"]`
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Dogs on Bedrest_Detail  (detail)
- position: ref
- ColumnOrder: `["Dog_Label_Display", "Dog_ID", "Dog Name", "Level", "Status", "Arrival Date", "Arrival Type", "Arrival Notes", "Exit Date", "Exit Type", "Exit Notes", "Total Days with CAPS", "Medical Notes", "Bed Rest Start", "Bed Rest End", "Last Homecare Start Date", "Related Walks", "Days_Since_last_Walk", "Sor`
- Icon: `"fa-indent"`

### Dogs on Bedrest_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Dogs on Homecare_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Dogs on Homecare_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Dogs_Detail  (detail)
- position: ref
- SortBy: `[{"Column": "Sort_Days_Since_Last_Walk", "Order": "Descending"}]`
- ColumnOrder: `["Dog Name", "Dog_ID", "Time with CAPS", "Arrival Date", "Arrival Type", "Arrival Notes", "Exit Date", "Exit Type", "Exit Notes", "Related Walks", "Days_Since_last_Walk", "Walk_Time_Past_Month", "Last_Walk_DateTime"]`
- Icon: `"fa-indent"`

### Dogs_Form  (form)
- position: ref
- ColumnOrder: `["Dog_ID", "Dog Name", "Level", "Status", "Arrival Date", "Arrival Type", "Arrival Notes", "Exit Date", "Exit Type", "Exit Notes", "Total Days with CAPS", "Medical Notes", "Bed Rest Start", "Bed Rest End", "Last Homecare Start Date", "Last_Walk_DateTime", "Bed Rest Due Back", "Dog_Label_Display", "D`
- FinishView: `"Dogs"`
- Icon: `"fa-edit"`

### Dogs_Inline  (table)
- position: ref
- GroupAggregate: `"NONE"`
- Icon: `"fa-table"`

### Exit CAPS Form  (form)
- position: ref
- ColumnOrder: `["Dog Name", "Exit Date", "Exit Type", "Exit Notes"]`
- FinishView: `"Dogs"`
- Icon: `"fal fa-door-open"`

### Homecare_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Homecare_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Homecare_Inline  (table)
- position: ref
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Homecare_ID", "Homecare_Dog_Picker", "Dog_ID", "Volunteer_ID", "Homecare Type", "Homecare Start", "Homecare End", "**all other columns**", "Homecare Due Back"]`
- Icon: `"fa-table"`

### Homecarers_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Homecarers_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Site_Visits_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Site_Visits_Form  (form)
- position: ref
- ColumnOrder: `["Volunteer_ID", "Volunteer Name", "First Name", "Surname", "Start Date", "End Date", "Status", "Notes", "Total Days with CAPS", "Homecare Approved", "experience", "ec_name", "ec_phone", "ec_email", "ec_relationship", "medical_issues", "under_18", "jailbreak_approved", "foster_approved", "Total_Minu`
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Site_Visits_Inline  (table)
- position: ref
- GroupAggregate: `"NONE"`
- Icon: `"fa-table"`

### Start Bedrest Form  (form)
- position: ref
- ColumnOrder: `["Dog Name", "Bed Rest Start", "Medical Notes", "Bed Rest Due Back"]`
- FinishView: `"Dogs"`
- Icon: `"fal fa-bed"`

### Todays_Visits_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Todays_Visits_Form  (form)
- position: ref
- ColumnOrder: `["Visitor_Type", "Volunteer_ID", "Guest_Name", "Guest_Phone", "Reason", "Reason_Other", "Check_In"]`
- FinishView: `"Site Visitors Today"`
- Icon: `"fa-edit"`

### Volunteer Activity  (table)
- position: ref
- SortBy: `[{"Column": "Total_Minutes_Last_28 Days", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- ColumnOrder: `["Volunteer Name", "Total_Minutes_Last_28 Days"]`
- Icon: `"far fa-star"`

### Volunteer Exit Form  (form)
- position: ref
- ColumnOrder: `["Volunteer Name", "Status", "End Date", "Notes"]`
- FinishView: `"Volunteers"`
- Icon: `"fas fa-door-open"`

### Volunteers_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Volunteers_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Walks_Detail  (detail)
- position: ref
- Icon: `"fa-indent"`

### Walks_Form  (form)
- position: ref
- FinishView: `"**Automatic**"`
- Icon: `"fa-edit"`

### Walks_Inline  (table)
- position: ref
- SortBy: `[{"Column": "Check Out", "Order": "Descending"}]`
- GroupAggregate: `"NONE"`
- Icon: `"fa-table"`

## Actions

### Delete  [Dogs]
- do: DELETE_RECORD

### Edit  [Dogs]
- do: EDIT_RECORD

### Add  [Dogs]
- do: ADD_RECORD

### Delete  [Volunteers]
- do: DELETE_RECORD

### Edit  [Volunteers]
- do: EDIT_RECORD
- prominence: Display_Overlay

### Delete  [Walks]
- do: DELETE_RECORD

### Edit  [Walks]
- do: EDIT_RECORD
- prominence: Display_Overlay

### Add  [Volunteers]
- do: ADD_RECORD

### Add  [Walks]
- do: ADD_RECORD

### View Ref (Dog_ID)  [Walks]
- do: NAVIGATE_APP
- attach to column: Dog_ID
- condition: `NOT(ISBLANK([Dog_ID]))`
- navigate: `CONCATENATE("#page=detail&table=Dogs&row=", ENCODEURL([Dog_ID]) )`

### View Ref (Volunteer_ID)  [Walks]
- do: NAVIGATE_APP
- attach to column: Volunteer_ID
- condition: `NOT(ISBLANK([Volunteer_ID]))`
- navigate: `CONCATENATE("#page=detail&table=Volunteers&row=", ENCODEURL([Volunteer_ID]) )`

### Set Dog Status To Walking  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- condition: `true`
- sets `Status` = `=Walking`

### Run Status Change Action - 1  [Walks]
- do: REF_ACTION
- prominence: Display_Prominently
- condition: `true`
- runs action: `Set Dog Status To Walking` on rows: `=FILTER("Dogs", ([Dog_ID] = [_THISROW].[Dog_ID]))`

### Record Check In Time  [Walks]
- do: COMPOSITE
- attach to column: Dog_ID
- prominence: Display_Inline
- condition: `=ISBLANK([Check In])`
- sets `None` = `=NOW()`

### Set Dog Status To Available  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- condition: `true`
- sets `Status` = `=Available`

### Run Status Update to Available Action - 1  [Walks]
- do: REF_ACTION
- prominence: Display_Prominently
- condition: `true`
- runs action: `Set Dog Status To Available` on rows: `=FILTER("Dogs", ([Dog_ID] = [_THISROW].[Dog_ID]))`

### Set Walk Check In Time  [Walks]
- do: SET_COLUMN_VALUE
- attach to column: Check In
- condition: `=ISBLANK([Check In])`
- sets `Check In` = `=NOW()`

### Open Vol Exit Form Action  [Volunteers]
- do: NAVIGATE_APP
- attach to column: Status
- condition: `true`
- navigate: `=LINKTOROW([Volunteer_ID], "Volunteer Exit Form")`

### Delete  [Homecare]
- do: DELETE_RECORD
- prominence: Display_Prominently

### Edit  [Homecare]
- do: EDIT_RECORD
- prominence: Display_Overlay

### Add  [Homecare]
- do: ADD_RECORD

### View Ref (Dog_ID)  [Homecare]
- do: NAVIGATE_APP
- attach to column: Dog_ID
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Dog_ID]))`
- navigate: `CONCATENATE("#page=detail&table=Dogs&row=", ENCODEURL([Dog_ID]) )`

### View Ref (Volunteer_ID)  [Homecare]
- do: NAVIGATE_APP
- attach to column: Volunteer_ID
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Volunteer_ID]))`
- navigate: `CONCATENATE("#page=detail&table=Volunteers&row=", ENCODEURL([Volunteer_ID]) )`

### Start Homecare  [Dogs]
- do: NAVIGATE_APP
- attach to column: Dog_ID
- prominence: Display_Prominently
- condition: `true`
- navigate: `=LINKTOFORM(  "Homecare_Form",  "Homecare_Dog_Picker", [Dog Name],  "Homecare Start", NOW() )`

### End Homecare Status Update  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- condition: `=TRUE`
- sets `Status` = `=Available`

### Update Dog Status on Checkout  [Homecare]
- do: REF_ACTION
- condition: `true`
- runs action: `Set Dog Homecare Status and Start Date` on rows: `=LIST([Dog_ID])`

### Set Dog Homecare Status and Start Date  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- prominence: Display_Overlay
- condition: `=TRUE`
- sets `Status` = `=ANY(  SELECT(  Homecare[Homecare Type],  AND(  [Dog_ID] = [_THISROW].[Dog_ID],  ISBLANK([Homecare End])  )  ) )`
- sets `Last Homecare Start Date` = `=TODAY()`

### Start Bedrest  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Dog Name
- prominence: Display_Inline
- condition: `true`
- sets `Status` = `="Bed Rest"`
- sets `Bed Rest Start` = `=TODAY()`

### End Bedrest  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- prominence: Display_Prominently
- condition: `true`
- sets `Status` = `="Available"`
- sets `Bed Rest End` = `=TODAY()`

### Dog Exit  [Dogs]
- do: SET_COLUMN_VALUE
- attach to column: Status
- prominence: Display_Prominently
- condition: `true`
- sets `Status` = `="Exited"`

### End Homecare  [Homecare]
- do: SET_COLUMN_VALUE
- attach to column: Homecare End
- prominence: Display_Inline
- condition: `true`
- sets `Homecare End` = `=NOW()`

### Open Bedrest Form  [Dogs]
- do: NAVIGATE_APP
- attach to column: Dog_ID
- condition: `true`
- navigate: `=LINKTOROW([Dog_ID], "Start Bedrest Form")`

### Open Dog Exit Form Action  [Dogs]
- do: NAVIGATE_APP
- attach to column: Dog_ID
- condition: `true`
- navigate: `=LINKTOROW([Dog_ID], "Exit CAPS Form")`

### View Ref (Latest Homecare Event)  [Dogs]
- do: NAVIGATE_APP
- attach to column: Latest Homecare Event
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Latest Homecare Event]))`
- navigate: `CONCATENATE("#page=detail&table=Homecare&row=", ENCODEURL([Latest Homecare Event]) )`

### View Ref (Latest Walk Event)  [Dogs]
- do: NAVIGATE_APP
- attach to column: Latest Walk Event
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Latest Walk Event]))`
- navigate: `CONCATENATE("#page=detail&table=Walks&row=", ENCODEURL([Latest Walk Event]) )`

### Run action on rows Action - 1  [Homecare]
- do: REF_ACTION
- prominence: Display_Prominently
- condition: `true`
- runs action: `Set Dog Homecare Status and Start Date` on rows: `=LIST([Dog_ID])`

### Delete  [Site_Visits]
- do: DELETE_RECORD
- prominence: Display_Prominently

### Edit  [Site_Visits]
- do: EDIT_RECORD
- prominence: Display_Overlay

### Call Phone (Guest_Phone)  [Site_Visits]
- do: CALL
- attach to column: Guest_Phone
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Guest_Phone]))`

### Send SMS (Guest_Phone)  [Site_Visits]
- do: SMS
- attach to column: Guest_Phone
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Guest_Phone]))`

### Add  [Site_Visits]
- do: ADD_RECORD
- prominence: Display_Overlay

### View Ref (Volunteer_ID)  [Site_Visits]
- do: NAVIGATE_APP
- attach to column: Volunteer_ID
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Volunteer_ID]))`
- navigate: `CONCATENATE("#page=detail&table=Volunteers&row=", ENCODEURL([Volunteer_ID]) )`

### End Site Visit  [Site_Visits]
- do: SET_COLUMN_VALUE
- attach to column: Visit_ID
- prominence: Display_Inline
- condition: `=ISBLANK([Check_Out])`
- sets `Check_Out` = `=NOW()`

### New step Action - 1  [Homecare]
- do: REF_ACTION
- prominence: Display_Prominently
- condition: `true`
- runs action: `End Homecare Status Update` on rows: `=LIST([Dog_ID])`

### Delete  [Homecarers]
- do: DELETE_RECORD
- prominence: Display_Prominently

### Edit  [Homecarers]
- do: EDIT_RECORD
- prominence: Display_Overlay

### Compose Email (email)  [Homecarers]
- do: EMAIL
- attach to column: email
- prominence: Display_Inline
- condition: `NOT(ISBLANK([email]))`

### View Map (address)  [Homecarers]
- do: NAVIGATE_APP
- attach to column: address
- prominence: Display_Inline
- condition: `NOT(ISBLANK([address]))`
- navigate: `CONCATENATE("#page=map&table=Homecarers&mapcolumn=address&row=", ENCODEURL([_THISROW]))`

### Add  [Homecarers]
- do: ADD_RECORD
- prominence: Display_Overlay

### Compose Email (Email)  [Volunteers]
- do: EMAIL
- attach to column: Email
- prominence: Display_Inline
- condition: `NOT(ISBLANK([Email]))`

### Call Phone (phone)  [Homecarers]
- do: CALL
- attach to column: phone
- prominence: Display_Inline
- condition: `NOT(ISBLANK([phone]))`

### Send SMS (phone)  [Homecarers]
- do: SMS
- attach to column: phone
- prominence: Display_Inline
- condition: `NOT(ISBLANK([phone]))`

### View Ref (homecarer_id)  [Homecare]
- do: NAVIGATE_APP
- attach to column: homecarer_id
- prominence: Display_Inline
- condition: `NOT(ISBLANK([homecarer_id]))`
- navigate: `CONCATENATE("#page=detail&table=Homecarers&row=", ENCODEURL([homecarer_id]) )`


## Automation — bots (verified in the AppSheet editor, 03/09/2026)

The HTML export omits bot internals; captured here directly from the Automation pane.
All 4 bots: event source = App, Bypass Security Filters = OFF, single process step, no notifications/emails.

| Bot | Event name | Table | Data change | Event condition | Step | Runs action | Net effect |
|---|---|---|---|---|---|---|---|
| **Start Walk Status Update** | New Walk Added | Walks | Adds | `AND(ISNOTBLANK([Dog_ID]), ISBLANK([Check In]))` | Run action on rows → `FILTER("Dogs",[Dog_ID]=[_THISROW].[Dog_ID])` | **Set Dog Status To Walking** (Status = `Walking`) | dog → Walking on checkout |
| **End Walk Status Update** | End Walk | Walks | Adds **+ Updates** | `ISNOTBLANK([Check In])` | Run action on rows → `FILTER("Dogs",[Dog_ID]=[_THISROW].[Dog_ID])` | **Set Dog Status To Available** (Status = `Available`) | dog → Available on check-in |
| **Start Homecare Status Update** | Update to Homecare table | Homecare | Adds | `ISBLANK([Homecare End])` | Run action on rows → Dogs, rows `LIST([Dog_ID])` | **Set Dog Homecare Status and Start Date** (Status = `=ANY(SELECT(Homecare[Homecare Type], AND([Dog_ID]=[_THISROW].[Dog_ID], ISBLANK([Homecare End]))))`) | dog → "Jail Break" or "Fostered" on checkout |
| **End Homecare Status Update** | Homecare ends | Homecare | Updates | `NOT(ISBLANK([Homecare End]))` | Run action on rows → Dogs, rows `LIST([Dog_ID])` (step is named "New step") | **End Homecare Status Update** (action; Status = `Available`) | dog → Available when Homecare End set |

Naming collision to watch in any rebuild: "End Homecare Status Update" is the name of a **bot**, a **Dogs action**, and the bot's step.

## Security (verified in the AppSheet editor, 03/09/2026)

- **Require user sign-in:** ON. Provider: **Google**.
- **Allow all signed-in users:** OFF → access is an explicit user allowlist (Security → Manage users).
- **Security Filters:** NONE. Every table (Dogs, Homecare, Homecarers, Site_Visits, Volunteers, Walks) = "access: as app creator, filter: none". No row-level security; all data read/written as the app owner. Access control is purely the sign-in allowlist.
- **Deployable:** No (prototype/free tier). Deploying with Require Sign-In needs a paid plan.

## Process / output pseudo-tables (automation bot internals — PARTIAL, verify in editor)

- Process for Start Walk Status Update - 1 Process Table
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/d3aa4f7a-ce95-417e-b5d8-0d12fa356eca/State Table
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Run Status Change Output
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/d3aa4f7a-ce95-417e-b5d8-0d12fa356eca/StepOutput_Run Status Change
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Process for End Walk Status Update - 1 Process Table
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/97b8af88-792b-45e5-bccd-0661f59fab1d/State Table
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Run Status Update to Available Output
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/97b8af88-792b-45e5-bccd-0661f59fab1d/StepOutput_Run Status Update to Available
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Process for Start Homecare Status Update Process Table
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/14e0266d-2ea5-476f-a7fc-f401f6abaf2e/State Table
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Run action on rows Output
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/14e0266d-2ea5-476f-a7fc-f401f6abaf2e/StepOutput_Run action on rows
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- Process for End Homecare Status Update - 1 Process Table
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/148c5090-561e-4bfd-9871-d08c48aa6da2/State Table
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber
- New step Output
  - Source Path: /ProcessStateTables/f87511a2-ee1a-4642-b0d5-d3975e68e964/148c5090-561e-4bfd-9871-d08c48aa6da2/StepOutput_New step
  - Are updates allowed?: READ_ONLY
  - Column Order List: _RowNumber

## Coverage status

- **Automation (bots):** ✅ captured from the editor — see the Automation section above.
- **Security filters / sign-in:** ✅ captured from the editor — see the Security section above (no filters; Google sign-in; allowlist).
- **Format Rules:** ✅ export says 0; consistent with the UX pane.
- **Columns / slices / actions / view sort-group-order:** ✅ fully in the export (lossless copy in the .json).
- **Still thin — spot-check if rebuilding:** per-view show/hide & detail-layout niceties, brand/theme, offline/sync options, localization, the actual user allowlist (Security → Manage users), column-level 'Sync' behaviour.
- **_Per User Settings** is an AppSheet system table (user options) — low value, listed for completeness.
