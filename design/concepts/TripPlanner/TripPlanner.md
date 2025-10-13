**concept** TripPlanner [User]

**purpose** keep details about a trip all in one place

**principle** a user creates a trip and keeps track of the destination and date the trip will take place. They can add and remove participants to the trip and keep track of the budget for each participant. The creator of the trip can finalize the trip once no more changes are needed or delete the trip
if it is no longer happening.

**state**

a set of Trips with

-   a name String
-   a finalized Flag
-   an owner User
-   a set of Pariticipants
-   a destination String
-   a dateRange DateRange

a set of Participants with

-   a user User
-   a budget Number

**action**

create(user:User, destination: String, dataRange: DataRange, name: String): Trip

-   **requires** trip under user with same destination and date range not to already exist
-   **effects** creates new trip

update(user: User, trip: Trip, destination: String, date: DateRange, name: String)

-   **requires** trip that belongs to user to exist
-   **effects** updates trip info

finalize(user: User, trip: Trip, finalize: Flag)

-   **requires** trip that belongs to user to exist
-   **effects** updates finalized flag of trip

delete(user: User, trip: Trip)

-   **requires** trip that belongs to user to exist
-   **effects** deletes trip

addParticipant(user: User, trip: Trip)

-   **requires** user to not already exist in trip
-   **effects** adds user to trip

updateParticipant(user: User, budget: Number, trip: Trip)

-   **requires** user to exist as a participant of trip
-   **effects** updates user info in trip

removeParticipant(user: User, trip: Trip)

-   **requires** user to exist as a participant of trip
-   **effects** removes user from trip

removeSelf (user:User, trip: Trip)
-   **requires** user to exist as a participant of trip
-   **effects** removes user from trip
