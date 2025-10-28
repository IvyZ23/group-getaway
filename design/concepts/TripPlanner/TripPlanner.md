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

create(owner: User, destination: String, dateRange: DateRange, name: String): { tripId }

- **requires** a trip for `owner` with the same destination and date range must not already exist
- **effects** creates a new trip, adds the owner as the initial participant (default budget 0), and returns the new `tripId`

update(owner: User, tripId: Trip, destination: String, dateRange: DateRange, name: String)

- **requires** trip to exist and caller (`owner`) must be the trip owner
- **effects** updates trip metadata (name, destination, dateRange)

finalize(owner: User, tripId: Trip, finalized: Flag)

- **requires** trip to exist and caller (`owner`) must be the trip owner
- **effects** sets the trip `finalized` flag

delete(owner: User, tripId: Trip)

- **requires** trip to exist and caller (`owner`) must be the trip owner
- **effects** deletes the trip and its associated concept data

addParticipant(owner: User, tripId: Trip, participantUser: User, budget?: Number)

- **requires** caller (`owner`) must be the trip owner; `participantUser` must not already be in the trip
- **effects** adds a participant with an optional `budget` (default 0)

updateParticipant(owner: User, tripId: Trip, participantUser: User, budget: Number)

- **requires** caller (`owner`) must be the trip owner; `participantUser` must exist as a participant
- **effects** updates the participant's budget

removeParticipant(owner: User, tripId: Trip, participantUser: User)

- **requires** caller (`owner`) must be the trip owner; `participantUser` must exist as a participant and must not be the owner
- **effects** removes the participant from the trip

removeSelf(user: User, tripId: Trip)

- **requires** user is a participant of the trip and is not the owner
- **effects** removes the caller from the trip's participants list

**queries**

_getTripById(tripId: Trip, owner?: User) -> TripState | null

- **effects** returns trip state by id; if `owner` provided, restricts to trips owned by that user

_getTripsByUser(owner: User) -> TripState[]

- **effects** returns trips where the user is either owner or a participant

_getParticipantsInTrip(tripId: Trip) -> Participant[]

- **effects** returns the participant list for the specified trip
