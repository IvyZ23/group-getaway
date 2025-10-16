**concept** TripPlanner [User, Participant]

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

-   **requires** trip created user with same destination and date range not to already exist
-   **effects** creates new trip, with name, destination, date range, and the participant list set to have the creator

update(user: User, trip: Trip, destination: String, date: DateRange, name: String)

-   **requires** trip to exist and that the user is the creator of it
-   **effects** updates trip info

finalize(user: User, trip: Trip, finalize: Flag)

-   **requires** trip to exist and user is the creator of it
-   **effects** updates finalized flag of trip

delete(user: User, trip: Trip)

-   **requires** trip to exist and user is the creator of it
-   **effects** deletes trip

addParticipant(actingUser: User, user: User, trip: Trip)

-   **requires** user to not already exist in trip and the acting user to be the creator of the trip
-   **effects** adds user to trip

updateParticipant(actingUser: User, user: User, budget: Number, trip: Trip)

-   **requires** user to exist as a participant of trip and the acting user to be the creator of the trip
-   **effects** updates user info in trip

removeParticipant(actingUser: User, user: User, trip: Trip)

-   **requires** user to exist as a participant of trip and the acting user to be the creator of the trip
-   **effects** removes user from trip

removeSelf (user:User, trip: Trip)
-   **requires** user to exist as a participant of trip and the user to not be the creator
-   **effects** removes user from trip
