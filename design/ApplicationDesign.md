# Application Design File

## Assignment 4b: Frontend Implementation

Changes made to concepts:

TripPlanner Concept:
- Added search user action for adding participants
- Updated spec for fetch trip by user action so it retrieves trips the user is invited to as well as the trips they created themshelves

ItineraryPlanner Concept:
- Updated spec so that users can change their own budgets as well

Polling Concept:
- Relaxed the strict "only poll creator can add users" check in addUser so other authorized callers (trip owners, etc.) can add participants to polls

PasswordAuth Concept:
- Added action to allow fetching user information by id



## Assignment 4a: Backend Implementation

I didn't make any major changes to the overall application. The concepts and how they come together to create the entire application remains the same as before. Instead, most of the changes happened in the individual concepts.

## Interesting Moments

I had some interesting moments during this assignment that showed me that LLMs and creating test cases were good ways to catch bugs/ reveal places for improvement in my concepts and implementations:
 
1. In my original TripPlanner concept, I did not restrict it so that only the owner of trip can remove participants from the trip. I gave Context my concept and had it help me implement the actions. It implemented the actions that modify the list of participants by checking if the user doing this modification was the creator of the trip or not. I found that this was a good check to do, because I wouldn't want other random users being able to modify the trip like that. [Context's response found here](../context/design/concepts/TripPlanner/implementation.md/steps/response.b9cd9f31.md)
2. For the TripPlanner concept, its implementation also fixed an error I did not catch earlier, which was that the user who created the trip is not added to the list of participants. Context caught that and made it so that when a user creates a trip, the user is automatically added to the list of participants. [Context's response found here](../context/design/concepts/TripPlanner/implementation.md/steps/response.64b5eec0.md)
3. While I was coming up with test cases to use for the tests cases for ItineraryPlanner, I realized that the specs for a few actions was not strict enough. I allowed for the creators of itineraries to finalize an itinerary but failed to add guards for other actions that might mutate the itinerary. So even if the itinerary is finalized, it did not stop users from calling actions that can change it. I fixed this and asked Context to create the test cases for me. [Context's test cases found here](../context/design/concepts/ItineraryPlanner/testing.md/steps/response.a63f7086.md)
4. Another improvement that I realized during creating test cases was that I should be limiting some actions to owners only. For example, only owners should be able to modify the choices in the poll and the participants that can vote. I added the tests and revised my spec and implementation with the help of Context. [Context's updated implementation afterwards](../context/design/concepts/Polling/implementation.md/steps/file.22e40f36.md)
5. While implementing the CostSplitting concept, Context assumed that negatives would not be allowed as a monetary value. I had not specified this in my specs, but I found that this was an important thing to check for, so I had my action specs revised and have test cases created to check for this. [Context's response found here](../context/design/concepts/CostSplitting/implement.md/steps/response.c0fbb8c1.md)
6. For the TripPlanner concept, I wanted to add an action that would allow users to remove themselves from a trip. When I asked Context to help me with implementing it, it made a guard in the function that prevents the creator of the trip from removing themselves from the trip. This had slipped my mind, so it was good that it caught this. [Context's response found here](../context/design/concepts/TripPlanner/implementation.md/steps/response.64b5eec0.md) 
