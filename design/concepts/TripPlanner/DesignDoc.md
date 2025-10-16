Changes I made to the concept:
- Made sure that the create action created a trip that includes the creator user as a participant. The original spec did not add this, which would cause errors down the line, since it would assume the creator of the trip is not part of it.
- Updated the specs of remove/update trip to make it clearer that only the creator of the trip can do these actions.
- Updated the specs of add/remove partipants so that only the creator of the trip can do these actions.
- Added a new action to allow users to remove themselves from the trip (the user must not be the owner).
